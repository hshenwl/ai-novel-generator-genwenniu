// ============================================================
// 七步创作引擎 - Planner 规划器
// ============================================================

import { AgentInput, AgentOutput, CreationContext, ConstraintChecklist } from '../types';

/** 知识库搜索接口 — 轻量抽象，避免直接引用 knowledge-base 包 */
export interface KnowledgeSearcher {
  search(query: string, options?: { limit?: number; directories?: string[] }): Promise<any[]>;
  recommendByScenario(scenario: string): Promise<any[]>;
}

/**
 * Planner - 规划器
 * 负责读取知识库、项目设定、上下文，生成创作约束清单
 */
export class Planner {
  private knowledgeSearcher?: KnowledgeSearcher;

  constructor(knowledgeSearcher?: KnowledgeSearcher) {
    this.knowledgeSearcher = knowledgeSearcher;
  }

  /**
   * 生成约束清单
   */
  async generateConstraints(context: CreationContext): Promise<ConstraintChecklist> {
    // 主动搜索知识库
    let knowledgeRefs: string[] = [];
    if (this.knowledgeSearcher) {
      try {
        // 根据创作场景推荐知识库
        const scenario = this.detectScenario(context);
        const recommended = await this.knowledgeSearcher.recommendByScenario(scenario);
        knowledgeRefs = recommended.map((f: any) => `[${f.category}] ${f.filename}: ${f.path}`);
      } catch (err) {
        console.warn('[Planner] 知识库搜索失败:', err);
      }
    }

    const checklist: ConstraintChecklist = {
      taskGoal: this.determineTaskGoal(context),
      currentPosition: this.getCurrentPosition(context),
      mustConnect: this.getMustConnect(context),
      chapterFunction: this.getChapterFunction(context),
      characterStatus: this.getCharacterStatus(context),
      coreConflict: this.extractCoreConflict(context),
      coolPoints: this.designCoolPoints(context),
      emotionProgress: this.designEmotionProgress(context),
      hookDesign: this.designHooks(context),
      foreshadowManagement: this.manageForeshadows(context),
      worldConstraints: this.getWorldConstraints(context),
      knowledgeReferences: this.getKnowledgeReferences(context, knowledgeRefs),
      prohibitions: this.getProhibitions(context),
      outputFormat: this.getOutputFormat(context),
      qualityChecklist: this.getQualityChecklist(context),
    };

    return checklist;
  }

  /**
   * 执行规划
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    try {
      const constraints = await this.generateConstraints(input.context);
      return {
        success: true,
        content: this.formatConstraints(constraints),
        metadata: { constraints },
        nextStep: 'writing',
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        issues: [error instanceof Error ? error.message : 'Unknown error'],
        nextStep: 'planning',
      };
    }
  }

  /** 根据上下文自动检测创作场景 */
  private detectScenario(context: CreationContext): string {
    if (context.chapterId) return '正文生成';
    if (context.chapterOutline) return '章纲生成';
    if (context.volumeId) return '卷纲生成';
    if (context.worldSetting) return '世界设定';
    return '正文生成';
  }

  private determineTaskGoal(context: CreationContext): string {
    if (context.chapterId) return `生成第${context.chapterOutline ? '章节正文' : '章节'}`;
    if (context.volumeId) return '生成卷纲';
    return '生成小说总纲';
  }

  private getCurrentPosition(context: CreationContext): string {
    const parts: string[] = [];
    if (context.projectName) parts.push(`项目: ${context.projectName}`);
    if (context.volumeId) parts.push('当前卷');
    if (context.chapterId) parts.push('当前章节');
    return parts.join(' → ') || '初始阶段';
  }

  private getMustConnect(context: CreationContext): string[] {
    const items: string[] = [];
    if (context.previousChapterSummary) {
      items.push(`承接上一章: ${context.previousChapterSummary.slice(0, 100)}...`);
    }
    return items;
  }

  private getChapterFunction(context: CreationContext): string[] {
    return context.chapterOutline ? ['推进主线剧情', '兑现读者期待'] : ['推进剧情'];
  }

  private getCharacterStatus(context: CreationContext): string {
    return (context.characters || []).map(c => `${c.name}(${c.role})`).join(', ') || '暂无角色';
  }

  private extractCoreConflict(context: CreationContext): string {
    return context.outline || '核心冲突待确定';
  }

  private designCoolPoints(context: CreationContext): string[] {
    return ['保持主角高光', '冲突快速升级'];
  }

  private designEmotionProgress(context: CreationContext): string[] {
    return ['开头调动情绪', '中间维持张力', '结尾制造期待'];
  }

  private designHooks(context: CreationContext): string[] {
    return ['开头Hook: 快速引入矛盾', '结尾Hook: 悬念或期待'];
  }

  private manageForeshadows(context: CreationContext): string[] {
    return (context.foreshadows || []).map(f => `伏笔: ${f.name}(${f.status})`);
  }

  private getWorldConstraints(context: CreationContext): string[] {
    if (!context.worldSetting) return [];
    return ['遵守世界观设定', '不违反核心规则'];
  }

  private getKnowledgeReferences(context: CreationContext, kbRefs: string[]): string[] {
    const refs: string[] = [];
    // 主动检索的知识库结果
    if (kbRefs.length > 0) {
      refs.push(...kbRefs.map(r => `参考: ${r}`));
    }
    // 调用方传入的 knowledgeContext
    if (context.knowledgeContext) {
      refs.push(`上下文知识: ${context.knowledgeContext.slice(0, 200)}...`);
    }
    return refs;
  }

  private getProhibitions(context: CreationContext): string[] {
    return ['禁止角色OOC(崩坏)', '禁止AI腔和模板感', '禁止设定冲突', '禁止章末无Hook'];
  }

  private getOutputFormat(context: CreationContext): string {
    return 'Markdown格式，包含标题和正文';
  }

  private getQualityChecklist(context: CreationContext): string[] {
    return ['符合章纲要求', '承接上下文', '有明确冲突', '有情绪推进', '字数达标'];
  }

  private formatConstraints(c: ConstraintChecklist): string {
    return [
      '# 创作约束清单',
      '',
      `## 任务目标\n${c.taskGoal}`,
      `## 当前位置\n${c.currentPosition}`,
      `## 必须承接\n${c.mustConnect.join('\n')}`,
      `## 章节功能\n${c.chapterFunction.join('\n')}`,
      `## 角色状态\n${c.characterStatus}`,
      `## 核心冲突\n${c.coreConflict}`,
      `## 爽点设计\n${c.coolPoints.join('\n')}`,
      `## 情绪推进\n${c.emotionProgress.join('\n')}`,
      `## Hook设计\n${c.hookDesign.join('\n')}`,
      `## 伏笔管理\n${c.foreshadowManagement.join('\n')}`,
      `## 世界约束\n${c.worldConstraints.join('\n')}`,
      `## 知识库引用\n${c.knowledgeReferences.join('\n')}`,
      `## 禁止事项\n${c.prohibitions.join('\n')}`,
      `## 输出格式\n${c.outputFormat}`,
      `## 质量检查\n${c.qualityChecklist.join('\n')}`,
    ].join('\n');
  }
}
