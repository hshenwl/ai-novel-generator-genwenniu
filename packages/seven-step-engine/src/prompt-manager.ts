// ============================================================
// Prompt模板管理器 — 从外部文件加载Agent提示词
// 解耦硬编码Prompt，支持运行时热加载规则文件
// ============================================================

import * as fs from 'fs';
import * as path from 'path';

/** 规则文件映射 */
const RULE_FILES: Record<string, string> = {
  shared: 'shared.md',
  planner: 'planner.md',
  writer: 'writer.md',
  deepreader: 'deepreader.md',
  deepeditor: 'deepeditor.md',
  auditor: 'auditor.md',
  reviser: 'reviser.md',
  settler: 'settler.md',
};

export class PromptManager {
  private cache: Map<string, string> = new Map();
  private rulesDir: string;

  constructor(rulesDir?: string) {
    // 默认搜索路径：1) 传入路径 2) resources/rules 3) ../../resources/rules 4) ../../../resources/rules
    this.rulesDir = rulesDir || this.findRulesDir();
  }

  /**
   * 获取规则内容（缓存）
   */
  getRule(name: string): string {
    const key = name.toLowerCase();
    if (this.cache.has(key)) return this.cache.get(key)!;

    const filename = RULE_FILES[key];
    if (!filename) {
      console.warn(`[PromptManager] 未知规则: ${name}`);
      return '';
    }

    const filePath = path.join(this.rulesDir, filename);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      this.cache.set(key, content);
      return content;
    } catch {
      console.warn(`[PromptManager] 规则文件未找到: ${filePath}`);
      return '';
    }
  }

  /**
   * 构建完整系统提示：共享规则 + 当前Agent规则
   */
  buildSystemPrompt(agentName: string, extra?: string): string {
    const parts: string[] = [];

    const shared = this.getRule('shared');
    if (shared) parts.push(shared);

    const agentRule = this.getRule(agentName);
    if (agentRule) parts.push(agentRule);

    if (extra) parts.push(extra);

    return parts.join('\n\n---\n\n');
  }

  /**
   * 刷新缓存（重新读取文件）
   */
  refresh(): void {
    this.cache.clear();
  }

  /**
   * 设置规则目录
   */
  setRulesDir(dir: string): void {
    this.rulesDir = dir;
    this.refresh();
  }

  private findRulesDir(): string {
    const candidates = [
      path.resolve(process.cwd(), 'resources/rules'),
      path.resolve(process.cwd(), '../../resources/rules'),
      path.resolve(process.cwd(), '../../../resources/rules'),
      path.resolve(__dirname, '../../../../resources/rules'),
      path.resolve(__dirname, '../../resources/rules'),
    ];
    for (const dir of candidates) {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        // 验证是否包含至少一个规则文件
        for (const key of Object.keys(RULE_FILES)) {
          if (fs.existsSync(path.join(dir, RULE_FILES[key]))) {
            return dir;
          }
        }
      }
    }
    // 最后兜底
    return path.resolve(process.cwd(), 'resources/rules');
  }
}

/** 单例 */
export const promptManager = new PromptManager();
