// ============================================================
// 参数优化服务 — 基于历史反馈数据计算最优参数组合
// 核心算法：Top-K 聚合 + 瓶颈维度分析 + 模型选择优化
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { GlobalLogService } from '../task/global-log.service';

export interface OptimalParams {
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  workflowMode?: string;
  maxRevisionRounds?: number;
  bottleneckDims?: string[];
  confidence: number;       // 0-1, 数据量越多越高
  dataSource: string;       // 'historical' | 'default' | 'override'
}

export interface ParamOverride {
  taskType: string;
  genre?: string;
  paramName: string;
  paramValue: string;
}

// 默认参数
const DEFAULT_PARAMS: Record<string, Partial<OptimalParams>> = {
  world_setting:    { temperature: 0.8, maxTokens: 4096, workflowMode: 'quick', maxRevisionRounds: 1 },
  outline:          { temperature: 0.7, maxTokens: 4096, workflowMode: 'quick', maxRevisionRounds: 1 },
  outline_generate: { temperature: 0.7, maxTokens: 4096, workflowMode: 'quick', maxRevisionRounds: 1 },
  volume:           { temperature: 0.75, maxTokens: 4096, workflowMode: 'standard', maxRevisionRounds: 1 },
  volume_generation:{ temperature: 0.75, maxTokens: 4096, workflowMode: 'standard', maxRevisionRounds: 1 },
  chapter_outline:  { temperature: 0.7, maxTokens: 3000, workflowMode: 'standard', maxRevisionRounds: 1 },
  chapter:          { temperature: 0.8, maxTokens: 8192, workflowMode: 'standard', maxRevisionRounds: 2 },
  chapter_generation:{ temperature: 0.8, maxTokens: 8192, workflowMode: 'standard', maxRevisionRounds: 2 },
  audit:            { temperature: 0.3, maxTokens: 4096, workflowMode: 'strict', maxRevisionRounds: 0 },
  revision:         { temperature: 0.7, maxTokens: 8192, workflowMode: 'standard', maxRevisionRounds: 0 },
};

const MIN_RECORDS_FOR_OPTIMIZATION = 5;

@Injectable()
export class ParamOptimizer {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: GlobalLogService,
  ) {}

  /**
   * 获取推荐参数（核心方法）
   * 流程：用户覆盖 → 历史最优 → 默认值
   */
  async getOptimalParams(
    taskType: string,
    genre?: string,
    userId?: string,
  ): Promise<OptimalParams> {
    // 1. 检查用户手动覆盖
    if (userId) {
      const overrides = await this.getUserOverrides(userId, taskType, genre);
      if (overrides.length > 0) {
        return this.buildFromOverrides(overrides, taskType);
      }
    }

    // 2. 从历史数据中学习
    const historical = await this.learnFromHistory(taskType, genre);
    if (historical) {
      return historical;
    }

    // 3. 回退到默认值
    const defaults = DEFAULT_PARAMS[taskType] || DEFAULT_PARAMS.chapter;
    return {
      ...defaults,
      confidence: 0,
      dataSource: 'default',
    };
  }

  /**
   * 从历史反馈数据中学习最优参数
   */
  private async learnFromHistory(taskType: string, genre?: string): Promise<OptimalParams | null> {
    const where: any = { taskType };
    if (genre) where.genre = genre;

    const records = await this.prisma.generationFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        totalScore: true,
        modelName: true,
        temperature: true,
        maxTokens: true,
        workflowMode: true,
        revisionRounds: true,
        passStatus: true,
        cost: true,
        dimensionScores: true,
      },
    });

    if (records.length < MIN_RECORDS_FOR_OPTIMIZATION) {
      return null;
    }

    // 取 top 20% 的记录（按分数降序）
    const withScore = records.filter(r => r.totalScore !== null);
    if (withScore.length < MIN_RECORDS_FOR_OPTIMIZATION) return null;

    withScore.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    const topCount = Math.max(3, Math.ceil(withScore.length * 0.2));
    const topRecords = withScore.slice(0, topCount);

    // 从 top 记录中提取最优参数
    const modelFreq: Record<string, number> = {};
    const modeFreq: Record<string, number> = {};
    const temps: number[] = [];
    const tokens: number[] = [];
    const revisions: number[] = [];

    for (const r of topRecords) {
      if (r.modelName) modelFreq[r.modelName] = (modelFreq[r.modelName] || 0) + 1;
      if (r.workflowMode) modeFreq[r.workflowMode] = (modeFreq[r.workflowMode] || 0) + 1;
      if (r.temperature !== null && r.temperature !== undefined) temps.push(r.temperature);
      if (r.maxTokens) tokens.push(r.maxTokens);
      revisions.push(r.revisionRounds);
    }

    // 最高频模型
    const bestModel = Object.entries(modelFreq).sort(([, a], [, b]) => b - a)[0]?.[0];
    // 最高频模式
    const bestMode = Object.entries(modeFreq).sort(([, a], [, b]) => b - a)[0]?.[0];
    // 平均温度
    const avgTemp = temps.length > 0 ? Math.round(avg(temps) * 100) / 100 : undefined;
    // 平均 token
    const avgTokens = tokens.length > 0 ? Math.round(avg(tokens) / 256) * 256 : undefined;
    // 平均修订轮次
    const avgRevisions = Math.round(avg(revisions));

    // 计算瓶颈维度
    const bottleneckDims = this.analyzeBottleneckDims(topRecords);

    // 置信度：数据量越大越高
    const confidence = Math.min(1, withScore.length / 50);

    this.logger.log('ParamOptimizer', 'learn', 
      `task=${taskType} genre=${genre} records=${records.length} top=${topCount} confidence=${confidence.toFixed(2)}`
    );

    return {
      modelName: bestModel,
      temperature: avgTemp,
      maxTokens: avgTokens,
      workflowMode: bestMode,
      maxRevisionRounds: avgRevisions,
      bottleneckDims,
      confidence,
      dataSource: 'historical',
    };
  }

  /**
   * 分析瓶颈维度（从审核报告中提取低分维度）
   */
  private analyzeBottleneckDims(records: any[]): string[] {
    const dimScores: Record<string, number[]> = {};

    for (const r of records) {
      if (!r.dimensionScores) continue;
      try {
        const dims = JSON.parse(r.dimensionScores);
        for (const [dim, score] of Object.entries(dims)) {
          if (!dimScores[dim]) dimScores[dim] = [];
          dimScores[dim].push(score as number);
        }
      } catch { continue; }
    }

    // 按平均分排序，取最低的 5 个
    const sorted = Object.entries(dimScores)
      .map(([dim, scores]) => ({ dim, avg: avg(scores) }))
      .sort((a, b) => a.avg - b.avg);

    return sorted.slice(0, 5).map(s => s.dim);
  }

  /**
   * 获取用户手动覆盖的参数
   */
  private async getUserOverrides(userId: string, taskType: string, genre?: string): Promise<any[]> {
    return this.prisma.paramOverride.findMany({
      where: {
        userId,
        isActive: true,
        OR: [
          { taskType },
          { taskType: 'global' },
        ],
      },
    });
  }

  /**
   * 从用户覆盖构建参数
   */
  private buildFromOverrides(overrides: any[], taskType: string): OptimalParams {
    const defaults = DEFAULT_PARAMS[taskType] || DEFAULT_PARAMS.chapter;
    const result: OptimalParams = { ...defaults, confidence: 1, dataSource: 'override' };

    for (const o of overrides) {
      switch (o.paramName) {
        case 'modelName': result.modelName = o.paramValue; break;
        case 'temperature': result.temperature = parseFloat(o.paramValue); break;
        case 'maxTokens': result.maxTokens = parseInt(o.paramValue); break;
        case 'workflowMode': result.workflowMode = o.paramValue; break;
        case 'maxRevisionRounds': result.maxRevisionRounds = parseInt(o.paramValue); break;
      }
    }

    return result;
  }

  /**
   * 设置用户参数覆盖
   */
  async setOverride(userId: string, data: ParamOverride): Promise<void> {
    const genre = data.genre || '';
    const existing = await this.prisma.paramOverride.findFirst({
      where: {
        userId,
        taskType: data.taskType,
        paramName: data.paramName,
        genre: genre || null,
      },
    });

    if (existing) {
      await this.prisma.paramOverride.update({
        where: { id: existing.id },
        data: { paramValue: data.paramValue, isActive: true },
      });
    } else {
      await this.prisma.paramOverride.create({
        data: {
          userId,
          taskType: data.taskType,
          genre: genre || null,
          paramName: data.paramName,
          paramValue: data.paramValue,
        },
      });
    }
    this.logger.log('ParamOptimizer', 'setOverride', `${data.paramName}=${data.paramValue} for ${data.taskType}`);
  }

  /**
   * 删除用户参数覆盖
   */
  async removeOverride(userId: string, taskType: string, paramName: string): Promise<void> {
    await this.prisma.paramOverride.deleteMany({
      where: { userId, taskType, paramName },
    });
  }

  /**
   * 获取所有用户覆盖
   */
  async getOverrides(userId: string): Promise<any[]> {
    return this.prisma.paramOverride.findMany({
      where: { userId, isActive: true },
      orderBy: [{ taskType: 'asc' }, { paramName: 'asc' }],
    });
  }

  /**
   * 触发重新计算（在新反馈数据积累后调用）
   */
  async recalculate(projectId?: string): Promise<{ calculated: number }> {
    const taskTypes = Object.keys(DEFAULT_PARAMS);
    let calculated = 0;

    for (const taskType of taskTypes) {
      const params = await this.learnFromHistory(taskType);
      if (params && params.dataSource === 'historical') {
        calculated++;
        this.logger.log('ParamOptimizer', 'recalculate', 
          `${taskType}: score confidence=${params.confidence.toFixed(2)} model=${params.modelName || 'auto'}`
        );
      }
    }

    return { calculated };
  }
}

function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
