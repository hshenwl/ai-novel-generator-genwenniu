import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { OwnershipService } from '../../common/auth/ownership.service';

@Injectable()
export class ExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async exportProject(projectId: string, format: string, userId: string) {
    await this.ownership.ensureProjectOwner(projectId, userId);
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');

    const [worldSetting, outline, volumes, characters, organizations, foreshadows, hooks] = await Promise.all([
      this.prisma.worldSetting.findUnique({ where: { projectId } }),
      this.prisma.outline.findUnique({ where: { projectId } }),
      this.prisma.volume.findMany({ where: { projectId }, orderBy: { orderIndex: 'asc' } }),
      this.prisma.character.findMany({ where: { projectId } }),
      this.prisma.organization.findMany({ where: { projectId } }),
      this.prisma.foreshadow.findMany({ where: { projectId } }),
      this.prisma.hook.findMany({ where: { projectId } }),
    ]);

    // 获取所有章节
    const volumeIds = volumes.map(v => v.id);
    const chapters = volumeIds.length > 0
      ? await this.prisma.chapter.findMany({ where: { volumeId: { in: volumeIds } }, orderBy: { chapterNo: 'asc' } })
      : [];

    const data = { project, worldSetting, outline, volumes, characters, organizations, foreshadows, hooks, chapters };

    if (format === 'json') {
      return { content: JSON.stringify(data, null, 2) };
    }

    if (format === 'txt' || format === 'md' || format === 'markdown') {
      const lines: string[] = [];
      lines.push(`# ${project.name}`);
      lines.push(`类型: ${project.genre || '未设置'} | 视角: ${project.perspective || '未设置'} | 目标字数: ${project.targetWords}`);
      lines.push('');

      if (outline) {
        lines.push('## 小说总纲');
        lines.push(outline.content || '');
        if (outline.summary) lines.push(`\n**摘要**: ${outline.summary}`);
        if (outline.mainPlot) lines.push(`\n**主线**: ${outline.mainPlot}`);
        if (outline.coreConflict) lines.push(`\n**核心冲突**: ${outline.coreConflict}`);
        lines.push('');
      }

      if (worldSetting) {
        lines.push('## 世界设定');
        if (worldSetting.background) lines.push(`**背景**: ${worldSetting.background}`);
        if (worldSetting.rules) lines.push(`**规则**: ${worldSetting.rules}`);
        if (worldSetting.powerSystem) lines.push(`**力量体系**: ${worldSetting.powerSystem}`);
        if (worldSetting.conflict) lines.push(`**冲突**: ${worldSetting.conflict}`);
        if (worldSetting.target) lines.push(`**目标**: ${worldSetting.target}`);
        lines.push('');
      }

      for (const vol of volumes) {
        lines.push(`## ${vol.title}`);
        if (vol.description) lines.push(vol.description);
        if (vol.outline) lines.push(vol.outline);
        lines.push('');

        const volChapters = chapters.filter(c => c.volumeId === vol.id);
        for (const ch of volChapters) {
          lines.push(`### 第${ch.chapterNo}章 ${ch.title || ''}`);
          lines.push(ch.content || '');
          lines.push('');
        }
      }

      if (characters.length > 0) {
        lines.push('## 角色');
        for (const c of characters) {
          lines.push(`- **${c.name}** (${c.role}) ${c.personality || ''}`);
        }
        lines.push('');
      }

      return { content: lines.join('\n') };
    }

    return { content: JSON.stringify(data, null, 2) };
  }

  async exportCharacters(projectId: string, userId: string) {
    await this.ownership.ensureProjectOwner(projectId, userId);
    const characters = await this.prisma.character.findMany({ where: { projectId } });
    return JSON.stringify(characters, null, 2);
  }

  async exportAuditReports(projectId: string, userId: string) {
    await this.ownership.ensureProjectOwner(projectId, userId);
    const reports = await this.prisma.auditReport.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } });
    return JSON.stringify(reports, null, 2);
  }
}
