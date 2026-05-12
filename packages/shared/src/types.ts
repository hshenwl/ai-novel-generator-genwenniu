// ============================================================
// AI小说创作系统 - 核心类型定义
// ============================================================

// ============================================================
// 基础类型
// ============================================================

export type ID = string;
export type Timestamp = Date | string;
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export interface JSONObject { [key: string]: JSONValue }
export interface JSONArray extends Array<JSONValue> {}

// ============================================================
// 配置类型
// ============================================================

export type AppMode = 'local' | 'cloud';
export type DatabaseDriver = 'sqlite' | 'postgres';
export type StorageDriver = 'local' | 's3' | 'cos' | 'oss' | 'minio';
export type QueueDriver = 'sqlite' | 'redis' | 'bullmq';
export type AuthMode = 'local' | 'jwt' | 'oauth';
export type KnowledgeRetrievalMode = 'fts' | 'vector' | 'hybrid';

export interface AppConfig {
  mode: AppMode;
  port: number;
  database: DatabaseConfig;
  storage: StorageConfig;
  queue: QueueConfig;
  auth: AuthConfig;
  knowledge: KnowledgeConfig;
}

export interface DatabaseConfig {
  driver: DatabaseDriver;
  sqlitePath?: string;
  postgresUrl?: string;
}

export interface StorageConfig {
  driver: StorageDriver;
  localStoragePath?: string;
  s3?: S3Config;
  cos?: COSConfig;
  oss?: OSSConfig;
}

export interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface COSConfig {
  region: string;
  bucket: string;
  secretId: string;
  secretKey: string;
}

export interface OSSConfig {
  region: string;
  bucket: string;
  accessKeyId: string;
  accessKeySecret: string;
}

export interface QueueConfig {
  driver: QueueDriver;
  redisUrl?: string;
  concurrency?: number;
}

export interface AuthConfig {
  mode: AuthMode;
  jwtSecret?: string;
  jwtExpiresIn?: string;
}

export interface KnowledgeConfig {
  retrievalMode: KnowledgeRetrievalMode;
  knowledgePath: string;
  ollamaBaseUrl?: string;
  embeddingModel?: string;
}

// ============================================================
// 用户与认证类型
// ============================================================

export interface User {
  id: ID;
  tenantId?: ID;
  username: string;
  email?: string;
  nickname?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp;
}

export type UserRole = 'user' | 'admin' | 'editor';
export type UserStatus = 'active' | 'inactive' | 'banned';

export interface AuthUser {
  id: ID;
  username: string;
  role: UserRole;
  tenantId?: ID;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  token?: string;
  user?: AuthUser;
  message?: string;
}

// ============================================================
// 项目类型
// ============================================================

export interface Project {
  id: ID;
  tenantId?: ID;
  userId: ID;
  name: string;
  genre?: NovelGenre;
  perspective?: NarrativePerspective;
  description?: string;
  targetWords: number;
  status: ProjectStatus;
  version: number;
  createdBy?: ID;
  updatedBy?: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp;
}

export type NovelGenre = 
  | '玄幻' | '都市' | '脑洞' | '修仙' | '科幻' 
  | '悬疑' | '言情' | '历史' | '末世' | '其他';

export type NarrativePerspective = '第一人称' | '第三人称';
export type ProjectStatus = 'active' | 'archived' | 'deleted';

// ============================================================
// 世界设定类型
// ============================================================

export interface WorldSetting {
  id: ID;
  projectId: ID;
  background?: string;
  rules?: string;
  powerSystem?: string;
  organizations?: string;
  conflict?: string;
  target?: string;
  taboos?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================
// 大纲类型
// ============================================================

export interface Outline {
  id: ID;
  projectId: ID;
  content: string;
  summary?: string;
  mainPlot?: string;
  coreConflict?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================
// 卷纲类型
// ============================================================

export interface Volume {
  id: ID;
  projectId: ID;
  orderIndex: number;
  title: string;
  description?: string;
  outline?: string;
  targetChapterCount: number;
  targetWordsPerChapter: number;
  status: VolumeStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type VolumeStatus = 'draft' | 'in_progress' | 'completed';

// ============================================================
// 章纲类型
// ============================================================

export interface ChapterOutline {
  id: ID;
  projectId: ID;
  volumeId: ID;
  chapterNo: number;
  title?: string;
  summary?: string;
  conflict?: string;
  openingHook?: string;
  endingHook?: string;
  inChapterHook?: string;
  coolPoints?: string;
  emotionalPoint?: string;
  foreshadows?: string;
  characters?: string;
  scenes?: string;
  auditFocus?: string;
  knowledgeRef?: string;
  continuity?: string;
  status: ChapterOutlineStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ChapterOutlineStatus = 'draft' | 'approved' | 'rejected';

// ============================================================
// 章节类型
// ============================================================

export interface Chapter {
  id: ID;
  projectId: ID;
  volumeId: ID;
  chapterOutlineId?: ID;
  chapterNo: number;
  title?: string;
  content: string;
  wordCount: number;
  version: number;
  status: ChapterStatus;
  auditScore?: number;
  publishedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ChapterStatus = 'draft' | 'reviewing' | 'published' | 'archived';

// ============================================================
// 角色类型
// ============================================================

export interface Character {
  id: ID;
  projectId: ID;
  name: string;
  role: CharacterRole;
  gender?: string;
  age?: string;
  organization?: string;
  profession?: string;
  appearance?: string;
  personality?: string;
  background?: string;
  goals?: string;
  fears?: string;
  characterVoice?: string;
  status: CharacterStatus;
  firstAppear?: number;
  lastAppear?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CharacterRole = '主角' | '配角' | '反派' | '导师' | '路人';
export type CharacterStatus = 'active' | 'injured' | 'dead' | 'missing';

// ============================================================
// 组织类型
// ============================================================

export interface Organization {
  id: ID;
  projectId: ID;
  name: string;
  type?: string;
  alignment?: string;
  description?: string;
  structure?: string;
  goals?: string;
  resources?: string;
  status: OrganizationStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type OrganizationStatus = 'active' | 'dissolved' | 'destroyed';

// ============================================================
// 伏笔类型
// ============================================================

export interface Foreshadow {
  id: ID;
  projectId: ID;
  name: string;
  type?: ForeshadowType;
  description?: string;
  plantedChapter?: number;
  expectedChapter?: number;
  resolvedChapter?: number;
  status: ForeshadowStatus;
  importance: ForeshadowImportance;
  relatedCharacters?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ForeshadowType = '身份' | '道具' | '秘密' | '能力' | '关系' | '世界观';
export type ForeshadowStatus = 'planted' | 'advanced' | 'resolved' | 'abandoned';
export type ForeshadowImportance = 'normal' | 'important' | 'critical';

// ============================================================
// Hook类型
// ============================================================

export interface Hook {
  id: ID;
  projectId: ID;
  chapterId?: ID;
  name: string;
  type: HookType;
  description?: string;
  strengthScore?: number;
  status: HookStatus;
  expectedResolve?: number;
  actualResolve?: number;
  relatedCharacters?: string;
  relatedForeshadow?: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type HookType = 
  | 'opening' | 'in_chapter' | 'ending' 
  | 'character' | 'item' | 'identity' 
  | 'conspiracy' | 'emotion' | 'cool_point';
export type HookStatus = 'new' | 'continued' | 'resolved' | 'expired';

// ============================================================
// 工作流类型
// ============================================================

export interface WorkflowRun {
  id: ID;
  projectId: ID;
  chapterId?: ID;
  type: WorkflowType;
  status: WorkflowStatus;
  currentStep?: WorkflowStep;
  mode: WorkflowMode;
  progress: number;
  error?: string;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type WorkflowType = 'chapter_generation' | 'outline_generation' | 'volume_generation' | 'audit';
export type WorkflowStatus = 
  | 'pending' | 'running' | 'completed' | 'failed' 
  | 'paused' | 'blocked';
export type WorkflowStep = 
  | 'planning' | 'planned' | 'writing' | 'written'
  | 'deep_reading' | 'deep_read_done'
  | 'deep_editing' | 'deep_edit_done'
  | 'auditing' | 'audit_done'
  | 'revising' | 'revised'
  | 'settling' | 'settled';
export type WorkflowMode = 'quick' | 'standard' | 'strict';

export interface WorkflowStepOutput {
  id: ID;
  workflowId: ID;
  stepName: string;
  inputSnapshot?: string;
  outputContent?: string;
  modelId?: string;
  ruleFiles?: string;
  knowledgeFiles?: string;
  tokenUsage?: number;
  cost?: number;
  duration?: number;
  status: StepOutputStatus;
  error?: string;
  createdAt: Timestamp;
}

export type StepOutputStatus = 'pending' | 'running' | 'completed' | 'failed';

// ============================================================
// 审核类型
// ============================================================

export interface AuditReport {
  id: ID;
  projectId: ID;
  chapterId: ID;
  workflowId?: ID;
  totalScore: number;
  dimensionScores: DimensionScore[];
  issues: AuditIssue[];
  suggestions: string[];
  passStatus: PassStatus;
  auditorModel?: string;
  createdAt: Timestamp;
}

export interface DimensionScore {
  dimension: AuditDimension;
  score: number;
  maxScore: number;
  comment?: string;
}

export type AuditDimension = 
  | 'chapter_outline_match' | 'continuity' | 'perspective_consistency'
  | 'character_consistency' | 'character_voice' | 'protagonist_empathy'
  | 'core_conflict' | 'emotion_curve' | 'cool_point_strength'
  | 'hook_strength' | 'foreshadow_management' | 'world_consistency'
  | 'pacing' | 'info_density' | 'dialogue_naturalness'
  | 'ai_trace' | 'style_consistency' | 'commercial_readability'
  | 'word_count' | 'risk_items';

export interface AuditIssue {
  dimension: AuditDimension;
  severity: 'minor' | 'major' | 'critical';
  location?: string;
  description: string;
  suggestion?: string;
}

export type PassStatus = 'pass' | 'minor_revise' | 'major_revise' | 'rewrite' | 'blocked';

// ============================================================
// 修订类型
// ============================================================

export interface RevisionRecord {
  id: ID;
  projectId: ID;
  chapterId: ID;
  workflowId?: ID;
  originalContent: string;
  revisedContent: string;
  aiDeFlavorModes: string[];
  revisionSummary?: string;
  beforeScore?: number;
  afterScore?: number;
  createdAt: Timestamp;
}

// ============================================================
// 模型配置类型
// ============================================================

export interface ModelConfig {
  id: ID;
  userId: ID;
  name: string;
  provider: AIProvider;
  modelId: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  isDefault: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AIProvider = 
  | 'openai' | 'anthropic' | 'google' | 'deepseek' 
  | 'zhipu' | 'tongyi' | 'ollama' | 'custom';

// ============================================================
// 任务类型
// ============================================================

export interface Task {
  id: ID;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  payload: JSONObject;
  result?: JSONObject;
  error?: string;
  retryCount: number;
  maxRetry: number;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type TaskType = 
  | 'chapter_generation' | 'volume_generation' | 'outline_generation'
  | 'knowledge_index' | 'export' | 'backup';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

// ============================================================
// AI网关类型
// ============================================================

export interface ChatInput {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  content: string;
  model: string;
  usage: TokenUsage;
  finishReason: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatChunk {
  delta: string;
  finishReason?: string;
}

// ============================================================
// 知识库类型
// ============================================================

export interface KnowledgeFile {
  id: ID;
  path: string;
  filename: string;
  category: KnowledgeCategory;
  content: string;
  wordCount: number;
  indexed: boolean;
  embedding?: number[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type KnowledgeCategory = 
  | 'tutorials' | 'techniques' | 'plots' | 'characters'
  | 'world' | 'scenes' | 'reference' | 'operations' | 'concepts' | 'case_studies';

export interface SearchResult {
  file: KnowledgeFile;
  score: number;
  highlights?: string[];
}

// ============================================================
// 导出类型
// ============================================================

export interface ExportOptions {
  format: 'txt' | 'docx' | 'json' | 'md';
  includeMetadata: boolean;
  includeOutline: boolean;
  includeCharacters: boolean;
  includeOrganizations: boolean;
  includeForeshadows: boolean;
  includeHooks: boolean;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  path: string;
  size: number;
  message?: string;
}
