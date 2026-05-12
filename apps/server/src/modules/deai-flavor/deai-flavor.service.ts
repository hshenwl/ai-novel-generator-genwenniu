import { Injectable } from '@nestjs/common';
import { getAllModes, getModesByCategory, getModesByIntensity, detectIssues } from './deai-flavor-modes';
import { FlavorCategory, FlavorIntensity, FlavorMode, FlavorExecutionInput, FlavorExecutionResult } from './deai-flavor.types';

@Injectable()
export class DeAIFlavorService {
  getAllModes(): FlavorMode[] {
    return getAllModes();
  }

  getModesByCategory(category: FlavorCategory): FlavorMode[] {
    return getModesByCategory(category);
  }

  getModesByIntensity(intensity: FlavorIntensity): FlavorMode[] {
    return getModesByIntensity(intensity);
  }

  getModeSummary(): Record<string, { count: number; modes: string[] }> {
    const categories: FlavorCategory[] = ['A', 'B', 'C', 'D', 'E'];
    const result: Record<string, { count: number; modes: string[] }> = {};
    for (const cat of categories) {
      const modes = getModesByCategory(cat);
      result[cat] = {
        count: modes.length,
        modes: modes.map(m => `${m.id}: ${m.name}`),
      };
    }
    return result;
  }

  detectOnly(input: FlavorExecutionInput): FlavorExecutionResult {
    const modes = this.resolveModes(input.intensity, input.categories);
    const issues = detectIssues(input.content, modes);

    return {
      originalContent: input.content,
      processedContent: input.content,
      appliedModes: [],
      detectedIssues: issues.map(i => ({
        mode: i.mode.name,
        category: i.mode.category,
        matches: i.matches,
      })),
      summary: this.buildSummary(issues.map(i => ({ mode: i.mode.name, category: i.mode.category, matches: i.matches })), []),
    };
  }

  execute(input: FlavorExecutionInput): FlavorExecutionResult {
    const modes = this.resolveModes(input.intensity, input.categories);
    const issues = detectIssues(input.content, modes);

    let content = input.content;
    const appliedModes: string[] = [];

    for (const issue of issues) {
      if (issue.mode.category === 'A') {
        const cleaned = this.applyPatternRemoval(content, issue.mode, issue.matches);
        if (cleaned !== content) {
          content = cleaned;
          appliedModes.push(issue.mode.name);
        }
      }
    }

    return {
      originalContent: input.content,
      processedContent: content,
      appliedModes,
      detectedIssues: issues.map(i => ({
        mode: i.mode.name,
        category: i.mode.category,
        matches: i.matches,
      })),
      summary: this.buildSummary(
        issues.map(i => ({ mode: i.mode.name, category: i.mode.category, matches: i.matches })),
        appliedModes,
      ),
    };
  }

  private resolveModes(intensity: FlavorIntensity, categories?: FlavorCategory[]): FlavorMode[] {
    if (categories && categories.length > 0) {
      return getAllModes().filter(m => categories.includes(m.category));
    }
    return getModesByIntensity(intensity);
  }

  private applyPatternRemoval(content: string, mode: FlavorMode, matches: string[]): string {
    let result = content;
    for (const match of matches) {
      try {
        const regex = new RegExp(match, 'g');
        result = result.replace(regex, '');
      } catch {}
    }
    return result.replace(/\n{3,}/g, '\n\n').trim();
  }

  private buildSummary(
    issues: Array<{ mode: string; category: FlavorCategory; matches: string[] }>,
    appliedModes: string[],
  ): string {
    if (issues.length === 0) return '未检测到AI味问题';
    const parts = [`检测到${issues.length}种AI味问题：`];
    for (const issue of issues) {
      parts.push(`  [${issue.category}] ${issue.mode}: ${issue.matches.length}处`);
    }
    if (appliedModes.length > 0) {
      parts.push(`已应用${appliedModes.length}种去味：${appliedModes.join('、')}`);
    } else {
      parts.push('建议：使用AI重写功能，根据去味指导重写相关段落');
    }
    return parts.join('\n');
  }
}
