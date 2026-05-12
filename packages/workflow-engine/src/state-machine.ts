// ============================================================
// 工作流引擎 - 状态机
// ============================================================

import { WorkflowState, WorkflowMode } from './types';

// 状态转换规则
interface StateTransition {
  from: WorkflowState;
  to: WorkflowState;
  condition?: (context: any) => boolean;
  action?: string;
}

// 定义状态转换图
const stateTransitions: StateTransition[] = [
  // 初始化
  { from: 'pending', to: 'planning', action: 'start_planning' },
  
  // 规划阶段
  { from: 'planning', to: 'planned', action: 'planning_complete' },
  { from: 'planning', to: 'failed', action: 'planning_failed' },
  
  // 写作阶段
  { from: 'planned', to: 'writing', action: 'start_writing' },
  { from: 'writing', to: 'written', action: 'writing_complete' },
  { from: 'writing', to: 'failed', action: 'writing_failed' },
  
  // 深度读者阶段
  { from: 'written', to: 'deep_reading', action: 'start_reading' },
  { from: 'deep_reading', to: 'deep_read_done', action: 'reading_complete' },
  
  // 深度编辑阶段
  { from: 'deep_read_done', to: 'deep_editing', action: 'start_editing' },
  { from: 'deep_editing', to: 'deep_edit_done', action: 'editing_complete' },
  
  // 审核阶段
  { from: 'deep_edit_done', to: 'auditing', action: 'start_auditing' },
  { from: 'auditing', to: 'audit_done', action: 'auditing_complete' },
  
  // 根据审核结果的分支
  { from: 'audit_done', to: 'settling', condition: (c) => c.auditResult === 'pass', action: 'audit_passed' },
  { from: 'audit_done', to: 'revising', condition: (c) => ['minor_revise', 'major_revise'].includes(c.auditResult), action: 'needs_revision' },
  { from: 'audit_done', to: 'writing', condition: (c) => c.auditResult === 'rewrite', action: 'needs_rewrite' },
  { from: 'audit_done', to: 'planning', condition: (c) => c.auditResult === 'blocked', action: 'blocked' },
  
  // 修订阶段
  { from: 'revising', to: 'revised', action: 'revision_complete' },
  { from: 'revised', to: 're_auditing', action: 'start_re_audit' },
  { from: 're_auditing', to: 'settling', condition: (c) => c.auditResult === 'pass', action: 're_audit_passed' },
  { from: 're_auditing', to: 'revising', condition: (c) => c.revisionRounds < c.maxRevisions, action: 'needs_more_revision' },
  { from: 're_auditing', to: 'failed', condition: (c) => c.revisionRounds >= c.maxRevisions, action: 'max_revisions_exceeded' },
  
  // 完成阶段
  { from: 'settling', to: 'completed', action: 'settling_complete' },
  { from: 'settling', to: 'failed', action: 'settling_failed' },
  
  // 暂停/恢复
  { from: 'planning', to: 'paused', action: 'pause' },
  { from: 'writing', to: 'paused', action: 'pause' },
  { from: 'auditing', to: 'paused', action: 'pause' },
  { from: 'revising', to: 'paused', action: 'pause' },
  { from: 'paused', to: 'pending', action: 'resume' }
];

/**
 * 工作流状态机
 */
export class WorkflowStateMachine {
  private currentState: WorkflowState;
  private context: any;
  private history: { state: WorkflowState; timestamp: Date }[] = [];

  constructor(initialState: WorkflowState = 'pending', context: any = {}) {
    this.currentState = initialState;
    this.context = context;
    this.recordState(initialState);
  }

  /**
   * 获取当前状态
   */
  getState(): WorkflowState {
    return this.currentState;
  }

  /**
   * 获取上下文
   */
  getContext(): any {
    return this.context;
  }

  /**
   * 更新上下文
   */
  updateContext(updates: any): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * 获取下一个状态
   */
  getNextState(action: string, context?: any): WorkflowState | null {
    if (context) {
      this.updateContext(context);
    }

    // 查找匹配 from+action 的所有转换
    const candidates = stateTransitions.filter(
      t => t.from === this.currentState && t.action === action
    );

    if (candidates.length === 0) {
      return null;
    }

    // 找到第一个条件满足的转换
    for (const transition of candidates) {
      if (!transition.condition || transition.condition(this.context)) {
        return transition.to;
      }
    }

    // 所有候选都不满足条件
    return null;
  }

  /**
   * 执行状态转换
   */
  transition(action: string, context?: any): { success: boolean; newState?: WorkflowState; error?: string } {
    const nextState = this.getNextState(action, context);

    if (!nextState) {
      return {
        success: false,
        error: `Invalid transition from ${this.currentState} with action ${action}`
      };
    }

    this.currentState = nextState;
    this.recordState(nextState);
    return { success: true, newState: nextState };
  }

  /**
   * 获取可执行的动作
   */
  getAvailableActions(): string[] {
    return stateTransitions
      .filter(t => t.from === this.currentState)
      .filter(t => !t.condition || t.condition(this.context))
      .map(t => t.action!);
  }

  /**
   * 获取状态历史
   */
  getHistory(): { state: WorkflowState; timestamp: Date }[] {
    return [...this.history];
  }

  /**
   * 检查是否为终态
   */
  isTerminal(): boolean {
    return ['completed', 'failed', 'paused', 'blocked'].includes(this.currentState);
  }

  /**
   * 获取进度百分比
   */
  getProgress(): number {
    const progressMap: Partial<Record<WorkflowState, number>> = {
      'pending': 0,
      'planning': 5,
      'planned': 10,
      'writing': 20,
      'written': 35,
      'deep_reading': 45,
      'deep_read_done': 50,
      'deep_editing': 55,
      'deep_edit_done': 60,
      'auditing': 70,
      'audit_done': 80,
      'revising': 85,
      'revised': 90,
      're_auditing': 92,
      'settling': 95,
      'completed': 100,
      'failed': 100,
      'paused': -1,
      'blocked': 100
    };

    return progressMap[this.currentState] ?? 0;
  }

  /**
   * 记录状态变化
   */
  private recordState(state: WorkflowState): void {
    this.history.push({ state, timestamp: new Date() });
  }
}

/**
 * 获取工作流默认配置
 */
export function getDefaultConfig(mode: WorkflowMode, type: string = 'chapter_generation'): any {
  switch (mode) {
    case 'quick':
      return {
        skipDeepReader: true,
        skipDeepEditor: true,
        maxRevisionRounds: 1,
        passScore: 70,
        autoProceed: true,
        timeout: 120000
      };
    case 'strict':
      return {
        skipDeepReader: false,
        skipDeepEditor: false,
        maxRevisionRounds: 3,
        passScore: 85,
        autoProceed: false,
        timeout: 180000
      };
    case 'standard':
    default:
      return {
        skipDeepReader: false,
        skipDeepEditor: false,
        maxRevisionRounds: 2,
        passScore: 80,
        autoProceed: true,
        timeout: 150000
      };
  }
}
