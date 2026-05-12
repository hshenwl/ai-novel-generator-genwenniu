// ============================================================
// 七步创作引擎 - Reviser 修订器
// ============================================================

import { AgentInput, AgentOutput, CreationContext } from '../types';
import type { AIGateway } from '@ai-novel/ai-gateway';

/**
 * Reviser - 修订器
 * 根据审核意见修订正文，执行AI去味处理
 */
export class Reviser {
  private aiGateway: AIGateway;
  private modelId: string;

  // AI去味29种模式
  private readonly deFlavorModes = {
    sentence: [
      '去总结腔',
      '去排比腔',
      '去机械转折',
      '去掉"不是……而是……"',
      '去过度解释',
      '去万能形容词',
      '去模板化心理描写'
    ],
    narrative: [
      '增加即时动作',
      '增加主角感官',
      '增加现场细节',
      '减少旁白解释',
      '减少设定说明',
      '减少空泛议论',
      '增强场景压迫感'
    ],
    dialogue: [
      '对白口语化',
      '去除演讲式对白',
      '增加打断停顿反问',
      '增加人物专属说话习惯',
      '修复角色声音趋同'
    ],
    pacing: [
      '压缩拖沓段落',
      '前移冲突',
      '强化章末Hook',
      '强化爽点兑现',
      '减少无效过渡'
    ],
    style: [
      '强化第一人称代入',
      '强化"我"的情绪反应',
      '增强短句冲击力',
      '增强读者期待',
      '增强连续追读感'
    ]
  };

  constructor(aiGateway: AIGateway, modelId?: string) {
    this.aiGateway = aiGateway;
    this.modelId = modelId || 'gpt-4';
  }

  /**
   * 执行修订
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    try {
      const originalContent = input.previousOutput || '';
      const feedback = Array.isArray(input.feedback) ? input.feedback.join('\n\n---\n\n') : (input.feedback || '');
      const prompt = this.buildPrompt(originalContent, feedback, input.context);

      const result = await this.aiGateway.chat({
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        model: this.modelId,
        temperature: 0.7,
        maxTokens: 4000,
        metadata: {
          agentType: 'reviser',
          projectId: input.context.projectId,
          chapterId: input.context.chapterId
        }
      });

      const revisionRecord = this.parseRevisionRecord(result.content);

      return {
        success: true,
        content: revisionRecord.revisedContent,
        metadata: {
          originalContent,
          revisionRecord,
          model: result.model,
          usage: result.usage
        },
        issues: revisionRecord.remainingIssues,
        suggestions: revisionRecord.improvements,
        nextStep: 'auditing'  // 修订后需要复审
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        issues: [error instanceof Error ? error.message : 'Unknown error'],
        nextStep: 'revising'
      };
    }
  }

  private getSystemPrompt(): string {
    return `你是一位专业的网文编辑，擅长修订和润色。
你的任务是：
1. 根据审核意见修订正文
2. 去除AI痕迹，降低模板感
3. 强化Hook和爽点
4. 提升代入感和追读欲望

AI去味29种模式：
A. 句式去味：去总结腔、排比腔、机械转折、"不是...而是..."、过度解释、万能形容词、模板化心理
B. 叙事去味：增加即时动作、主角感官、现场细节；减少旁白解释、设定说明、空泛议论
C. 对白去味：口语化、去除演讲式、增加打断停顿、人物专属说话习惯、修复声音趋同
D. 节奏去味：压缩拖沓、前移冲突、强化Hook、强化爽点、减少无效过渡
E. 番茄风增强：强化第一人称代入、"我"的情绪反应、短句冲击力、读者期待、追读感

修订原则：
- 保持原有剧情走向
- 不改变核心设定
- 只优化表达方式
- 结尾必须强化Hook

输出格式：
## 修订后正文
[修订后的完整正文]

## 修订说明
- 修改项1
- 修改项2

## AI去味处理
- 处理项1
- 处理项2`;
  }

  private buildPrompt(content: string, feedback: string, context: CreationContext): string {
    return `请根据以下反馈修订章节内容：

## 原始内容
${content}

## 审核反馈
${feedback || '无具体反馈'}

## 写作风格
${context.writingStyle || '番茄风第一人称'}

## 修订重点
1. 根据反馈修改问题点
2. 执行AI去味处理
3. 强化章末Hook
4. 提升代入感和爽感

请输出修订后的内容和修订说明。`;
  }

  private parseRevisionRecord(content: string): {
    revisedContent: string;
    revisionNotes: string[];
    deFlavorApplied: string[];
    remainingIssues: string[];
    improvements: string[];
  } {
    // 提取修订后正文
    const contentMatch = content.match(/## 修订后正文\n([\s\S]*?)(?=##|$)/);
    const revisedContent = contentMatch ? contentMatch[1].trim() : content;

    // 提取修订说明
    const notesMatch = content.match(/## 修订说明\n([\s\S]*?)(?=##|$)/);
    const revisionNotes = notesMatch 
      ? notesMatch[1].split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace(/^-\s*/, ''))
      : [];

    // 提取AI去味处理
    const deFlavorMatch = content.match(/## AI去味处理\n([\s\S]*?)(?=##|$)/);
    const deFlavorApplied = deFlavorMatch
      ? deFlavorMatch[1].split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace(/^-\s*/, ''))
      : [];

    return {
      revisedContent,
      revisionNotes,
      deFlavorApplied,
      remainingIssues: [],
      improvements: revisionNotes
    };
  }

  /**
   * 获取所有去味模式
   */
  getDeFlavorModes(): Record<string, string[]> {
    return this.deFlavorModes;
  }
}
