// ============================================================
// 七步创作引擎 - Settler 沉淀器
// ============================================================

import { AgentInput, AgentOutput, CreationContext } from '../types';
import type { AIGateway } from '@ai-novel/ai-gateway';

/** 提取的数据结构 */
interface ExtractedData {
  chapterSummary: string;
  newCharacters: Array<{ name: string; role: string; description: string }>;
  characterChanges: Array<{ characterId: string; characterName: string; changeType: string; description: string }>;
  newOrganizations: Array<{ name: string; type: string }>;
  newForeshadows: Array<{ name: string; type: string; description: string }>;
  resolvedForeshadows: Array<{ foreshadowId: string; foreshadowName: string }>;
  hooks: Array<{ type: string; content: string; strength: number }>;
  worldSettingAdditions: string[];
  appearingCharacters: string[];
}

/**
 * Settler - 沉淀器
 * 将定稿内容同步入库，更新角色、伏笔、Hook等结构化数据
 */
export class Settler {
  private aiGateway?: AIGateway;
  private modelId: string;

  constructor(aiGateway?: AIGateway, modelId?: string) {
    this.aiGateway = aiGateway;
    this.modelId = modelId || 'gpt-4';
  }
  /**
   * 执行沉淀入库
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    try {
      const content = input.previousOutput || '';
      const context = input.context;

      // 解析章节内容，提取结构化数据
      const extractedData = await this.extractData(content, context);

      // 生成同步记录
      const syncRecord = this.generateSyncRecord(extractedData, context);

      return {
        success: true,
        content: this.formatSettlementReport(syncRecord),
        metadata: {
          extractedData,
          syncRecord,
          chapterId: context.chapterId
        },
        nextStep: 'settled'  // 完成
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        issues: [error instanceof Error ? error.message : 'Unknown error'],
        nextStep: 'settling'
      };
    }
  }

  /**
   * 从内容中提取结构化数据
   */
  private async extractData(content: string, context: CreationContext) {
    return {
      // 章节摘要
      chapterSummary: this.extractSummary(content),
      
      // 新角色
      newCharacters: this.extractNewCharacters(content, context.characters),
      
      // 角色状态变化
      characterChanges: await this.extractCharacterChanges(content, context.characters),

      // 新组织
      newOrganizations: await this.extractNewOrganizations(content, context.organizations),
      
      // 新伏笔
      newForeshadows: this.extractNewForeshadows(content),
      
      // 回收伏笔
      resolvedForeshadows: this.extractResolvedForeshadows(content, context.foreshadows),
      
      // Hook记录
      hooks: this.extractHooks(content),
      
      // 世界观新增
      worldSettingAdditions: await this.extractWorldSettingAdditions(content),
      
      // 出场角色列表
      appearingCharacters: this.extractAppearingCharacters(content, context.characters)
    };
  }

  /**
   * 提取章节摘要
   */
  private extractSummary(content: string): string {
    // 取前500字作为摘要
    const cleanContent = content.replace(/[#*\n]/g, ' ').trim();
    return cleanContent.slice(0, 500) + (cleanContent.length > 500 ? '...' : '');
  }

  /**
   * 提取新角色
   */
  private extractNewCharacters(content: string, existingCharacters: CreationContext['characters']): Array<{
    name: string;
    role: string;
    description: string;
  }> {
    const newChars: Array<{ name: string; role: string; description: string }> = [];
    
    // 简单检测：查找引号内的名字
    const nameMatches = content.match(/["「]([^"「」]+)["」]/g);
    if (nameMatches) {
      const existingNames = new Set(existingCharacters.map(c => c.name));
      
      for (const match of nameMatches) {
        const name = match.slice(1, -1);
        if (name.length >= 2 && name.length <= 4 && !existingNames.has(name)) {
          // 可能是新角色名
          if (!newChars.some(c => c.name === name)) {
            newChars.push({
              name,
              role: '待确定',
              description: '待补充'
            });
          }
        }
      }
    }
    
    return newChars.slice(0, 5); // 最多返回5个
  }

  /**
   * 提取角色状态变化 — LLM辅助提取
   */
  private async extractCharacterChanges(content: string, characters: CreationContext['characters']): Promise<Array<{
    characterId: string;
    characterName: string;
    changeType: string;
    description: string;
  }>> {
    if (!this.aiGateway || characters.length === 0) return [];

    try {
      const result = await this.aiGateway.chat({
        messages: [
          { role: 'system', content: '你是一个小说角色状态分析器。从正文中提取角色变化，输出JSON数组。' },
          { role: 'user', content: `正文:\n${content.slice(0, 3000)}\n\n角色列表:${characters.map(c => `${c.id}:${c.name}`).join(',')}\n\n输出JSON: [{characterId,characterName,changeType,description}]` }
        ],
        model: this.modelId,
        temperature: 0.3,
        maxTokens: 2000,
      });
      const parsed = JSON.parse(result.content);
      return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
    } catch {
      return [];
    }
  }

  /**
   * 提取新组织 — LLM辅助提取
   */
  private async extractNewOrganizations(content: string, existingOrgs: CreationContext['organizations']): Promise<Array<{
    name: string;
    type: string;
  }>> {
    if (!this.aiGateway) return [];
    try {
      const result = await this.aiGateway.chat({
        messages: [
          { role: 'system', content: '你是一个小说组织检测器。从正文中提取新出现的组织/势力，输出JSON数组。' },
          { role: 'user', content: `正文最后2000字:\n${content.slice(-2000)}\n\n已有组织:${existingOrgs.map(o => o.name).join(',')}\n\n输出JSON: [{name,type}]` }
        ],
        model: this.modelId, temperature: 0.3, maxTokens: 1000,
      });
      const parsed = JSON.parse(result.content);
      return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    } catch { return []; }
  }

  /**
   * 提取新伏笔
   */
  private extractNewForeshadows(content: string): Array<{
    name: string;
    type: string;
    description: string;
  }> {
    // 检测伏笔关键词
    const foreshadowKeywords = ['秘密', '隐藏', '神秘', '未解', '疑惑'];
    const foreshadows: Array<{ name: string; type: string; description: string }> = [];
    
    for (const keyword of foreshadowKeywords) {
      if (content.includes(keyword)) {
        foreshadows.push({
          name: `${keyword}相关`,
          type: '待分类',
          description: `文中出现"${keyword}"相关内容，可能需要设置伏笔`
        });
      }
    }
    
    return foreshadows.slice(0, 3);
  }

  /**
   * 提取回收伏笔
   */
  private extractResolvedForeshadows(content: string, foreshadows: CreationContext['foreshadows']): Array<{
    foreshadowId: string;
    foreshadowName: string;
  }> {
    const resolved: Array<{ foreshadowId: string; foreshadowName: string }> = [];
    
    // 检查待回收伏笔是否在内容中出现
    for (const f of foreshadows.filter(f => f.status === 'planted')) {
      if (content.includes(f.name)) {
        resolved.push({
          foreshadowId: f.id,
          foreshadowName: f.name
        });
      }
    }
    
    return resolved;
  }

  /**
   * 提取Hook
   */
  private extractHooks(content: string): Array<{
    type: string;
    content: string;
    strength: number;
  }> {
    const hooks: Array<{ type: string; content: string; strength: number }> = [];
    
    // 提取开篇Hook
    const firstParagraph = content.split('\n\n')[0] || '';
    if (firstParagraph.length > 0) {
      hooks.push({
        type: '开篇Hook',
        content: firstParagraph.slice(0, 100),
        strength: this.calculateHookStrength(firstParagraph)
      });
    }
    
    // 提取章末Hook
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    const lastParagraph = paragraphs[paragraphs.length - 1] || '';
    if (lastParagraph.length > 0) {
      hooks.push({
        type: '章末Hook',
        content: lastParagraph.slice(0, 100),
        strength: this.calculateHookStrength(lastParagraph)
      });
    }
    
    return hooks;
  }

  /**
   * 计算Hook强度
   */
  private calculateHookStrength(text: string): number {
    const hookKeywords = ['突然', '却', '没想到', '不料', '然而', '就在这时', '这时', '震惊', '惊讶'];
    let score = 5; // 基础分
    
    for (const keyword of hookKeywords) {
      if (text.includes(keyword)) {
        score += 1;
      }
    }
    
    return Math.min(10, score);
  }

  /**
   * 提取世界观新增
   */
  private async extractWorldSettingAdditions(content: string): Promise<string[]> {
    if (!this.aiGateway) return [];
    try {
      const result = await this.aiGateway.chat({
        messages: [
          { role: 'system', content: '从正文中提取新增的世界观设定信息，如修炼等级、地理描述、势力格局等。按条目输出，每行一条。' },
          { role: 'user', content: `正文:\n${content.slice(0, 4000)}` }
        ],
        model: this.modelId, temperature: 0.3, maxTokens: 1500,
      });
      return result.content.split('\n').filter(l => l.trim().length > 0).slice(0, 5);
    } catch { return []; }
  }

  /**
   * 提取出场角色
   */
  private extractAppearingCharacters(content: string, characters: CreationContext['characters']): string[] {
    return characters
      .filter(c => content.includes(c.name))
      .map(c => c.id);
  }

  /**
   * 生成同步记录
   */
  private generateSyncRecord(extractedData: ExtractedData, context: CreationContext) {
    return {
      chapterId: context.chapterId,
      summary: extractedData.chapterSummary,
      updates: {
        characters: {
          new: extractedData.newCharacters,
          changes: extractedData.characterChanges,
          appearing: extractedData.appearingCharacters
        },
        organizations: {
          new: extractedData.newOrganizations
        },
        foreshadows: {
          new: extractedData.newForeshadows,
          resolved: extractedData.resolvedForeshadows
        },
        hooks: extractedData.hooks,
        worldSetting: extractedData.worldSettingAdditions
      },
      timestamp: new Date()
    };
  }

  /**
   * 格式化沉淀报告
   */
  private formatSettlementReport(syncRecord: ReturnType<typeof this.generateSyncRecord>): string {
    return `# 章节沉淀报告

## 一、章节入库状态
- 章节ID: ${syncRecord.chapterId || '新建'}
- 入库时间: ${syncRecord.timestamp.toISOString()}

## 二、角色变更记录
### 新角色
${syncRecord.updates.characters.new.map(c => `- ${c.name}（${c.role}）`).join('\n') || '无'}

### 出场角色
${syncRecord.updates.characters.appearing.length} 个角色出场

## 三、组织变更记录
${syncRecord.updates.organizations.new.map(o => `- ${o.name}`).join('\n') || '无变更'}

## 四、伏笔变更记录
### 新伏笔
${syncRecord.updates.foreshadows.new.map(f => `- ${f.name}: ${f.description}`).join('\n') || '无'}

### 已回收
${syncRecord.updates.foreshadows.resolved.map(f => `- ${f.foreshadowName}`).join('\n') || '无'}

## 五、Hook记录
${syncRecord.updates.hooks.map(h => `- ${h.type}: 强度${h.strength}/10`).join('\n') || '无'}

## 六、下一章建议
- 继续追踪未回收伏笔
- 保持当前节奏和风格
`;
  }
}
