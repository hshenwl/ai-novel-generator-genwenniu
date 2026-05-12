// ============================================================
// 七步创作引擎 - DeepEditor 深度编辑
// ============================================================

import { AgentInput, AgentOutput, CreationContext } from '../types';
import type { AIGateway } from '@ai-novel/ai-gateway';

/**
 * DeepEditor - 深度编辑
 * 从商业编辑视角检查结构、节奏、商业性
 */
export class DeepEditor {
  private aiGateway: AIGateway;
  private modelId: string;

  // 6分类15项检查
  private readonly checkCategories = {
    structure: ['开头', '承接', '转折', '结尾'],
    pacing: ['冲突密度', '信息密度', '拖沓度'],
    character: ['主角动机', '人物声音', '行为合理性'],
    coolPoints: ['爽点强度', '爽点兑现', '读者奖励'],
    commercial: ['题材匹配', '平台风格', '留存潜力'],
    serialization: ['Hook', '伏笔', '后续期待']
  };

  constructor(aiGateway: AIGateway, modelId?: string) {
    this.aiGateway = aiGateway;
    this.modelId = modelId || 'gpt-4';
  }

  /**
   * 执行编辑检查
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    try {
      const content = input.previousOutput || '';
      const prompt = this.buildPrompt(content, input.context);

      const result = await this.aiGateway.chat({
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        model: this.modelId,
        temperature: 0.3,
        maxTokens: 2500,
        metadata: {
          agentType: 'deep_editor',
          projectId: input.context.projectId,
          chapterId: input.context.chapterId
        }
      });

      const analysis = this.parseAnalysis(result.content);
      const score = this.calculateEditorScore(analysis);

      return {
        success: true,
        content: result.content,
        metadata: {
          analysis,
          editorScore: score,
          model: result.model,
          usage: result.usage
        },
        issues: analysis.issues,
        suggestions: analysis.suggestions,
        nextStep: 'auditing'
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        issues: [error instanceof Error ? error.message : 'Unknown error'],
        nextStep: 'deep_editing'
      };
    }
  }

  private getSystemPrompt(): string {
    return `你是一位资深的网文编辑，熟悉番茄、起点等平台的商业规则。
你的任务是从"商业化"角度分析章节，评估其市场潜力。

检查维度（6分类15项）：
1. 结构（开头、承接、转折、结尾）
2. 节奏（冲突密度、信息密度、拖沓度）
3. 人物（主角动机、人物声音、行为合理性）
4. 爽点（爽点强度、爽点兑现、读者奖励）
5. 商业性（题材匹配、平台风格、留存潜力）
6. 连载性（Hook、伏笔、后续期待）

输出格式：
一、编辑评分（1-100）
二、结构问题
三、节奏问题
四、商业性问题
五、留存风险
六、修改建议
七、是否建议重写（是/否）`;
  }

  private buildPrompt(content: string, context: CreationContext): string {
    return `请从商业编辑视角分析以下章节：

## 小说信息
- 类型：${context.genre}
- 目标平台：${context.writingStyle?.includes('起点') ? '起点' : '番茄'}
- 叙事视角：${context.perspective}

## 章节内容
${content}

请输出编辑评审意见。`;
  }

  private parseAnalysis(content: string): {
    score: number;
    structureIssues: string[];
    pacingIssues: string[];
    commercialIssues: string[];
    retentionRisks: string[];
    issues: string[];
    suggestions: string[];
    shouldRewrite: boolean;
  } {
    const scoreMatch = content.match(/编辑评分[（(]?\s*(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 70;

    return {
      score,
      structureIssues: this.extractSection(content, '结构问题'),
      pacingIssues: this.extractSection(content, '节奏问题'),
      commercialIssues: this.extractSection(content, '商业性问题'),
      retentionRisks: this.extractSection(content, '留存风险'),
      issues: [],
      suggestions: this.extractSection(content, '修改建议'),
      shouldRewrite: content.includes('建议重写') && content.includes('是')
    };
  }

  private extractSection(content: string, keyword: string): string[] {
    const regex = new RegExp(`${keyword}[^\n]*\\n([\\s\\S]*?)(?=[一二三四五六七八九十]+、|$)`, 'i');
    const match = content.match(regex);
    if (!match) return [];

    return match[1]
      .split('\n')
      .map(s => s.replace(/^[-•·]\s*/, '').trim())
      .filter(s => s.length > 0);
  }

  private calculateEditorScore(analysis: ReturnType<typeof this.parseAnalysis>): number {
    let score = analysis.score;
    
    // 扣分项
    score -= analysis.structureIssues.length * 3;
    score -= analysis.pacingIssues.length * 4;
    score -= analysis.commercialIssues.length * 5;
    score -= analysis.retentionRisks.length * 6;

    return Math.max(0, Math.min(100, score));
  }
}
