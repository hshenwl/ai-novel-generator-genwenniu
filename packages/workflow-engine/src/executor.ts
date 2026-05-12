// ============================================================
// 工作流引擎 - 核心执行器（性能优化版）
// ============================================================

import {
  WorkflowInstance,
  WorkflowConfig,
  WorkflowEvent,
  WorkflowEventListener,
  WorkflowState,
  StepRecord
} from './types';
import { WorkflowStateMachine, getDefaultConfig } from './state-machine';
import { ConcurrencyLimiter } from './concurrency';
import { InstanceCleanup } from './cleanup';
import type { AIGateway } from '@ai-novel/ai-gateway';
import type { SevenStepEngine, CreationContext, AgentInput } from '@ai-novel/seven-step-engine';

/**
 * 工作流执行器（优化版）
 * - 并发限制：默认最多5个工作流同时运行
 * - LRU 过期：完成/失败超过1小时自动清理
 * - 步骤级重试：每步最多重试2次
 * - 流式进度：每步完成后推送进度事件
 */
export class WorkflowExecutor {
  private aiGateway: AIGateway;
  private sevenStepEngine: SevenStepEngine;
  private listeners: WorkflowEventListener[] = [];
  private instances: Map<string, WorkflowInstance> = new Map();
  private concurrency: ConcurrencyLimiter;
  private cleanup: InstanceCleanup;
  private maxStepRetries: number = 2;
  private stepTimeoutMs: number = 120000;

  constructor(aiGateway: AIGateway, sevenStepEngine: SevenStepEngine) {
    this.aiGateway = aiGateway;
    this.sevenStepEngine = sevenStepEngine;
    this.concurrency = new ConcurrencyLimiter(5);
    this.cleanup = new InstanceCleanup(
      this.instances,
      (inst) => inst.updatedAt,
      3600000 // 1 hour
    );
    this.cleanup.start();
  }

  /**
   * 添加事件监听器
   */
  addEventListener(listener: WorkflowEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(listener: WorkflowEventListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * 设置最大并发数
   */
  setMaxConcurrent(max: number): void {
    this.concurrency.setMaxConcurrent(max);
  }

  /**
   * 获取并发状态
   */
  getConcurrencyStatus(): { running: number; queued: number; maxConcurrent: number } {
    return {
      running: this.concurrency.getRunning(),
      queued: this.concurrency.getQueued(),
      maxConcurrent: 5,
    };
  }

  /**
   * 创建工作流实例
   */
  createInstance(
    projectId: string,
    type: string,
    mode: string,
    config?: Partial<WorkflowConfig>
  ): WorkflowInstance {
    const id = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const defaultConfig = getDefaultConfig(mode as any, type);

    const instance: WorkflowInstance = {
      id,
      projectId,
      type: type as any,
      mode: mode as any,
      status: 'pending',
      currentStep: 'planning',
      progress: 0,
      config: { ...defaultConfig, ...config },
      stepHistory: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.instances.set(id, instance);
    return instance;
  }

  /**
   * 启动工作流（带并发控制 + 步骤级重试 + 流式进度）
   */
  async start(instanceId: string, context: CreationContext): Promise<WorkflowInstance> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    // 并发控制
    await this.concurrency.acquire();

    instance.status = 'planning';
    instance.startedAt = new Date();
    instance.updatedAt = new Date();
    instance.currentInput = context;

    this.emit({ type: 'started', instanceId });

    try {
      // 执行完整流程（带步骤级重试）
      const input: AgentInput = {
        context,
        step: 'planning',
        previousOutput: undefined
      };

      const result = await this.executeWithStepRetry(input, instance);

      if (result.success) {
        instance.status = 'completed';
        instance.progress = 100;
        instance.completedAt = new Date();
        instance.result = result.content;
        
        this.emit({
          type: 'completed',
          instanceId,
          result: { content: result.content, metadata: result.metadata }
        });
      } else {
        instance.status = 'failed';
        instance.error = result.issues?.join('; ') || 'Workflow failed';
        
        this.emit({ type: 'failed', instanceId, error: instance.error });
      }

      // 记录步骤历史
      if (result.metadata?.completedSteps) {
        for (const step of result.metadata.completedSteps) {
          instance.stepHistory.push({
            step,
            status: 'success',
            timestamp: new Date(),
            duration: 0
          });
        }
      }

    } catch (error) {
      instance.status = 'failed';
      instance.error = (error as Error).message;
      
      this.emit({ type: 'failed', instanceId, error: instance.error });
    } finally {
      this.concurrency.release();
    }

    instance.updatedAt = new Date();
    return instance;
  }

  /**
   * 带步骤级重试的执行器
   */
  private async executeWithStepRetry(input: AgentInput, instance: WorkflowInstance): Promise<any> {
    const stepOrder = ['planning', 'writing', 'deep_reading', 'deep_editing', 'auditing', 'revising', 'settling'] as const;
    let currentInput = { ...input };
    let revisionRounds = 0;
    const maxRevisions = instance.config.maxRevisionRounds ?? 2;
    const skipDeepReader = instance.config.skipDeepReader;
    const skipDeepEditor = instance.config.skipDeepEditor;

    for (let si = 0; si < stepOrder.length; si++) {
      const stepName = stepOrder[si];
      
      // 跳过可选步骤
      if (stepName === 'deep_reading' && skipDeepReader) continue;
      if (stepName === 'deep_editing' && skipDeepEditor) continue;

      // 审核循环
      if (stepName === 'auditing') {
        while (revisionRounds < maxRevisions) {
          instance.currentStep = 'auditing';
          instance.status = 'auditing' as WorkflowState;
          instance.updatedAt = new Date();
          this.emit({ type: 'progress', instanceId: instance.id, progress: 60 + revisionRounds * 10 });

          const auditResult = await this.executeStepWithRetry(this.sevenStepEngine.getAgent('auditing'), currentInput, instance, 'auditing');
          if (!auditResult.success) return auditResult;

          const passResult = auditResult.metadata?.auditResult;
          if (passResult === 'pass') break;

          if (passResult === 'rewrite' || passResult === 'blocked') {
            return { success: false, content: currentInput.previousOutput || '', issues: auditResult.issues, suggestions: auditResult.suggestions };
          }

          // 修订
          revisionRounds++;
          instance.currentStep = 'revising';
          instance.status = 'revising' as WorkflowState;
          instance.updatedAt = new Date();

          currentInput.step = 'revising';
          currentInput.feedback = [`【审核反馈】\n${auditResult.content}`];

          const reviseResult = await this.executeStepWithRetry(this.sevenStepEngine.getAgent('revising'), currentInput, instance, 'revising');
          if (!reviseResult.success) return reviseResult;
          currentInput.previousOutput = reviseResult.content;
        }
        continue;
      }

      // 普通步骤
      instance.currentStep = stepName;
      instance.status = stepName as WorkflowState;
      const progress = Math.round((si / stepOrder.length) * 100);
      instance.progress = progress;
      instance.updatedAt = new Date();
      this.emit({ type: 'progress', instanceId: instance.id, progress });

      currentInput.step = stepName as any;
      const stepResult = await this.executeStepWithRetry(
        this.sevenStepEngine.getAgent(stepName as any),
        currentInput,
        instance,
        stepName
      );

      if (!stepResult.success) return stepResult;
      currentInput.previousOutput = stepResult.content;
    }

    return {
      success: true,
      content: currentInput.previousOutput || '',
      metadata: { revisionRounds, completedSteps: [...stepOrder] }
    };
  }

  /**
   * 单步执行 + 自动重试
   */
  private async executeStepWithRetry(
    agent: { execute(input: AgentInput): Promise<any> },
    input: AgentInput,
    instance: WorkflowInstance,
    stepName: string
  ): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.maxStepRetries; attempt++) {
      try {
        const result = await this.withTimeout(agent.execute(input), this.stepTimeoutMs, stepName);
        
        instance.stepHistory.push({
          step: stepName,
          status: result.success ? 'success' : 'failed',
          input,
          output: result,
          duration: 0,
          timestamp: new Date()
        });

        if (result.success) {
          this.emit({ type: 'step_completed', instanceId: instance.id, step: stepName, output: result });
        } else {
          this.emit({ type: 'step_failed', instanceId: instance.id, step: stepName, error: result.issues?.join(', ') || 'Step failed' });
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.maxStepRetries) {
          console.warn(`[WorkflowExecutor] Step ${stepName} failed (attempt ${attempt + 1}/${this.maxStepRetries + 1}), retrying...`);
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    instance.stepHistory.push({
      step: stepName,
      status: 'failed',
      output: { error: lastError?.message },
      duration: 0,
      timestamp: new Date()
    });

    return {
      success: false,
      content: '',
      issues: [lastError?.message || `Step ${stepName} failed after ${this.maxStepRetries + 1} attempts`]
    };
  }

  /**
   * 执行单个步骤
   */
  async executeStep(instanceId: string, step: string): Promise<any> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    this.emit({ type: 'step_started', instanceId, step });

    const startTime = Date.now();
    
    try {
      const input: AgentInput = {
        context: instance.currentInput,
        step: step as any,
        previousOutput: instance.stepHistory[instance.stepHistory.length - 1]?.output
      };

      const result = await this.sevenStepEngine.executeStep(step as any, input);
      const duration = Date.now() - startTime;

      instance.stepHistory.push({
        step, status: result.success ? 'success' : 'failed',
        input, output: result, duration, timestamp: new Date()
      });

      instance.currentStep = result.nextStep || step;
      instance.updatedAt = new Date();

      if (result.success) {
        this.emit({ type: 'step_completed', instanceId, step, output: result });
      } else {
        this.emit({ type: 'step_failed', instanceId, step, error: result.issues?.join(', ') || 'Unknown error' });
      }

      return result;
    } catch (error) {
      this.emit({ type: 'step_failed', instanceId, step, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 暂停工作流
   */
  pause(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) throw new Error(`Workflow instance not found: ${instanceId}`);
    if (!['planning', 'writing', 'auditing', 'revising'].includes(instance.status)) {
      throw new Error(`Cannot pause workflow in state: ${instance.status}`);
    }
    instance.status = 'paused';
    instance.updatedAt = new Date();
    this.emit({ type: 'paused', instanceId });
  }

  /**
   * 恢复工作流
   */
  async resume(instanceId: string): Promise<WorkflowInstance> {
    const instance = this.instances.get(instanceId);
    if (!instance) throw new Error(`Workflow instance not found: ${instanceId}`);
    if (instance.status !== 'paused') throw new Error(`Cannot resume workflow in state: ${instance.status}`);

    const lastSuccessfulStep = instance.stepHistory.filter(s => s.status === 'success').pop();
    const stepOrder = ['planning', 'writing', 'deep_reading', 'deep_editing', 'auditing', 'revising', 'settling'];
    let nextStepIndex = 0;
    if (lastSuccessfulStep) {
      const lastIdx = stepOrder.indexOf(lastSuccessfulStep.step);
      if (lastIdx >= 0) nextStepIndex = lastIdx + 1;
    }

    instance.status = 'pending';
    instance.updatedAt = new Date();
    this.emit({ type: 'resumed', instanceId });

    await this.concurrency.acquire();
    try {
      for (let i = nextStepIndex; i < stepOrder.length; i++) {
        const stepName = stepOrder[i];
        instance.status = stepName as WorkflowState;
        instance.currentStep = stepName;
        instance.updatedAt = new Date();
        this.emit({ type: 'step_started', instanceId, step: stepName });

        const result = await this.sevenStepEngine.executeStep(stepName as any, {
          context: instance.currentInput, step: stepName as any,
          previousOutput: lastSuccessfulStep?.output?.content,
        });

        instance.stepHistory.push({
          step: stepName, status: result.success ? 'success' : 'failed',
          output: result, duration: result.metadata?.duration || 0, timestamp: new Date(),
        });

        if (result.success) {
          this.emit({ type: 'step_completed', instanceId, step: stepName, output: result });
        } else {
          instance.status = 'failed';
          instance.error = result.issues?.join('; ') || `Step ${stepName} failed`;
          instance.updatedAt = new Date();
          this.emit({ type: 'failed', instanceId, error: instance.error });
          return instance;
        }
      }

      instance.status = 'completed';
      instance.progress = 100;
      instance.completedAt = new Date();
      instance.updatedAt = new Date();
      this.emit({
        type: 'completed', instanceId,
        result: { content: instance.stepHistory[instance.stepHistory.length - 1]?.output?.content },
      });
    } catch (error) {
      instance.status = 'failed';
      instance.error = (error as Error).message;
      instance.updatedAt = new Date();
      this.emit({ type: 'failed', instanceId, error: instance.error });
    } finally {
      this.concurrency.release();
    }

    return instance;
  }

  /**
   * 取消工作流
   */
  cancel(instanceId: string, _userId?: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) throw new Error(`Workflow instance not found: ${instanceId}`);
    instance.status = 'failed';
    instance.error = 'Cancelled by user';
    instance.updatedAt = new Date();
    this.emit({ type: 'failed', instanceId, error: 'Cancelled by user' });
  }

  getInstance(instanceId: string): WorkflowInstance | undefined {
    return this.instances.get(instanceId);
  }

  getAllInstances(): WorkflowInstance[] {
    return Array.from(this.instances.values());
  }

  getProjectInstances(projectId: string): WorkflowInstance[] {
    return this.getAllInstances().filter(i => i.projectId === projectId);
  }

  private emit(event: WorkflowEvent): void {
    for (const listener of this.listeners) {
      try { listener(event); } catch (error) { console.error('Event listener error:', error); }
    }
  }

  /**
   * 销毁执行器（清理定时器）
   */
  destroy(): void {
    this.cleanup.stop();
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, stepName: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Step "${stepName}" timed out after ${ms}ms`)), ms)
      ),
    ]);
  }
}
