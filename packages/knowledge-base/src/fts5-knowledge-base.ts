// ============================================================
// 知识库系统 - FTS5全文检索实现（本地模式）
// 通过 DatabaseProvider 抽象接口，兼容多种 SQLite 后端
// ============================================================

import {
  KnowledgeFile,
  SearchOptions,
  SearchResult,
  CreationScenario,
  KnowledgeStats,
  IndexStatus
} from './types';
import { IKnowledgeBase } from './interfaces';
import { DatabaseProvider, DbRow } from './database-provider';
import { scenarioRecommendation, knowledgeCategories } from './config';
import * as fs from 'fs';
import * as path from 'path';

export class FTS5KnowledgeBase implements IKnowledgeBase {
  private db: DatabaseProvider;
  private knowledgePath: string;
  private indexStatus: IndexStatus = { status: 'idle', progress: 0, totalFiles: 0, processedFiles: 0 };

  constructor(db: DatabaseProvider, knowledgePath: string) {
    this.db = db;
    this.knowledgePath = knowledgePath;
  }

  async initialize(): Promise<void> {
    // 创建知识库文件表
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_files (
        id TEXT PRIMARY KEY,
        path TEXT UNIQUE NOT NULL,
        filename TEXT NOT NULL,
        category TEXT NOT NULL,
        content TEXT,
        word_count INTEGER DEFAULT 0,
        indexed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 创建FTS5全文索引虚拟表
    await this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_index 
      USING fts5(
        file_path,
        filename,
        category,
        content,
        tokenize='unicode61'
      );
    `);

    // 创建分类索引
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_category 
      ON knowledge_files(category);
    `);

    // 扫描并索引知识库
    await this.scanAndIndex();
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const directories = options?.directories || [];
    const limit = options?.limit || 10;

    const sanitized = this.sanitizeQuery(query);
    if (!sanitized) return [];

    // 构建FTS5搜索查询
    let sql = `
      SELECT 
        ki.file_path as filePath,
        ki.filename,
        ki.category,
        snippet(ki, 3, '>>>', '<<<', '...', 20) as snippet
      FROM knowledge_index ki
      WHERE knowledge_index MATCH ?
    `;

    const params: unknown[] = [sanitized];

    // 添加目录过滤
    if (directories.length > 0) {
      sql += ` AND (${directories.map(() => 'ki.file_path LIKE ?').join(' OR ')})`;
      params.push(...directories.map(d => `${d}%`));
    }

    sql += ` ORDER BY bm25(ki) LIMIT ?`;
    params.push(limit);

    const rows = await this.db.all<SearchResult>(sql, ...params);
    
    // bm25 返回负数，归一化为正数
    return rows.map(r => ({
      ...r,
      score: this.normalizeScore((r as any).score || -50),
      highlights: this.extractHighlights(r.snippet || '')
    }));
  }

  async recommendByScenario(scenario: CreationScenario): Promise<KnowledgeFile[]> {
    const config = scenarioRecommendation[scenario];
    if (!config) return [];

    const files: KnowledgeFile[] = [];
    const seen = new Set<string>();

    for (const dir of config.directories) {
      const results = await this.db.all<KnowledgeFile>(`
        SELECT id, path, filename, category, content, word_count as wordCount, indexed, created_at as createdAt, updated_at as updatedAt
        FROM knowledge_files
        WHERE path LIKE ?
        ORDER BY word_count DESC
        LIMIT 5
      `, `${dir}%`);

      for (const file of results) {
        if (!seen.has(file.path)) {
          seen.add(file.path);
          files.push(file);
        }
      }
    }

    return files;
  }

  async readFile(filePath: string): Promise<string> {
    // 首先尝试从数据库读取
    const record = await this.db.get<{ content: string }>(`
      SELECT content FROM knowledge_files WHERE path = ?
    `, filePath);

    if (record?.content) {
      return record.content;
    }

    // 如果数据库中没有，从文件系统读取
    const fullPath = path.join(this.knowledgePath, filePath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf-8');
    }

    throw new Error(`Knowledge file not found: ${filePath}`);
  }

  async addFile(file: KnowledgeFile): Promise<void> {
    await this.db.run(`
      INSERT OR REPLACE INTO knowledge_files 
      (id, path, filename, category, content, word_count, indexed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      file.id,
      file.path,
      file.filename,
      file.category,
      file.content,
      file.wordCount,
      file.indexed ? 1 : 0,
      file.createdAt instanceof Date ? file.createdAt.toISOString() : file.createdAt,
      file.updatedAt instanceof Date ? file.updatedAt.toISOString() : file.updatedAt
    );

    // 更新FTS索引
    await this.db.run(`
      INSERT OR REPLACE INTO knowledge_index (file_path, filename, category, content)
      VALUES (?, ?, ?, ?)
    `, file.path, file.filename, file.category, file.content);

    // 标记为已索引
    await this.db.run(`
      UPDATE knowledge_files SET indexed = 1 WHERE id = ?
    `, file.id);
  }

  async updateFile(filePath: string, content: string): Promise<void> {
    const wordCount = this.countWords(content);
    const now = new Date().toISOString();

    await this.db.run(`
      UPDATE knowledge_files 
      SET content = ?, word_count = ?, updated_at = ?, indexed = 0
      WHERE path = ?
    `, content, wordCount, now, filePath);

    // 更新FTS索引
    const file = await this.db.get<{ filename: string; category: string }>(`
      SELECT filename, category FROM knowledge_files WHERE path = ?
    `, filePath);

    if (file) {
      await this.db.run(`
        INSERT OR REPLACE INTO knowledge_index (file_path, filename, category, content)
        VALUES (?, ?, ?, ?)
      `, filePath, file.filename, file.category, content);

      await this.db.run(`
        UPDATE knowledge_files SET indexed = 1 WHERE path = ?
      `, filePath);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    await this.db.run(`DELETE FROM knowledge_index WHERE file_path = ?`, filePath);
    await this.db.run(`DELETE FROM knowledge_files WHERE path = ?`, filePath);
  }

  async listFiles(category?: string): Promise<KnowledgeFile[]> {
    let sql = `
      SELECT id, path, filename, category, content, word_count as wordCount, indexed, created_at as createdAt, updated_at as updatedAt
      FROM knowledge_files
    `;
    const params: string[] = [];

    if (category) {
      sql += ` WHERE category = ?`;
      params.push(category);
    }

    sql += ` ORDER BY category, filename`;

    return this.db.all<KnowledgeFile>(sql, ...params);
  }

  async refreshIndex(): Promise<void> {
    await this.scanAndIndex();
  }

  async getIndexStatus(): Promise<IndexStatus> {
    return this.indexStatus;
  }

  async getStats(): Promise<KnowledgeStats> {
    const stats = await this.db.get<{ totalFiles: number; totalWords: number; indexedFiles: number }>(`
      SELECT 
        COUNT(*) as totalFiles,
        COALESCE(SUM(word_count), 0) as totalWords,
        COALESCE(SUM(CASE WHEN indexed = 1 THEN 1 ELSE 0 END), 0) as indexedFiles
      FROM knowledge_files
    `);

    const categories = await this.db.all<{ name: string; count: number }>(`
      SELECT category as name, COUNT(*) as count
      FROM knowledge_files
      GROUP BY category
      ORDER BY count DESC
    `);

    return {
      totalFiles: Number(stats?.totalFiles || 0),
      totalWords: Number(stats?.totalWords || 0),
      indexedFiles: Number(stats?.indexedFiles || 0),
      categories
    };
  }

  async close(): Promise<void> {
    // 连接由外部管理
  }

  // ========== 私有方法 ==========

  private async scanAndIndex(): Promise<void> {
    if (!fs.existsSync(this.knowledgePath)) {
      console.warn(`Knowledge path does not exist: ${this.knowledgePath}`);
      return;
    }

    const files = this.getAllMarkdownFiles(this.knowledgePath);
    this.indexStatus = { status: 'indexing', progress: 0, totalFiles: files.length, processedFiles: 0 };

    let processed = 0;
    for (const file of files) {
      try {
        const relativePath = path.relative(this.knowledgePath, file).replace(/\\/g, '/');
        const content = fs.readFileSync(file, 'utf-8');
        const filename = path.basename(file);
        const category = this.detectCategory(relativePath);

        const knowledgeFile: KnowledgeFile = {
          id: this.generateId(relativePath),
          path: relativePath,
          filename,
          category,
          content,
          wordCount: this.countWords(content),
          indexed: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await this.addFile(knowledgeFile);

        processed++;
        this.indexStatus.processedFiles = processed;
        this.indexStatus.progress = (processed / files.length) * 100;
      } catch (error) {
        console.error(`Failed to index file: ${file}`, error);
      }
    }

    this.indexStatus.status = 'idle';
  }

  private getAllMarkdownFiles(dir: string): string[] {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...this.getAllMarkdownFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  private detectCategory(filePath: string): string {
    const parts = filePath.split('/');
    const categoryMap: Record<string, string> = {
      'concepts': 'concepts',
      'entities': 'entities',
      'case_studies': 'case_studies',
      'case-studies': 'case_studies',
      'templates': 'templates',
      'rules': 'rules',
      'techniques': 'techniques',
      'genres': 'genres',
      'worldbuilding': 'worldbuilding',
      'characters': 'characters',
      'plot': 'plot',
      'style': 'style',
      'marketing': 'marketing',
      'platforms': 'platforms',
    };
    for (const part of parts) {
      const lower = part.toLowerCase().replace(/\s+/g, '_');
      if (categoryMap[lower]) return categoryMap[lower];
    }
    if (parts.length > 1) {
      return parts[0].toLowerCase().replace(/\s+/g, '_');
    }
    return 'other';
  }

  private countWords(content: string): number {
    const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (content.match(/[a-zA-Z]+/g) || []).length;
    return chineseChars + englishWords;
  }

  private generateId(filePath: string): string {
    return `kb_${filePath.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}`;
  }

  private sanitizeQuery(query: string): string {
    return query
      .replace(/['"]/g, '')
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
      .trim();
  }

  private normalizeScore(score: number): number {
    const normalized = Math.max(0, Math.min(100, 100 + (score || 0)));
    return Math.round(normalized * 10) / 10;
  }

  private extractHighlights(snippet: string): string[] {
    const matches = snippet.match(/>>>(.+?)<<</g) || [];
    return matches.map(m => m.replace(/>>>|<<</g, ''));
  }
}
