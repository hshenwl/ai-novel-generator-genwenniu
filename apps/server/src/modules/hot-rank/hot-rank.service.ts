import { Injectable } from '@nestjs/common';
import { EngineService } from '../engine/engine.service';

const PLATFORM_INFO: Record<string, string> = {
  fanqie: '番茄小说',
  qidian: '起点中文网',
  qimao: '七猫小说',
};

const ANALYSIS_INFO: Record<string, string> = {
  genre_trend: '热门题材分析',
  title_pattern: '标题特征分析',
  intro_pattern: '简介特征分析',
  character_type: '主角特点分析',
  cool_point: '爽点结构分析',
  hook_structure: 'Hook结构分析',
};

const SYSTEM_PROMPT = `你是一位专业的网文市场分析师，擅长分析各大网文平台的热门榜单趋势。
你的分析应包含具体数据、百分比和可操作的创作建议。
分析必须基于你对当前网文市场的理解，不要编造具体书名。
输出格式使用清晰的中文结构化文本，包含编号列表和重点标注。`;

@Injectable()
export class HotRankService {
  constructor(private readonly engineService: EngineService) {}

  async analyze(platform: string, analysisType: string, model?: string): Promise<{ content: string; model: string; duration: number; usage: any }> {
    const gateway = this.engineService.getAIGateway();
    const platformName = PLATFORM_INFO[platform] || platform;
    const typeName = ANALYSIS_INFO[analysisType] || analysisType;

    const prompts: Record<string, string> = {
      genre_trend: `请分析${platformName}平台当前的热门题材趋势，包括：
1. 热门类型TOP5（含热度指数、典型标签、趋势方向）
2. 推荐创作方向（含差异化建议）
3. 标题特征示例（反差型/直接型/问句型各2个）`,

      title_pattern: `请分析${platformName}平台热门小说的标题特征，包括：
1. 高频关键词TOP10（含出现频率百分比）
2. 标题结构模板（至少4种）
3. 标题长度分析（最佳字数、含标点的点击率影响）`,

      intro_pattern: `请分析${platformName}平台高转化率小说简介的特征，包括：
1. 简介结构类型（含占比百分比，至少4种）
2. 简介最佳字数范围
3. 简介禁忌写法（含读者流失率数据）`,

      character_type: `请分析${platformName}平台最受欢迎的主角类型，包括：
1. 主角类型TOP5（含读者偏好百分比、核心特点）
2. 各类型适合的题材方向`,

      cool_point: `请分析${platformName}平台热门小说的爽点结构，包括：
1. 高频爽点类型（含出现频率、典型模式，至少4种）
2. 爽点密度建议（小爽点/大爽点/卷末高潮的章节间隔）`,

      hook_structure: `请分析${platformName}平台热门小说的Hook结构设计，包括：
1. 开篇Hook最佳类型（含转化率）
2. 章末Hook最佳类型（含追读率）
3. 长线Hook设计建议`,
    };

    const userPrompt = prompts[analysisType] || `请分析${platformName}平台的${typeName}趋势，提供详细的数据和创作建议。`;

    const result = await gateway.chat({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      model,
      temperature: 0.5,
      maxTokens: 4000,
      metadata: { agentType: 'hot_rank_analysis' },
    });

    return {
      content: result.content,
      model: result.model,
      duration: result.duration,
      usage: result.usage,
    };
  }
}
