import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class KnowledgeService implements OnModuleInit {
  private knowledgePath: string;
  private retrievalMode: 'fts' | 'vector' | 'hybrid';
  private ollamaBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.knowledgePath = path.resolve(this.config.get('KNOWLEDGE_PATH', '../knowledge'));
    this.retrievalMode = this.config.get('KNOWLEDGE_RETRIEVAL_MODE', 'fts');
    this.ollamaBaseUrl = this.config.get('OLLAMA_BASE_URL', 'http://127.0.0.1:11434');
  }

  async onModuleInit() {
    // 启动时扫描知识库目录
    await this.scanKnowledgeFiles();
  }

  getCategories() {
    return [
      { key: 'tutorials', name: '写作教程', description: '叙述、节奏、伏笔、心理等' },
      { key: 'techniques', name: '技法与大纲', description: '写作技法和大纲方法' },
      { key: 'plots', name: '剧情参考资料', description: '剧情案例和分析' },
      { key: 'characters', name: '人物描写素材', description: '人物描写素材' },
      { key: 'world', name: '世界观与设定', description: '世界观构建和设定' },
      { key: 'scenes', name: '场景写法', description: '场景描写技巧' },
      { key: 'reference', name: '阅读与拆解', description: '作品拆解和分析' },
      { key: 'operations', name: '运营与文案', description: '运营和文案技巧' },
      { key: 'concepts', name: '概念与指令', description: 'AI写作概念和指令' },
      { key: 'case_studies', name: '案例分析', description: '深度案例分析' },
    ];
  }

  async getFiles(category?: string) {
    const where: any = {};
    if (category) where.category = category;
    return this.prisma.knowledgeFile.findMany({
      where,
      orderBy: { filename: 'asc' },
      take: 100,
    });
  }

  async getFile(id: string) {
    const file = await this.prisma.knowledgeFile.findUnique({ where: { id } });
    if (!file) return null;
    return file;
  }

  /**
   * 搜索知识库（支持三种模式）
   * - fts: SQLite FTS5全文检索
   * - vector: Ollama向量检索
   * - hybrid: 混合模式
   */
  async search(query: string, mode?: 'fts' | 'vector' | 'hybrid', limit: number = 10) {
    const actualMode = mode || this.retrievalMode;

    if (actualMode === 'fts' || actualMode === 'hybrid') {
      return this.searchFTS(query, limit);
    }

    if (actualMode === 'vector') {
      return this.searchVector(query, limit);
    }

    return this.searchFTS(query, limit);
  }

  /**
   * FTS5全文检索（使用 FTS5 MATCH 替代 LIKE 全表扫描）
   */
  private async searchFTS(query: string, limit: number) {
    try {
      const hasFTS = await this.checkFTSTable();
      if (!hasFTS) {
        return this.searchFallback(query, limit);
      }

      // 清理特殊字符，保留中英文和数字
      const safeQuery = query.replace(/['"\\{}[\]()!@#$%^&*+=|/<>~`]+/g, ' ').trim();
      if (!safeQuery) return [];

      const safeLimit = Math.max(1, Math.min(100, limit));

      // 策略1：整句短语搜索
      let ftsResults: any[];
      try {
        ftsResults = await this.prisma.$queryRawUnsafe(`
          SELECT file_path, filename, category,
            snippet(knowledge_index, 3, '>>>', '<<<', '...', 30) as snippet,
            bm25(knowledge_index) as score
          FROM knowledge_index
          WHERE knowledge_index MATCH '${safeQuery}'
          ORDER BY bm25(knowledge_index)
          LIMIT ${safeLimit}
        `) as any[];
      } catch {
        // 策略2：分词后用 OR 搜索
        const orTokens = safeQuery.split(/\s+/).filter(t => t.length > 0).map(t => `'${t}'`).join(' OR ');
        if (!orTokens) return [];
        ftsResults = await this.prisma.$queryRawUnsafe(`
          SELECT file_path, filename, category,
            snippet(knowledge_index, 3, '>>>', '<<<', '...', 30) as snippet,
            bm25(knowledge_index) as score
          FROM knowledge_index
          WHERE knowledge_index MATCH ${orTokens}
          ORDER BY bm25(knowledge_index)
          LIMIT ${safeLimit}
        `) as any[];
      }

      if (ftsResults.length === 0) return [];

      // 批量反查 knowledge_files 获取 id 和绝对路径（消除 N+1）
      const filenames = [...new Set(ftsResults.map(r => r.filename))];
      const kfRecords = await this.prisma.knowledgeFile.findMany({
        where: { filename: { in: filenames } },
        select: { id: true, filename: true, path: true, wordCount: true, category: true },
        take: safeLimit,
      });
      const kfMap = new Map(kfRecords.map(kf => [`${kf.filename}|${kf.category}`, kf]));

      return ftsResults.map((r: any) => {
        const kf = kfMap.get(`${r.filename}|${r.category}`);
        return {
          file: {
            id: kf?.id || '',
            path: kf?.path || r.file_path,
            filename: r.filename,
            category: r.category,
            wordCount: kf?.wordCount || 0,
          },
          score: Math.abs(r.score || 1),
          highlights: this.extractHighlights(r.snippet || '', query),
        };
      });
    } catch (e) {
      console.warn('[KnowledgeService] FTS search failed:', (e as Error).message);
      return this.searchFallback(query, limit);
    }
  }

  /**
   * 降级搜索（LIKE）— 当 FTS5 不可用时使用
   */
  private async searchFallback(query: string, limit: number) {
    const safeQuery = query.replace(/[%_]/g, '\\$&');
    const results = await this.prisma.$queryRawUnsafe(`
      SELECT id, path, filename, category, word_count,
             substr(content, 1, 300) as snippet, 1.0 as score
      FROM knowledge_files WHERE content LIKE ? ORDER BY word_count DESC LIMIT ?
    `, `%${safeQuery}%`, limit);

    return (results as any[]).map((r: any) => ({
      file: { id: r.id, path: r.path, filename: r.filename, category: r.category, wordCount: r.word_count },
      score: r.score || 1,
      highlights: this.extractHighlights(r.snippet || '', query),
    }));
  }

  /**
   * 检查 FTS5 虚拟表是否存在
   */
  private async checkFTSTable(): Promise<boolean> {
    try {
      const rows = await this.prisma.$queryRawUnsafe(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='knowledge_index'`
      );
      return (rows as any[]).length > 0;
    } catch { return false; }
  }

  /**
   * Ollama向量检索
   */
  private async searchVector(query: string, limit: number) {
    // 1. 获取查询文本的嵌入向量
    const embedding = await this.getEmbedding(query);

    // 2. 在数据库中查找相似向量
    const files = await this.prisma.knowledgeFile.findMany({
      where: { indexed: true, embedding: { not: null } },
      take: 200,
    });

    // 3. 计算相似度并排序
    const results = files
      .map((file) => {
        const fileEmbedding = this.parseEmbedding(file.embedding || '[]');
        const score = this.cosineSimilarity(embedding, fileEmbedding);
        return { file, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  /**
   * 获取文本嵌入向量（通过Ollama）
   */
  private async getEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nomic-embed-text', // 常用的嵌入模型
          prompt: text,
        }),
      });

      const data = await response.json() as any;
      return data.embedding || [];
    } catch (error) {
      // Ollama不可用时，降级到FTS
      console.warn('Ollama不可用，降级到FTS检索');
      return [];
    }
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * 解析嵌入向量JSON
   */
  private parseEmbedding(json: string): number[] {
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  }

  /**
   * 提取匹配文本的高亮片段
   */
  private extractHighlights(content: string, query: string): string[] {
    const highlights: string[] = [];
    const regex = new RegExp(query, 'gi');
    const matches = content.matchAll(regex);
    for (const match of matches) {
      const start = Math.max(0, match.index - 50);
      const end = Math.min(content.length, match.index + match[0].length + 50);
      highlights.push(content.slice(start, end));
    }
    return highlights.slice(0, 3);
  }

  /**
   * 扫描知识库文件并入库（批量优化版 — 消除 N+1 查询）
   */
  async scanKnowledgeFiles() {
    const categories = this.getCategories().map(c => c.key);

    // 一次性加载所有已有记录到 Map（消除 N+1）
    const allExisting = await this.prisma.knowledgeFile.findMany({
      select: { id: true, path: true },
    });
    const existingMap = new Map(allExisting.map(f => [f.path, f.id]));

    // 批量清理孤立记录
    const orphanIds: string[] = [];
    for (const [filePath, id] of existingMap) {
      if (!fs.existsSync(filePath)) {
        orphanIds.push(id);
        existingMap.delete(filePath);
      }
    }
    if (orphanIds.length > 0) {
      await this.prisma.knowledgeFile.deleteMany({ where: { id: { in: orphanIds } } });
      console.log(`[Knowledge] Cleaned ${orphanIds.length} orphan records`);
    }

    // 扫描文件系统，收集需要新增/更新的数据
    const toCreate: any[] = [];
    const toUpdate: { id: string; content: string; wordCount: number; category: string }[] = [];

    for (const category of categories) {
      const categoryPath = path.join(this.knowledgePath, category);
      if (!fs.existsSync(categoryPath)) continue;

      const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.md'));
      for (const filename of files) {
        const filePath = path.join(categoryPath, filename);
        const content = fs.readFileSync(filePath, 'utf-8');
        const wordCount = content.replace(/\s+/g, '').length;

        const existingId = existingMap.get(filePath);
        if (existingId) {
          toUpdate.push({ id: existingId, content, wordCount, category });
        } else {
          toCreate.push({ path: filePath, filename, category, content, wordCount, indexed: false });
        }
      }
    }

    // 批量新增
    if (toCreate.length > 0) {
      await this.prisma.knowledgeFile.createMany({ data: toCreate });
    }

    // 批量更新（逐条，因为 Prisma 不支持批量 updateMany 不同值）
    // 使用事务包裹减少开销
    if (toUpdate.length > 0) {
      await this.prisma.$transaction(
        toUpdate.map(u => this.prisma.knowledgeFile.update({
          where: { id: u.id },
          data: { content: u.content, wordCount: u.wordCount, category: u.category },
        }))
      );
    }

    const total = toCreate.length + toUpdate.length;
    if (total > 0) {
      console.log(`[Knowledge] Scanned: ${toCreate.length} new, ${toUpdate.length} updated, ${orphanIds.length} cleaned`);
    }
    return { indexed: total };
  }

  /**
   * 索引知识库文件（生成向量嵌入）
   */
  async indexFiles(category?: string, force: boolean = false) {
    const where: any = {};
    if (category) where.category = category;
    if (!force) where.indexed = false;

    const files = await this.prisma.knowledgeFile.findMany({ where, take: 200 });
    let indexedCount = 0;

    for (const file of files) {
      try {
        if (this.retrievalMode === 'vector' || force) {
          // 生成向量嵌入
          const embedding = await this.getEmbedding(file.content.slice(0, 1000)); // 截取前1000字
          
          await this.prisma.knowledgeFile.update({
            where: { id: file.id },
            data: {
              indexed: true,
              embedding: JSON.stringify(embedding),
            },
          });
        } else {
          // FTS模式直接标记为已索引
          await this.prisma.knowledgeFile.update({
            where: { id: file.id },
            data: { indexed: true },
          });
        }
        indexedCount++;
      } catch (e) {
        console.warn(`索引文件失败: ${file.filename}`, e);
        // 即使某个文件失败也继续
        await this.prisma.knowledgeFile.update({
          where: { id: file.id },
          data: { indexed: true },
        });
        indexedCount++;
      }
    }

    return { indexed: indexedCount, total: files.length };
  }

  /**
   * 获取知识库统计信息
   */
  async getStats() {
    const total = await this.prisma.knowledgeFile.count();
    const indexed = await this.prisma.knowledgeFile.count({ where: { indexed: true } });
    const categories = await this.prisma.knowledgeFile.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    return {
      totalFiles: total,
      indexedFiles: indexed,
      categories: categories.map(c => ({
        category: c.category,
        count: c._count.id,
      })),
      retrievalMode: this.retrievalMode,
    };
  }
}