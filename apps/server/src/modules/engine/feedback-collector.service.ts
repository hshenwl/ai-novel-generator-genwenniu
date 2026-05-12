// ============================================================
// 反馈采集服务 — 自动记录每次 AI 生成的质量数据
// 闭环：采集 → 存储 → 分析 → 优化
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { GlobalLogService } from '../task/global-log.service';

export interface FeedbackRecord {
  projectId: string;
  workflowId?: string;
  taskType: string;          // world_setting/outline/volume/chapter/...
  genre?: string;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  workflowMode?: string;
  totalScore?: number;
  dimensionScores?: Record<string, number>;
  passStatus?: string;
  revisionRounds?: number;
  stepDurations?: Record<string, number>;
  tokenUsage?: number;
  cost?: number;
  promptTemplateId?: string;
  knowledgeRefs?: string[];
  bottleneckDims?: string[];
}

@Injectable()
export class FeedbackCollector {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: GlobalLogService,
  ) {}

  /**
   * 记录一次完整的生成反馈
   */
  async record(data: FeedbackRecord): Promise<void> {
    try {
      await this.prisma.generationFeedback.create({
        data: {
          projectId: data.projectId,
          workflowId: data.workflowId,
          taskType: data.taskType,
          genre: data.genre,
          modelName: data.modelName,
          temperature: data.temperature,
          maxTokens: data.maxTokens,
          workflowMode: data.workflowMode,
          totalScore: data.totalScore,
          dimensionScores: data.dimensionScores ? JSON.stringify(data.dimensionScores) : null,
          passStatus: data.passStatus,
          revisionRounds: data.revisionRounds ?? 0,
          stepDurations: data.stepDurations ? JSON.stringify(data.stepDurations) : null,
          tokenUsage: data.tokenUsage,
          cost: data.cost ?? 0,
          promptTemplateId: data.promptTemplateId,
          knowledgeRefs: data.knowledgeRefs ? JSON.stringify(data.knowledgeRefs) : null,
          bottleneckDims: data.bottleneckDims ? JSON.stringify(data.bottleneckDims) : null,
        },
      });
      this.logger.log('FeedbackCollector', 'record', `Recorded feedback: ${data.taskType} score=${data.totalScore}`);
    } catch (e) {
      this.logger.error('FeedbackCollector', 'record', `Failed: ${(e as Error).message}`);
    }
  }

  /**
   * 从审核报告中提取反馈数据并记录
   */
  async recordFromAudit(params: {
    projectId: string;
    workflowId?: string;
    taskType: string;
    genre?: string;
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    workflowMode?: string;
    totalScore: number;
    dimensionScores: string;  // JSON string
    passStatus: string;
    revisionRounds?: number;
    stepDurations?: Record<string, number>;
    tokenUsage?: number;
    cost?: number;
  }): Promise<void> {
    // 解析维度分数，找出瓶颈维度
    let dims: Record<string, number> = {};
    let bottleneckDims: string[] = [];
    try {
      dims = JSON.parse(params.dimensionScores);
      // 取分数最低的 3 个维度作为瓶颈
      const sorted = Object.entries(dims).sort(([, a], [, b]) => a - b);
      bottleneckDims = sorted.slice(0, 3).map(([k]) => k);
    } catch { /* ignore */ }

    await this.record({
      projectId: params.projectId,
      workflowId: params.workflowId,
      taskType: params.taskType,
      genre: params.genre,
      modelName: params.modelName,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      workflowMode: params.workflowMode,
      totalScore: params.totalScore,
      dimensionScores: dims,
      passStatus: params.passStatus,
      revisionRounds: params.revisionRounds,
      stepDurations: params.stepDurations,
      tokenUsage: params.tokenUsage,
      cost: params.cost,
      bottleneckDims,
    });
  }

  /**
   * 从七步引擎执行结果中提取反馈
   */
  async recordFromWorkflow(params: {
    projectId: string;
    workflowId: string;
    taskType: string;
    genre?: string;
    modelName?: string;
    workflowMode?: string;
    result: any;       // engine output
    stepHistory: any[]; // workflow step history
  }): Promise<void> {
    const durations: Record<string, number> = {};
    let totalTokens = 0;

    for (const step of params.stepHistory) {
      durations[step.step] = step.duration || 0;
      if (step.output?.usage?.totalTokens) {
        totalTokens += step.output.usage.totalTokens;
      }
    }

    const revisionRounds = params.result?.metadata?.revisionRounds || 0;
    const totalScore = params.result?.metadata?.totalScore;

    await this.record({
      projectId: params.projectId,
      workflowId: params.workflowId,
      taskType: params.taskType,
      genre: params.genre,
      modelName: params.modelName,
      workflowMode: params.workflowMode,
      totalScore,
      revisionRounds,
      stepDurations: durations,
      tokenUsage: totalTokens || undefined,
    });
  }

  /**
   * 获取反馈记录
   */
  async getFeedback(options?: {
    projectId?: string;
    taskType?: string;
    modelName?: string;
    limit?: number;
    since?: Date;
  }) {
    const where: any = {};
    if (options?.projectId) where.projectId = options.projectId;
    if (options?.taskType) where.taskType = options.taskType;
    if (options?.modelName) where.modelName = options.modelName;
    if (options?.since) where.createdAt = { gte: options.since };

    return this.prisma.generationFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 100,
    });
  }

  /**
   * 质量趋势数据（按天聚合）
   */
  async getTrends(projectId?: string, days: number = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const where: any = { createdAt: { gte: since } };
    if (projectId) where.projectId = projectId;

    const records = await this.prisma.generationFeedback.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, totalScore: true, taskType: true, modelName: true, revisionRounds: true },
    });

    // 按天聚合
    const byDay: Record<string, { scores: number[]; count: number }> = {};
    for (const r of records) {
      if (!r.totalScore) continue;
      const day = r.createdAt.toISOString().substring(0, 10);
      if (!byDay[day]) byDay[day] = { scores: [], count: 0 };
      byDay[day].scores.push(r.totalScore);
      byDay[day].count++;
    }

    return Object.entries(byDay).map(([date, data]) => ({
      date,
      avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
      minScore: Math.min(...data.scores),
      maxScore: Math.max(...data.scores),
      count: data.count,
    }));
  }

  /**
   * 模型对比数据
   */
  async getModelComparison(projectId?: string) {
    const where: any = { modelName: { not: null }, totalScore: { not: null } };
    if (projectId) where.projectId = projectId;

    const records = await this.prisma.generationFeedback.findMany({
      where,
      select: { modelName: true, taskType: true, totalScore: true, revisionRounds: true, cost: true },
    });

    const byModel: Record<string, { scores: number[]; revisions: number[]; costs: number[]; tasks: Record<string, number[]> }> = {};
    for (const r of records) {
      const m = r.modelName!;
      if (!byModel[m]) byModel[m] = { scores: [], revisions: [], costs: [], tasks: {} };
      byModel[m].scores.push(r.totalScore!);
      byModel[m].revisions.push(r.revisionRounds);
      byModel[m].costs.push(r.cost || 0);
      if (!byModel[m].tasks[r.taskType]) byModel[m].tasks[r.taskType] = [];
      byModel[m].tasks[r.taskType].push(r.totalScore!);
    }

    return Object.entries(byModel).map(([model, data]) => ({
      model,
      avgScore: avg(data.scores),
      avgRevisions: avg(data.revisions),
      totalCost: data.costs.reduce((a, b) => a + b, 0),
      count: data.scores.length,
      taskScores: Object.fromEntries(
        Object.entries(data.tasks).map(([t, s]) => [t, { avg: avg(s), count: s.length }])
      ),
    }));
  }

  /**
   * 维度分析数据（聚合所有审核报告的维度分数）
   */
  async getDimensionAnalysis(projectId?: string) {
    const where: any = { dimensionScores: { not: null } };
    if (projectId) where.projectId = projectId;

    const records = await this.prisma.generationFeedback.findMany({
      where,
      select: { dimensionScores: true, taskType: true },
      take: 500,
    });

    const dimAgg: Record<string, { scores: number[]; count: number }> = {};
    for (const r of records) {
      try {
        const dims = JSON.parse(r.dimensionScores!);
        for (const [dim, score] of Object.entries(dims)) {
          if (!dimAgg[dim]) dimAgg[dim] = { scores: [], count: 0 };
          dimAgg[dim].scores.push(score as number);
          dimAgg[dim].count++;
        }
      } catch { /* skip */ }
    }

    return Object.entries(dimAgg)
      .map(([dim, data]) => ({
        dimension: dim,
        avgScore: avg(data.scores),
        minScore: Math.min(...data.scores),
        maxScore: Math.max(...data.scores),
        count: data.count,
      }))
      .sort((a, b) => a.avgScore - b.avgScore); // 最低分排前面（瓶颈）
  }
}

function avg(arr: number[]): number {
  return arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 100) / 100 : 0;
}
