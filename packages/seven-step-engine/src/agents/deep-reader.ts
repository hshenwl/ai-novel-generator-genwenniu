// ============================================================
// 七步创作引擎 - DeepReader 深度读者
// ============================================================

import { AgentInput, AgentOutput, CreationContext } from '../types';
import type { AIGateway } from '@ai-novel/ai-gateway';

/**
 * DeepReader - 深度读者
 * 从读者视角检查代入感、爽感、期待感
 */
export class DeepReader {
  private aiGateway: AIGateway;
  private modelId: string;

  constructor(aiGateway: AIGateway, modelId?: string) {
    this.aiGateway = aiGateway;
    this.modelId = modelId || 'gpt-4';
  }

  /**
   * 执行读者检查
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
        temperature: 0.3,  // 评估需要稳定
        maxTokens: 2000,
        metadata: {
          agentType: 'deep_reader',
          projectId: input.context.projectId,
          chapterId: input.context.chapterId
        }
      });

      const analysis = this.parseAnalysis(result.content);
      const score = this.calculateReaderScore(analysis);

      return {
        success: true,
        content: result.content,
        metadata: {
          analysis,
          readerScore: score,
          model: result.model,
          usage: result.usage
        },
        issues: analysis.issues,
        suggestions: analysis.suggestions,
        nextStep: score >= 70 ? 'deep_editing' : 'deep_editing'  // 都进入编辑检查
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        issues: [error instanceof Error ? error.message : 'Unknown error'],
        nextStep: 'deep_reading'
      };
    }
  }

  private getSystemPrompt(): string {
    return `你是一位资深的网文读者，阅读经验丰富，对番茄、起点等平台的小说非常熟悉。
你的任务是从"读者体验"角度分析章节内容，给出真实、直接的反馈。

关注重点：
1. 代入感 - 是否能让你身临其境
2. 爽感 - 是否有即时的情绪满足
3. 期待感 - 是否想继续看下一章
4. 阅读阻滞 - 是否有让读者卡住的地方
5. AI味 - 是否有明显的AI生成痕迹

输出格式：
一、继续阅读意愿评分（1-10）
二、最吸引你的地方
三、最劝退的地方
四、代入感问题
五、爽点问题
六、Hook问题
七、人物声音诊断
八、AI味诊断
九、建议修改优先级`;
  }

  private buildPrompt(content: string, context: CreationContext): string {
    return `请从读者视角分析以下章节内容：

## 小说信息
- 类型：${context.genre}
- 叙事视角：${context.perspective}
- 风格：${context.writingStyle || '番茄风'}

## 章节内容
${content}

请给出你的真实感受和改进建议。`;
  }

  private parseAnalysis(content: string): {
    continueReadingScore: number;
    attractions: string[];
    turnoffs: string[];
    immersionIssues: string[];
    coolPointIssues: string[];
    hookIssues: string[];
    characterVoiceIssues: string[];
    aiFlavorIssues: string[];
    issues: string[];
    suggestions: string[];
  } {
    // 简单解析，实际需要更复杂的逻辑
    const scoreMatch = content.match(/继续阅读意愿评分[（(]?\s*(\d+)/);
    const continueReadingScore = scoreMatch ? parseInt(scoreMatch[1]) : 7;

    return {
      continueReadingScore,
      attractions: this.extractSection(content, '最吸引'),
      turnoffs: this.extractSection(content, '最劝退'),
      immersionIssues: this.extractSection(content, '代入感'),
      coolPointIssues: this.extractSection(content, '爽点'),
      hookIssues: this.extractSection(content, 'Hook'),
      characterVoiceIssues: this.extractSection(content, '人物声音'),
      aiFlavorIssues: this.extractSection(content, 'AI味'),
      issues: [],
      suggestions: this.extractSection(content, '建议')
    };
  }

  private extractSection(content: string, keyword: string): string[] {
    const regex = new RegExp(`[一二三四五六七八九十]+、.*${keyword}[^\\n]*\\n([\\s\\S]*?)(?=[一二三四五六七八九十]+、|$)`, 'i');
    const match = content.match(regex);
    if (!match) return [];
    
    return match[1]
      .split('\n')
      .map(s => s.replace(/^[-•·]\s*/, '').trim())
      .filter(s => s.length > 0);
  }

  private calculateReaderScore(analysis: ReturnType<typeof this.parseAnalysis>): number {
    let score = analysis.continueReadingScore * 10;  // 基础分
    
    // 扣分项
    score -= analysis.turnoffs.length * 5;
    score -= analysis.immersionIssues.length * 3;
    score -= analysis.aiFlavorIssues.length * 4;
    
    return Math.max(0, Math.min(100, score));
  }
}
