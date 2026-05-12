// ============================================================
// 工作流引擎 - 核心类型定义
// ============================================================

// 工作流状态
export type WorkflowState =
  | 'pending'
  | 'planning'
  | 'planned'
  | 'writing'
  | 'written'
  | 'deep_reading'
  | 'deep_read_done'
  | 'deep_editing'
  | 'deep_edit_done'
  | 'auditing'
  | 'audit_done'
  | 'revising'
  | 'revised'
  | 're_auditing'
  | 'settling'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'blocked';

// 工作流类型
export type WorkflowType =
  | 'chapter_generation'    // 章节生成
  | 'outline_generation'    // 大纲生成
  | 'volume_generation'     // 卷纲生成
  | 'chapter_outline'       // 章纲生成
  | 'audit_only'            // 仅审核
  | 'revision_only';        // 仅修订

// 工作流模式
export type WorkflowMode =
  | 'quick'                 // 快速模式：Writer直接生成
  | 'standard'              // 标准模式：完整七步
  | 'strict';               // 严格模式：多次复审

// 工作流配置
export interface WorkflowConfig {
  type: WorkflowType;
  mode: WorkflowMode;
  skipDeepReader?: boolean;
  skipDeepEditor?: boolean;
  maxRevisionRounds: number;
  passScore: number;
  autoProceed: boolean;     // 是否自动进入下一步
  timeout: number;          // 单步骤超时（毫秒）
}

// 工作流运行实例
export interface WorkflowInstance {
  id: string;
  projectId: string;
  chapterId?: string;
  volumeId?: string;
  type: WorkflowType;
  mode: WorkflowMode;
  status: WorkflowState;
  currentStep: string;
  progress: number;         // 0-100
  config: WorkflowConfig;
  
  // 步骤历史
  stepHistory: StepRecord[];
  
  // 当前输入
  currentInput?: any;
  
  // 错误信息
  error?: string;
  
  // 运行结果
  result?: any;
  
  // 时间信息
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 步骤记录
export interface StepRecord {
  step: string;
  status: 'success' | 'failed' | 'skipped';
  input?: any;
  output?: any;
  duration: number;
  tokenUsage?: number;
  cost?: number;
  timestamp: Date;
}

// 工作流事件
export type WorkflowEvent =
  | { type: 'started'; instanceId: string }
  | { type: 'step_started'; instanceId: string; step: string }
  | { type: 'step_completed'; instanceId: string; step: string; output: any }
  | { type: 'step_failed'; instanceId: string; step: string; error: string }
  | { type: 'progress'; instanceId: string; progress: number }
  | { type: 'completed'; instanceId: string; result: any }
  | { type: 'failed'; instanceId: string; error: string }
  | { type: 'paused'; instanceId: string }
  | { type: 'resumed'; instanceId: string }
  | { type: 'blocked'; instanceId: string; reason: string };

// 事件监听器
export type WorkflowEventListener = (event: WorkflowEvent) => void;