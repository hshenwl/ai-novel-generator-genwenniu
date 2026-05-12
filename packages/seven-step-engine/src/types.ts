// ============================================================
// 七步创作引擎 - 核心类型定义
// ============================================================

// 工作流步骤
export type WorkflowStep = 
  | 'planning' | 'planned' 
  | 'writing' | 'written'
  | 'deep_reading' | 'deep_read_done'
  | 'deep_editing' | 'deep_edit_done'
  | 'auditing' | 'audit_done'
  | 'revising' | 'revised'
  | 'settling' | 'settled';

// 审核结果
export type AuditResult = 'pass' | 'minor_revise' | 'major_revise' | 'rewrite' | 'blocked';

// 工作流模式
export type WorkflowMode = 'quick' | 'standard' | 'strict';

// 创作上下文
export interface CreationContext {
  projectId: string;
  volumeId?: string;
  chapterId?: string;
  
  // 项目信息
  projectName: string;
  genre: string;
  perspective: string;
  
  // 设定
  worldSetting?: string;
  outline?: string;
  volumeOutline?: string;
  chapterOutline?: string;
  
  // 角色和资产
  characters: CharacterInfo[];
  organizations: OrganizationInfo[];
  foreshadows: ForeshadowInfo[];
  hooks: HookInfo[];
  
  // 写作风格
  writingStyle?: string;
  
  // 上下文
  previousChapterSummary?: string;
  nextChapterOutline?: string;
  
  // 知识库引用
  knowledgeContext?: string;
  
  // 用户要求
  userRequirements?: string;
}

// 角色信息
export interface CharacterInfo {
  id: string;
  name: string;
  role: string;
  description?: string;
  characterVoice?: string;
  status: string;
}

// 组织信息
export interface OrganizationInfo {
  id: string;
  name: string;
  type?: string;
  description?: string;
}

// 伏笔信息
export interface ForeshadowInfo {
  id: string;
  name: string;
  type: string;
  status: string;
  plantedChapter?: number;
  expectedChapter?: number;
}

// Hook信息
export interface HookInfo {
  id: string;
  name: string;
  type: string;
  status: string;
  strengthScore?: number;
}

// Agent输入输出
export interface AgentInput {
  context: CreationContext;
  step: WorkflowStep;
  previousOutput?: string;
  feedback?: string[];
}

export interface AgentOutput {
  success: boolean;
  content: string;
  metadata?: Record<string, any>;
  issues?: string[];
  suggestions?: string[];
  nextStep?: WorkflowStep;
}

// 约束清单（Planner输出）
export interface ConstraintChecklist {
  taskGoal: string;
  currentPosition: string;
  mustConnect: string[];
  chapterFunction: string[];
  characterStatus: string;
  coreConflict: string;
  coolPoints: string[];
  emotionProgress: string[];
  hookDesign: string[];
  foreshadowManagement: string[];
  worldConstraints: string[];
  knowledgeReferences: string[];
  prohibitions: string[];
  outputFormat: string;
  qualityChecklist: string[];
}

// 审核报告
export interface AuditReport {
  totalScore: number;
  dimensionScores: DimensionScore[];
  issues: AuditIssue[];
  suggestions: string[];
  result: AuditResult;
}

export interface DimensionScore {
  dimension: string;
  score: number;
  maxScore: number;
  comment?: string;
}

export interface AuditIssue {
  dimension: string;
  severity: 'minor' | 'major' | 'critical';
  location?: string;
  description: string;
  suggestion?: string;
}