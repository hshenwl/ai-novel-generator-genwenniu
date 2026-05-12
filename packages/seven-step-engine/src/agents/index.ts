// ============================================================
// 七步创作引擎 - Agent导出
// ============================================================

export { Planner } from './planner';
export type { KnowledgeSearcher } from './planner';
export { Writer } from './writer';
export { DeepReader } from './deep-reader';
export { DeepEditor } from './deep-editor';
export { Auditor } from './auditor';
export { Reviser } from './reviser';
export { Settler } from './settler';

import { Planner, KnowledgeSearcher } from './planner';
import { Writer } from './writer';
import { DeepReader } from './deep-reader';
import { DeepEditor } from './deep-editor';
import { Auditor } from './auditor';
import { Reviser } from './reviser';
import { Settler } from './settler';
import type { AIGateway } from '@ai-novel/ai-gateway';
import { WorkflowStep, AgentInput, AgentOutput } from '../types';

/**
 * 七步创作引擎 - 统一入口
 */
export class SevenStepEngine {
  private planner: Planner;
  private writer: Writer;
  private deepReader: DeepReader;
  private deepEditor: DeepEditor;
  private auditor: Auditor;
  private reviser: Reviser;
  private settler: Settler;

  constructor(aiGateway: AIGateway, config?: {
    plannerModel?: string;
    writerModel?: string;
    readerModel?: string;
    editorModel?: string;
    auditorModel?: string;
    reviserModel?: string;
    knowledgeSearcher?: KnowledgeSearcher;
  }) {
    this.planner = new Planner(config?.knowledgeSearcher);
    this.writer = new Writer(aiGateway, config?.writerModel);
    this.deepReader = new DeepReader(aiGateway, config?.readerModel);
    this.deepEditor = new DeepEditor(aiGateway, config?.editorModel);
    this.auditor = new Auditor(aiGateway, config?.auditorModel);
    this.reviser = new Reviser(aiGateway, config?.reviserModel);
    this.settler = new Settler(aiGateway, config?.reviserModel);
  }

  /**
   * 带超时的Agent执行包装器
   */
  private async executeWithTimeout(agent: { execute(input: AgentInput): Promise<AgentOutput> }, input: AgentInput, timeoutMs: number = 120000): Promise<AgentOutput> {
    const timeoutPromise = new Promise<AgentOutput>((_, reject) => {
      setTimeout(() => reject(new Error(`Agent execution timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    return Promise.race([agent.execute(input), timeoutPromise]);
  }

  /**
   * 获取指定步骤的Agent
   */
  getAgent(step: WorkflowStep): Planner | Writer | DeepReader | DeepEditor | Auditor | Reviser | Settler {
    switch (step) {
      case 'planning':
        return this.planner;
      case 'writing':
        return this.writer;
      case 'deep_reading':
        return this.deepReader;
      case 'deep_editing':
        return this.deepEditor;
      case 'auditing':
        return this.auditor;
      case 'revising':
        return this.reviser;
      case 'settling':
        return this.settler;
      default:
        throw new Error(`Unknown step: ${step}`);
    }
  }

  /**
   * 执行单个步骤
   */
  async executeStep(step: WorkflowStep, input: AgentInput): Promise<AgentOutput> {
    const agent = this.getAgent(step);
    return agent.execute(input);
  }

  /**
   * 执行完整流程
   */
  async executeFullWorkflow(input: AgentInput, options?: {
    skipDeepReader?: boolean;
    skipDeepEditor?: boolean;
    maxRevisionRounds?: number;
  }): Promise<AgentOutput> {
    let currentInput = input;
    let currentStep: WorkflowStep = 'planning';
    let revisionRounds = 0;
    const maxRevisions = options?.maxRevisionRounds ?? 2;

    // 1. 规划
    currentInput.step = 'planning';
    let output = await this.executeWithTimeout(this.planner, currentInput);
    if (!output.success) return output;
    currentInput.previousOutput = output.content;

    // 2. 写作
    currentStep = 'writing';
    currentInput.step = 'writing';
    output = await this.executeWithTimeout(this.writer, currentInput);
    if (!output.success) return output;
    currentInput.previousOutput = output.content;

    // 3. 深度读者检查（可选）
    const feedbacks: string[] = [];
    if (!options?.skipDeepReader) {
      currentStep = 'deep_reading';
      currentInput.step = 'deep_reading';
      output = await this.executeWithTimeout(this.deepReader, currentInput);
      feedbacks.push(`【深度读者反馈】\n${output.content}`);
    }

    // 4. 深度编辑检查（可选）
    if (!options?.skipDeepEditor) {
      currentStep = 'deep_editing';
      currentInput.step = 'deep_editing';
      output = await this.executeWithTimeout(this.deepEditor, currentInput);
      feedbacks.push(`【深度编辑反馈】\n${output.content}`);
    }

    // 将累积的反馈注入 input
    if (feedbacks.length > 0) {
      currentInput.feedback = feedbacks;
    }

    // 5. 审核循环
    while (revisionRounds < maxRevisions) {
      currentStep = 'auditing';
      currentInput.step = 'auditing';
      output = await this.executeWithTimeout(this.auditor, currentInput);

      if (!output.success) return output;

      const auditResult = output.metadata?.auditResult as string;
      
      if (auditResult === 'pass') {
        // 通过，进入沉淀
        break;
      }

      if (auditResult === 'rewrite' || auditResult === 'blocked') {
        // 需要重写，退回
        return {
          success: false,
          content: currentInput.previousOutput || '',
          issues: output.issues,
          suggestions: output.suggestions,
          nextStep: auditResult === 'blocked' ? 'planning' : 'writing'
        };
      }

      // 需要修订
      revisionRounds++;
      currentStep = 'revising';
      currentInput.step = 'revising';
      currentInput.feedback = [...feedbacks, `【审核反馈】\n${output.content}`];
      
      output = await this.executeWithTimeout(this.reviser, currentInput);
      if (!output.success) return output;
      
      currentInput.previousOutput = output.content;
    }

    // 6. 沉淀入库
    currentStep = 'settling';
    currentInput.step = 'settling';
    output = await this.executeWithTimeout(this.settler, currentInput);

    return {
      ...output,
      metadata: {
        ...output.metadata,
        revisionRounds,
        completedSteps: ['planning', 'writing', 'deep_reading', 'deep_editing', 'auditing', 'revising', 'settling']
      }
    };
  }

  /**
   * 获取所有Agent名称
   */
  getAgentNames(): string[] {
    return ['planner', 'writer', 'deepReader', 'deepEditor', 'auditor', 'reviser', 'settler'];
  }
}