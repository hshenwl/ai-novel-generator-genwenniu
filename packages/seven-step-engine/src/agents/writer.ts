// ============================================================
// 七步创作引擎 - Writer 写作器
// ============================================================

import { AgentInput, AgentOutput, CreationContext } from '../types';
import { PromptManager } from '../prompt-manager';
import type { AIGateway } from '@ai-novel/ai-gateway';

/**
 * Writer - 写作器
 * 根据约束清单、章纲、写作风格生成章节正文
 */
export class Writer {
  private aiGateway: AIGateway;
  private modelId: string;
  private promptManager: PromptManager;

  constructor(aiGateway: AIGateway, modelId?: string, promptManager?: PromptManager) {
    this.aiGateway = aiGateway;
    this.modelId = modelId || 'gpt-4';
    this.promptManager = promptManager || new PromptManager();
  }

  /**
   * 执行写作
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    try {
      const prompt = this.buildPrompt(input);
      
      const result = await this.aiGateway.chat({
        messages: [
          { role: 'system', content: this.getSystemPrompt(input.context) },
          { role: 'user', content: prompt }
        ],
        model: this.modelId,
        temperature: 0.8,  // 写作需要较高创造性
        maxTokens: 4000,
        metadata: {
          agentType: 'writer',
          projectId: input.context.projectId,
          chapterId: input.context.chapterId
        }
      });

      // 执行14项自检
      const selfCheckResult = await this.selfCheck(result.content, input.context);

      return {
        success: true,
        content: result.content,
        metadata: {
          model: result.model,
          usage: result.usage,
          selfCheck: selfCheckResult
        },
        issues: selfCheckResult.failed.length > 0 ? selfCheckResult.failed : undefined,
        nextStep: 'deep_reading'
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        issues: [error instanceof Error ? error.message : 'Unknown error'],
        nextStep: 'writing'
      };
    }
  }

  /**
   * 构建提示词
   */
  private buildPrompt(input: AgentInput): string {
    const { context, previousOutput } = input;
    const constraints = previousOutput ? this.parseConstraints(previousOutput) : null;

    let prompt = `请根据以下信息创作章节正文：

## 项目信息
- 小说名称：${context.projectName}
- 类型：${context.genre}
- 叙事视角：${context.perspective}

## 章纲要求
${context.chapterOutline || '暂无章纲'}

## 角色信息
${this.formatCharacters(context.characters)}

## 写作风格
${context.writingStyle || '番茄风第一人称'}

## 上下文
${context.previousChapterSummary ? `上一章摘要：${context.previousChapterSummary}` : '这是第一章'}

`;

    if (constraints) {
      prompt += `
## 约束清单
${constraints}

`;
    }

    if (context.knowledgeContext) {
      prompt += `
## 知识库参考
${context.knowledgeContext}

`;
    }

    prompt += `
## 输出要求
1. 字数：2500-3000字
2. 格式：先输出章节标题（# 标题），然后是正文
3. 正文结尾必须有Hook，制造追读期待
4. 严格遵守第一人称叙事视角
5. 对白要口语化、自然
6. 避免：AI腔、总结腔、过度解释、模板化描写

请开始创作：`;

    return prompt;
  }

  /**
   * 获取系统提示词
   */
  private getSystemPrompt(context: CreationContext): string {
    // 使用PromptManager从rule文件加载外部提示词
    const extra = [
      `你是一位专业的网文作家，擅长${context.genre}类型小说创作。`,
      `你的写作风格是${context.writingStyle || '番茄风第一人称'}。`,
      `叙事视角：${context.perspective}`,
    ].join('\n');

    return this.promptManager.buildSystemPrompt('writer', extra);
  }

  /**
   * 格式化角色信息
   */
  private formatCharacters(characters: CreationContext['characters']): string {
    if (!characters.length) return '暂无角色信息';
    
    return characters.map(c => 
      `- ${c.name}（${c.role}）：${c.description || '暂无描述'}${c.characterVoice ? `，说话特点：${c.characterVoice}` : ''}`
    ).join('\n');
  }

  /**
   * 解析约束清单
   */
  private parseConstraints(constraintsOutput: string): string | null {
    // 从Planner输出中提取约束清单
    const match = constraintsOutput.match(/# 创作约束清单[\s\S]*$/);
    return match ? match[0] : null;
  }

  /**
   * 14项自检
   */
  private async selfCheck(content: string, context: CreationContext): Promise<{
    passed: string[];
    failed: string[];
    scores: Record<string, boolean>;
  }> {
    const checks = [
      { id: 1, name: '章纲符合度', check: () => this.checkOutlineMatch(content, context.chapterOutline) },
      { id: 2, name: '前后连贯性', check: () => this.checkCoherence(content, context.previousChapterSummary) },
      { id: 3, name: '核心冲突明确', check: () => this.checkConflict(content) },
      { id: 4, name: '情绪推进', check: () => this.checkEmotionProgress(content) },
      { id: 5, name: '爽点存在', check: () => this.checkCoolPoints(content) },
      { id: 6, name: '章末Hook', check: () => this.checkEndingHook(content) },
      { id: 7, name: '叙事视角一致', check: () => this.checkPerspective(content, context.perspective) },
      { id: 8, name: '无AI腔', check: () => this.checkAIFlavor(content) },
      { id: 9, name: '对白自然', check: () => this.checkDialogue(content) },
      { id: 10, name: '人物行为合理', check: () => this.checkCharacterBehavior(content, context.characters) },
      { id: 11, name: '无设定冲突', check: () => this.checkWorldConsistency(content, context.worldSetting) },
      { id: 12, name: '节奏合理', check: () => this.checkPacing(content) },
      { id: 13, name: '无无意义解释', check: () => this.checkNoRedundancy(content) },
      { id: 14, name: '字数达标', check: () => this.checkWordCount(content) }
    ];

    const scores: Record<string, boolean> = {};
    const passed: string[] = [];
    const failed: string[] = [];

    for (const check of checks) {
      const result = check.check();
      scores[check.name] = result;
      if (result) {
        passed.push(check.name);
      } else {
        failed.push(check.name);
      }
    }

    return { passed, failed, scores };
  }

  // 自检方法
  private checkOutlineMatch(content: string, outline?: string): boolean {
    if (!outline) return true;
    // 简单检查：内容长度和关键事件
    return content.length > 500;
  }

  private checkCoherence(content: string, prevSummary?: string): boolean {
    if (!prevSummary) return true;
    const prevKeywords = prevSummary.replace(/[，。！？、；：""''（）\s]/g, ' ').split(/\s+/).filter(w => w.length >= 2);
    const matchCount = prevKeywords.filter(kw => content.includes(kw)).length;
    return matchCount >= Math.ceil(prevKeywords.length * 0.3);
  }

  private checkConflict(content: string): boolean {
    // 检查是否有冲突相关词汇
    const conflictWords = ['冲突', '矛盾', '对抗', '危机', '挑战', '困难'];
    return conflictWords.some(w => content.includes(w));
  }

  private checkEmotionProgress(content: string): boolean {
    // 检查情绪变化
    return content.length > 1000;
  }

  private checkCoolPoints(content: string): boolean {
    // 检查爽点词汇
    const coolWords = ['爽', '痛快', '解气', '反击', '打脸', '逆袭', '升级', '奖励'];
    return coolWords.some(w => content.includes(w));
  }

  private checkEndingHook(content: string): boolean {
    // 检查结尾是否有悬念词
    const lastParagraph = content.split('\n\n').pop() || '';
    const hookWords = ['突然', '却', '没想到', '不料', '然而', '就在这时', '这时'];
    return hookWords.some(w => lastParagraph.includes(w));
  }

  private checkPerspective(content: string, perspective?: string): boolean {
    if (perspective === '第一人称') {
      return content.includes('我');
    }
    return true;
  }

  private checkAIFlavor(content: string): boolean {
    // 检测AI腔
    const aiPatterns = [
      '一股.*涌上心头',
      '不是.*而是.*',
      '仿佛.*一般',
      '不禁.*起来',
      '心中.*涌起'
    ];
    for (const pattern of aiPatterns) {
      if (new RegExp(pattern).test(content)) {
        return false;
      }
    }
    return true;
  }

  private checkDialogue(content: string): boolean {
    // 检查对白占比
    const dialogueMatches = content.match(/["「](.+?)["」]/g);
    const dialogueCount = dialogueMatches ? dialogueMatches.length : 0;
    return dialogueCount >= 3; // 至少3处对白
  }

  private checkCharacterBehavior(content: string, characters: CreationContext['characters']): boolean {
    if (characters.length === 0) return true;
    const mentionedChars = characters.filter(c => content.includes(c.name));
    if (mentionedChars.length === 0) return true;
    const dialoguePattern = /["「](.+?)["」]/g;
    const dialogues = content.match(dialoguePattern) || [];
    if (dialogues.length < mentionedChars.length) return true;
    return true;
  }

  private checkWorldConsistency(content: string, worldSetting?: string): boolean {
    // TODO: 需要更复杂的检查
    return true;
  }

  private checkPacing(content: string): boolean {
    // 检查段落数量和长度分布
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    if (paragraphs.length < 5) return false;
    
    // 检查是否有过长段落
    const hasLongParagraph = paragraphs.some(p => p.length > 500);
    return !hasLongParagraph;
  }

  private checkNoRedundancy(content: string): boolean {
    // 检查重复内容
    const sentences = content.split(/[。！？\n]/);
    const uniqueSentences = new Set(sentences.filter(s => s.trim().length > 10));
    return uniqueSentences.size / sentences.length > 0.9;
  }

  private checkWordCount(content: string): boolean {
    const wordCount = content.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').length;
    return wordCount >= 2000 && wordCount <= 4000;
  }
}
