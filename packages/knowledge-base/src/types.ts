// ============================================================
// 知识库系统 - 核心类型定义
// ============================================================

// 知识库文件
export interface KnowledgeFile {
  id: string;
  path: string;
  filename: string;
  category: string;
  content: string;
  wordCount: number;
  indexed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 搜索选项
export interface SearchOptions {
  directories?: string[];      // 搜索目录范围
  limit?: number;              // 结果数量限制
  threshold?: number;          // 相似度阈值（向量检索用）
  useVector?: boolean;         // 是否使用向量检索
}

// 搜索结果
export interface SearchResult {
  filePath: string;
  filename: string;
  category: string;
  snippet: string;             // 摘要片段
  score: number;               // 相关度分数
  highlights?: string[];       // 高亮关键词
}

// 场景类型
export type CreationScenario =
  | '世界设定'
  | '卷纲生成'
  | '章纲生成'
  | '正文生成'
  | '人物塑造'
  | '伏笔设计'
  | '爽点设计'
  | 'AI去味'
  | '审核';

// 场景推荐配置
export interface ScenarioConfig {
  directories: string[];
  keywords: string[];
  priority?: number;
}

// 知识库统计
export interface KnowledgeStats {
  totalFiles: number;
  totalWords: number;
  categories: { name: string; count: number }[];
  indexedFiles: number;
  lastIndexed?: Date;
}

// 索引状态
export interface IndexStatus {
  status: 'idle' | 'indexing' | 'error';
  progress: number;
  totalFiles: number;
  processedFiles: number;
  error?: string;
}
