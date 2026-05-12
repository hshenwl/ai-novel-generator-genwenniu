// ============================================================
// AI模型网关 - 增强版类型定义
// ============================================================

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'zhipu' | 'tongyi' | 'ollama' | 'custom' | 'flask';

// 聊天消息
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;  // 用于多角色场景
}

// 聊天输入
export interface ChatInput {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  stop?: string[];  // 停止词
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  // 元数据（用于统计）
  metadata?: {
    agentType?: string;      // Agent类型（Planner/Writer等）
    projectId?: string;      // 项目ID
    chapterId?: string;      // 章节ID
    workflowId?: string;     // 工作流ID
    step?: string;           // 步骤名称
  };
}

// 聊天结果
export interface ChatResult {
  id: string;               // 响应ID
  content: string;
  model: string;
  usage: TokenUsage;
  finishReason: string;
  duration: number;         // 耗时（毫秒）
  cost?: number;            // 成本（元）
}

// Token使用
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// 流式响应块
export interface ChatChunk {
  id: string;
  delta: string;
  finishReason?: string;
  usage?: Partial<TokenUsage>;
}

// 模型配置
export interface ModelConfig {
  id: string;               // 配置ID
  name: string;             // 显示名称
  provider: AIProvider;
  modelId: string;          // 模型ID（如gpt-4）
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  // 成本配置
  costPerToken?: {
    prompt: number;         // 每千Token成本
    completion: number;
  };
  // 限制配置
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  // 超时配置
  timeout?: number;         // 请求超时（毫秒）
  // 重试配置
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  };
}

// 模型能力描述
export interface ModelCapabilities {
  maxContextTokens: number;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsFunctionCall: boolean;
  supportsJSON: boolean;
  recommendedFor: string[];  // 推荐使用的场景
}

// 调用记录
export interface CallRecord {
  id: string;
  timestamp: Date;
  provider: string;
  model: string;
  input: {
    messages: ChatMessage[];
    metadata?: ChatInput['metadata'];
  };
  output: {
    content: string;
    usage: TokenUsage;
  };
  duration: number;
  cost: number;
  success: boolean;
  error?: string;
}

// 调用统计
export interface CallStats {
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  successRate: number;
  averageDuration: number;
  byAgent: Record<string, { calls: number; tokens: number; cost: number }>;
  byModel: Record<string, { calls: number; tokens: number; cost: number }>;
}

// AI模型提供商接口
export interface AIModelProvider {
  // 同步聊天
  chat(input: ChatInput): Promise<ChatResult>;

  // 流式聊天
  streamChat(input: ChatInput): AsyncIterable<ChatChunk>;

  // Token计数
  countTokens(text: string): Promise<number>;

  // 获取支持的模型列表
  getModels(): Promise<string[]>;

  // 获取模型能力
  getCapabilities(): ModelCapabilities;

  // 获取配置
  getConfig(): ModelConfig;

  // 测试连接
  testConnection(): Promise<boolean>;
}

// 错误类型
export type AIErrorType = 
  | 'network'           // 网络错误
  | 'timeout'           // 超时
  | 'rate_limit'        // 速率限制
  | 'quota_exceeded'    // 配额超限
  | 'invalid_request'   // 无效请求
  | 'invalid_response'  // 无效响应
  | 'model_error'       // 模型错误
  | 'all_failed'        // 所有模型都失败
  | 'unknown';          // 未知错误

// AI错误
export class AIError extends Error {
  type: AIErrorType;
  provider?: string;
  model?: string;
  retryable: boolean;
  retryAfter?: number;

  constructor(
    type: AIErrorType,
    message: string,
    options?: {
      provider?: string;
      model?: string;
      retryable?: boolean;
      retryAfter?: number;
    }
  ) {
    super(message);
    this.type = type;
    this.provider = options?.provider;
    this.model = options?.model;
    this.retryable = options?.retryable ?? false;
    this.retryAfter = options?.retryAfter;
    this.name = 'AIError';
  }
}
