// ============================================================
// 知识库系统 - 核心接口定义
// ============================================================

import {
  KnowledgeFile,
  SearchOptions,
  SearchResult,
  CreationScenario,
  KnowledgeStats,
  IndexStatus
} from './types';

// 知识库抽象接口
export interface IKnowledgeBase {
  // 初始化知识库
  initialize(): Promise<void>;

  // 搜索知识库
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  // 按场景推荐知识库文件
  recommendByScenario(scenario: CreationScenario): Promise<KnowledgeFile[]>;

  // 读取文件内容
  readFile(filePath: string): Promise<string>;

  // 添加知识文件
  addFile(file: KnowledgeFile): Promise<void>;

  // 更新知识文件
  updateFile(filePath: string, content: string): Promise<void>;

  // 删除知识文件
  deleteFile(filePath: string): Promise<void>;

  // 获取文件列表
  listFiles(category?: string): Promise<KnowledgeFile[]>;

  // 刷新索引
  refreshIndex(): Promise<void>;

  // 获取索引状态
  getIndexStatus(): Promise<IndexStatus>;

  // 获取统计信息
  getStats(): Promise<KnowledgeStats>;

  // 关闭连接
  close(): Promise<void>;
}

// 知识库管理器接口
export interface IKnowledgeManager {
  // 扫描目录并建立索引
  scanAndIndex(basePath: string): Promise<void>;

  // 批量导入文件
  importFiles(files: { path: string; content: string }[]): Promise<void>;

  // 导出知识库
  exportKnowledge(): Promise<KnowledgeFile[]>;

  // 清空知识库
  clearAll(): Promise<void>;

  // 备份知识库
  backup(outputPath: string): Promise<void>;

  // 恢复知识库
  restore(inputPath: string): Promise<void>;
}
