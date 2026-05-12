// ============================================================
// 知识库系统 - 向量检索实现（Ollama嵌入）
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
import { scenarioRecommendation } from './config';

interface OllamaEmbedding {
  embedding: number[];
}

interface VectorRecord {
  id: string;
  path: string;
  filename: string;
  category: string;
  content: string;
  embedding: number[];
}

/**
 * 向量检索知识库
 * 使用Ollama进行文本嵌入
 */
export class VectorKnowledgeBase implements IKnowledgeBase {
  private ollamaUrl: string;
  private embeddingModel: string;
  private vectorStore: VectorRecord[] = [];
  private initialized = false;

  constructor(ollamaUrl: string = 'http://127.0.0.1:11434', embeddingModel: string = 'nomic-embed-text') {
    this.ollamaUrl = ollamaUrl;
    this.embeddingModel = embeddingModel;
  }

  async initialize(): Promise<void> {
    // 检查Ollama连接
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`);
      if (response.ok) {
        this.initialized = true;
        console.log('VectorKnowledgeBase initialized with Ollama');
      }
    } catch (error) {
      console.warn('Ollama not available, vector search will be limited');
    }
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.initialized || this.vectorStore.length === 0) {
      return [];
    }

    try {
      // 获取查询向量
      const queryEmbedding = await this.getEmbedding(query);
      if (!queryEmbedding) {
        return [];
      }

      // 计算相似度
      const results: { record: VectorRecord; score: number }[] = [];
      
      for (const record of this.vectorStore) {
        // 过滤目录
        if (options?.directories?.length) {
          const matches = options.directories.some(d => record.path.startsWith(d));
          if (!matches) continue;
        }

        const similarity = this.cosineSimilarity(queryEmbedding, record.embedding);
        if (similarity >= (options?.threshold || 0.5)) {
          results.push({ record, score: similarity });
        }
      }

      // 排序并返回
      results.sort((a, b) => b.score - a.score);
      const limit = options?.limit || 10;

      return results.slice(0, limit).map(r => ({
        filePath: r.record.path,
        filename: r.record.filename,
        category: r.record.category,
        snippet: r.record.content.slice(0, 300),
        score: Math.round(r.score * 100)
      }));
    } catch (error) {
      console.error('Vector search failed:', error);
      return [];
    }
  }

  async recommendByScenario(scenario: CreationScenario): Promise<KnowledgeFile[]> {
    const config = scenarioRecommendation[scenario];
    if (!config) return [];

    // 使用场景关键词进行向量搜索
    const query = config.keywords.join(' ');
    const results = await this.search(query, {
      directories: config.directories,
      limit: 5,
      threshold: 0.3
    });

    return results.map(r => ({
      id: r.filePath,
      path: r.filePath,
      filename: r.filename,
      category: r.category,
      content: r.snippet,
      wordCount: r.snippet.length,
      indexed: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  }

  async readFile(filePath: string): Promise<string> {
    const record = this.vectorStore.find(r => r.path === filePath);
    return record?.content || '';
  }

  async addFile(file: KnowledgeFile): Promise<void> {
    const embedding = await this.getEmbedding(file.content);
    if (embedding) {
      this.vectorStore.push({
        id: file.id,
        path: file.path,
        filename: file.filename,
        category: file.category,
        content: file.content,
        embedding
      });
    }
  }

  async updateFile(filePath: string, content: string): Promise<void> {
    const index = this.vectorStore.findIndex(r => r.path === filePath);
    if (index >= 0) {
      const embedding = await this.getEmbedding(content);
      if (embedding) {
        this.vectorStore[index].content = content;
        this.vectorStore[index].embedding = embedding;
      }
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    this.vectorStore = this.vectorStore.filter(r => r.path !== filePath);
  }

  async listFiles(category?: string): Promise<KnowledgeFile[]> {
    return this.vectorStore
      .filter(r => !category || r.category === category)
      .map(r => ({
        id: r.id,
        path: r.path,
        filename: r.filename,
        category: r.category,
        content: r.content,
        wordCount: r.content.length,
        indexed: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
  }

  async refreshIndex(): Promise<void> {
    // 重新计算所有向量
    for (const record of this.vectorStore) {
      const embedding = await this.getEmbedding(record.content);
      if (embedding) {
        record.embedding = embedding;
      }
    }
  }

  async getIndexStatus(): Promise<IndexStatus> {
    return {
      status: this.initialized ? 'idle' : 'error',
      progress: 100,
      totalFiles: this.vectorStore.length,
      processedFiles: this.vectorStore.length
    };
  }

  async getStats(): Promise<KnowledgeStats> {
    const categories: Record<string, number> = {};
    for (const record of this.vectorStore) {
      categories[record.category] = (categories[record.category] || 0) + 1;
    }

    return {
      totalFiles: this.vectorStore.length,
      totalWords: this.vectorStore.reduce((sum, r) => sum + r.content.length, 0),
      indexedFiles: this.vectorStore.length,
      categories: Object.entries(categories).map(([name, count]) => ({ name, count }))
    };
  }

  async close(): Promise<void> {
    this.vectorStore = [];
  }

  // ========== 私有方法 ==========

  /**
   * 获取文本嵌入向量
   */
  private async getEmbedding(text: string): Promise<number[] | null> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.embeddingModel,
          prompt: text.slice(0, 8000) // 限制长度
        })
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as OllamaEmbedding;
      return data.embedding;
    } catch (error) {
      return null;
    }
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}