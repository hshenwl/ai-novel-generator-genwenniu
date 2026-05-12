// ============================================================
// 七步创作引擎 - Auditor 审核器
// ============================================================

import { AgentInput, AgentOutput, AuditReport, AuditResult, CreationContext, WorkflowStep } from '../types';
import { PromptManager } from '../prompt-manager';
import type { AIGateway } from '@ai-novel/ai-gateway';

/**
 * Auditor - 审核器
 * 执行20维度质量审核，判断是否通过
 */
export class Auditor {
  private aiGateway: AIGateway;
  private modelId: string;
  private promptManager: PromptManager;

  // 20维度审核标准
  private readonly dimensions = [
    { id: 1, name: '章纲符合度', weight: 10 },
    { id: 2, name: '前后连贯性', weight: 8 },
    { id: 3, name: '视角一致性', weight: 8 },
    { id: 4, name: '人设一致性', weight: 10 },
    { id: 5, name: '人物声音', weight: 8 },
    { id: 6, name: '主角代入感', weight: 10 },
    { id: 7, name: '核心冲突', weight: 12 },
    { id: 8, name: '情绪曲线', weight: 8 },
    { id: 9, name: '爽点强度', weight: 10 },
    { id: 10, name: 'Hook强度', weight: 10 },
    { id: 11, name: '伏笔管理', weight: 6 },
    { id: 12, name: '世界观一致性', weight: 6 },
    { id: 13, name: '节奏控制', weight: 8 },
    { id: 14, name: '信息密度', weight: 6 },
    { id: 15, name: '对白自然度', weight: 8 },
    { id: 16, name: 'AI痕迹', weight: 10 },
    { id: 17, name: '文风一致性', weight: 6 },
    { id: 18, name: '商业可读性', weight: 8 },
    { id: 19, name: '字数达标', weight: 4 },
    { id: 20, name: '风险项', weight: 10 }
  ];

  constructor(aiGateway: AIGateway, modelId?: string, promptManager?: PromptManager) {
    this.aiGateway = aiGateway;
    this.modelId = modelId || 'gpt-4';
    this.promptManager = promptManager || new PromptManager();
  }

  /**
   * 执行审核
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
        temperature: 0.2,  // 审核需要稳定
        maxTokens: 3000,
        metadata: {
          agentType: 'auditor',
          projectId: input.context.projectId,
          chapterId: input.context.chapterId
        }
      });

      const report = this.parseReport(result.content);
      const auditResult = this.determineResult(report);

      return {
        success: true,
        content: result.content,
        metadata: {
          report,
          auditResult,
          model: result.model,
          usage: result.usage
        },
        issues: report.issues.map(i => `[${i.severity}] ${i.dimension}: ${i.description}`),
        suggestions: report.suggestions,
        nextStep: this.getNextStep(auditResult)
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        issues: [error instanceof Error ? error.message : 'Unknown error'],
        nextStep: 'auditing'
      };
    }
  }

  private getSystemPrompt(): string {
    const extra = [
      '你是一位专业的网文质量审核员，负责执行20维度质量审核。',
      '你的审核必须严格、具体、有依据，不允许空泛结论。',
      '',
      '审核维度：',
      '1. 章纲符合度 - 是否完成章纲要求',
      '2. 前后连贯性 - 是否承接前文',
      '3. 视角一致性 - 是否保持第一人称或第三人称',
      '4. 人设一致性 - 角色是否崩坏',
      '5. 人物声音 - 不同角色说话是否有区分',
      '6. 主角代入感 - 主角感受是否足够直接',
      '7. 核心冲突 - 本章冲突是否明确',
      '8. 情绪曲线 - 情绪是否有起伏',
      '9. 爽点强度 - 是否有读者奖励',
      '10. Hook强度 - 开头和结尾是否抓人',
      '11. 伏笔管理 - 是否正确埋设或回收',
      '12. 世界观一致性 - 设定是否冲突',
      '13. 节奏控制 - 是否拖沓或跳跃',
      '14. 信息密度 - 是否废话过多或信息不足',
      '15. 对白自然度 - 对白是否像真人',
      '16. AI痕迹 - 是否有明显AI腔',
      '17. 文风一致性 - 是否符合指定写作风格',
      '18. 商业可读性 - 是否符合目标平台读者偏好',
      '19. 字数达标 - 是否满足字数要求',
      '20. 风险项 - 敏感、重复、逻辑硬伤等',
      '',
      '审核结果：',
      '- PASS: 通过，可进入Settler',
      '- MINOR_REVISE: 轻度修改，进入Reviser',
      '- MAJOR_REVISE: 重大修改，进入Reviser后复审',
      '- REWRITE: 建议退回Writer重写',
      '- BLOCKED: 存在严重冲突，退回Planner重新规划',
      '',
      '输出格式（JSON）：',
      '{',
      '  "totalScore": 数字,',
      '  "dimensionScores": [{ "dimension": "维度名", "score": 分数, "maxScore": 10, "comment": "评论" }],',
      '  "issues": [{ "dimension": "维度", "severity": "minor/major/critical", "location": "位置", "description": "描述", "suggestion": "建议" }],',
      '  "suggestions": ["总体建议"],',
      '  "result": "PASS/MINOR_REVISE/MAJOR_REVISE/REWRITE/BLOCKED"',
      '}',
    ].join('\n');

    return this.promptManager.buildSystemPrompt('auditor', extra);
  }

  private buildPrompt(content: string, context: CreationContext): string {
    return `请执行20维度质量审核：

## 小说信息
- 类型：${context.genre}
- 叙事视角：${context.perspective}
- 风格：${context.writingStyle || '番茄风第一人称'}

## 章纲要求
${context.chapterOutline || '暂无章纲'}

## 角色信息
${context.characters.map(c => `${c.name}（${c.role}）`).join(', ')}

## 待审核内容
${content}

请输出JSON格式的审核报告。`;
  }

  private parseReport(content: string): AuditReport {
    try {
      // 尝试解析JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          totalScore: parsed.totalScore || 0,
          dimensionScores: parsed.dimensionScores || [],
          issues: parsed.issues || [],
          suggestions: parsed.suggestions || [],
          result: this.parseResult(parsed.result)
        };
      }
    } catch (e) {
      // JSON解析失败，使用默认值
    }

    // 从文本中提取
    const scoreMatch = content.match(/总分[：:]\s*(\d+)/);
    const totalScore = scoreMatch ? parseInt(scoreMatch[1]) : 70;

    return {
      totalScore,
      dimensionScores: this.dimensions.map(d => ({
        dimension: d.name,
        score: Math.min(10, Math.round(totalScore / 10)),
        maxScore: 10,
        comment: ''
      })),
      issues: [],
      suggestions: [],
      result: this.determineResultFromScore(totalScore)
    };
  }

  private parseResult(result?: string): AuditResult {
    const validResults: AuditResult[] = ['pass', 'minor_revise', 'major_revise', 'rewrite', 'blocked'];
    const normalized = result?.toLowerCase().replace(/-/g, '_') as AuditResult;
    return validResults.includes(normalized) ? normalized : 'minor_revise';
  }

  private determineResult(report: AuditReport): AuditResult {
    // 检查是否有critical问题
    const criticalIssues = report.issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      // 如果有世界观冲突或人设崩坏，退回Planner
      if (criticalIssues.some(i => i.dimension === '世界观一致性' || i.dimension === '人设一致性')) {
        return 'blocked';
      }
      return 'rewrite';
    }

    // 根据分数判断
    if (report.totalScore >= 80) return 'pass';
    if (report.totalScore >= 60) return 'minor_revise';
    if (report.totalScore >= 40) return 'major_revise';
    return 'rewrite';
  }

  private determineResultFromScore(score: number): AuditResult {
    if (score >= 80) return 'pass';
    if (score >= 60) return 'minor_revise';
    if (score >= 40) return 'major_revise';
    return 'rewrite';
  }

  private getNextStep(result: AuditResult): WorkflowStep {
    switch (result) {
      case 'pass':
        return 'settling';
      case 'minor_revise':
      case 'major_revise':
        return 'revising';
      case 'rewrite':
        return 'writing';
      case 'blocked':
        return 'planning';
      default:
        return 'revising';
    }
  }
}