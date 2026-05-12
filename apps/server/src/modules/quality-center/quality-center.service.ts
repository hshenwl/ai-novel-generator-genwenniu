import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { OwnershipService } from '../../common/auth/ownership.service';
import { EngineService } from '../engine/engine.service';

export type RewriteRoute = 'minor_ai_flavor' | 'hook_enhance' | 'pace_compress' | 'character_rewrite' | 'setting_conflict' | 'outline_mismatch' | 'full_rewrite';

export interface QualitySummary {
  chapterId: string;
  chapterNo: number;
  chapterTitle: string;
  totalScore: number;
  passStatus: string;
  dimensionScores: Record<string, number>;
  issues: string[];
  suggestions: string[];
  recommendedRoute: RewriteRoute | null;
  routeReason: string;
}

@Injectable()
export class QualityCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
    private readonly engineService: EngineService,
  ) {}

  async getChapterQuality(chapterId: string, userId: string): Promise<QualitySummary> {
    await this.ownership.ensureChapterOwner(chapterId, userId);

    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { volume: { select: { project: { select: { userId: true } } } } },
    });
    if (!chapter || chapter.volume.project.userId !== userId) throw new NotFoundException('章节不存在');

    const latestReport = await this.prisma.auditReport.findFirst({
      where: { chapterId },
      orderBy: { createdAt: 'desc' },
    });

    let dimensionScores: Record<string, number> = {};
    if (latestReport?.dimensionScores) {
      try { dimensionScores = JSON.parse(latestReport.dimensionScores); } catch {}
    }

    const route = this.determineRewriteRoute(latestReport?.passStatus, dimensionScores);

    return {
      chapterId,
      chapterNo: chapter.chapterNo,
      chapterTitle: chapter.title || '',
      totalScore: latestReport?.totalScore || 0,
      passStatus: latestReport?.passStatus || 'none',
      dimensionScores,
      issues: latestReport?.issues ? latestReport.issues.split('\n').filter(Boolean) : [],
      suggestions: latestReport?.suggestions ? latestReport.suggestions.split('\n').filter(Boolean) : [],
      recommendedRoute: route.route,
      routeReason: route.reason,
    };
  }

  async getProjectQuality(projectId: string, userId: string): Promise<QualitySummary[]> {
    await this.ownership.ensureProjectOwner(projectId, userId);

    const chapters = await this.prisma.chapter.findMany({
      where: { volume: { projectId } },
      orderBy: { chapterNo: 'asc' },
      take: 200,
    });

    const results: QualitySummary[] = [];
    for (const ch of chapters) {
      try {
        const summary = await this.getChapterQuality(ch.id, userId);
        results.push(summary);
      } catch {}
    }
    return results;
  }

  determineRewriteRoute(passStatus: string | undefined, dimensions: Record<string, number>): { route: RewriteRoute | null; reason: string } {
    if (!passStatus || passStatus === 'PASS') {
      return { route: null, reason: '章节质量通过，无需重写' };
    }

    const aiFlavorScore = dimensions['ai_flavor'] ?? dimensions['aiFlavor'] ?? 100;
    const hookScore = dimensions['hook_strength'] ?? dimensions['hookStrength'] ?? 100;
    const paceScore = dimensions['pacing'] ?? dimensions['rhythm'] ?? 100;
    const characterScore = dimensions['character_consistency'] ?? dimensions['characterConsistency'] ?? 100;
    const settingScore = dimensions['setting_consistency'] ?? dimensions['settingConsistency'] ?? 100;
    const outlineScore = dimensions['outline_adherence'] ?? dimensions['outlineAdherence'] ?? 100;

    if (passStatus === 'MINOR_REVISE') {
      if (aiFlavorScore < 60) return { route: 'minor_ai_flavor', reason: 'AI味较重，建议轻度去味修订' };
      return { route: 'minor_ai_flavor', reason: '轻微问题，建议轻度修订' };
    }

    if (passStatus === 'MAJOR_REVISE') {
      if (hookScore < 50) return { route: 'hook_enhance', reason: 'Hook强度不足，需要强化Hook结构' };
      if (paceScore < 50) return { route: 'pace_compress', reason: '节奏拖沓，需要压缩重排' };
      if (characterScore < 50) return { route: 'character_rewrite', reason: '人设崩坏，需要基于角色设定重写' };
      return { route: 'hook_enhance', reason: '多项需要修改，建议强化Hook和修订' };
    }

    if (passStatus === 'REWRITE') {
      if (settingScore < 40) return { route: 'setting_conflict', reason: '设定冲突严重，需Planner重建约束' };
      if (outlineScore < 40) return { route: 'outline_mismatch', reason: '与大纲严重不符，需重新生成' };
      return { route: 'full_rewrite', reason: '多项严重问题，建议整章重写' };
    }

    if (passStatus === 'BLOCKED') {
      return { route: 'full_rewrite', reason: '章节被阻塞，需整章重写' };
    }

    return { route: null, reason: '未知状态' };
  }

  async quickRewrite(chapterId: string, userId: string, route?: RewriteRoute): Promise<{ workflowId: string; route: RewriteRoute; reason: string }> {
    await this.ownership.ensureChapterOwner(chapterId, userId);

    const quality = await this.getChapterQuality(chapterId, userId);
    const selectedRoute = route || quality.recommendedRoute;

    if (!selectedRoute) {
      throw new NotFoundException('章节质量通过，无需重写');
    }

    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { volume: { select: { projectId: true } } },
    });
    if (!chapter) throw new NotFoundException('章节不存在');

    const workflowMode = this.routeToWorkflowMode(selectedRoute);

    const instance = this.engineService.createWorkflow(
      chapter.volume.projectId,
      'chapter_rewrite',
      workflowMode,
      { chapterId, rewriteRoute: selectedRoute },
    );

    await this.engineService.startWorkflow(instance.id, {
      projectId: chapter.volume.projectId,
      chapterId,
      rewriteRoute: selectedRoute,
    }, { userId, taskType: 'rewrite' });

    return {
      workflowId: instance.id,
      route: selectedRoute,
      reason: quality.routeReason,
    };
  }

  private routeToWorkflowMode(route: RewriteRoute): string {
    const modeMap: Record<RewriteRoute, string> = {
      minor_ai_flavor: 'revise_only',
      hook_enhance: 'revise_only',
      pace_compress: 'revise_only',
      character_rewrite: 'standard',
      setting_conflict: 'standard',
      outline_mismatch: 'standard',
      full_rewrite: 'standard',
    };
    return modeMap[route];
  }
}
