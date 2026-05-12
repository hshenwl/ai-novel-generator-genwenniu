import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma';

@Injectable()
export class OwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  static stripOwnershipFields(data: any): any {
    if (!data || typeof data !== 'object') return data;
    const forbidden = ['projectId', 'project_id', 'userId', 'user_id', 'volumeId', 'volume_id', 'tenantId', 'tenant_id'];
    const cleaned = { ...data };
    for (const key of forbidden) {
      delete cleaned[key];
    }
    return cleaned;
  }

  async ensureProjectOwner(projectId: string, userId: string): Promise<void> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('项目不存在或无权访问');
  }

  async ensureVolumeOwner(volumeId: string, userId: string): Promise<void> {
    const volume = await this.prisma.volume.findFirst({
      where: { id: volumeId },
      select: { project: { select: { userId: true } } },
    });
    if (!volume || volume.project.userId !== userId) throw new NotFoundException('卷不存在或无权访问');
  }

  async ensureChapterOwner(chapterId: string, userId: string): Promise<void> {
    const chapter = await this.prisma.chapter.findFirst({
      where: { id: chapterId },
      select: { volume: { select: { project: { select: { userId: true } } } } },
    });
    if (!chapter || chapter.volume.project.userId !== userId) throw new NotFoundException('章节不存在或无权访问');
  }

  async ensureForeshadowOwner(foreshadowId: string, userId: string): Promise<void> {
    const f = await this.prisma.foreshadow.findFirst({
      where: { id: foreshadowId },
      select: { project: { select: { userId: true } } },
    });
    if (!f || f.project.userId !== userId) throw new NotFoundException('伏笔不存在或无权访问');
  }

  async ensureHookOwner(hookId: string, userId: string): Promise<void> {
    const h = await this.prisma.hook.findFirst({
      where: { id: hookId },
      select: { project: { select: { userId: true } } },
    });
    if (!h || h.project.userId !== userId) throw new NotFoundException('Hook不存在或无权访问');
  }

  async ensureWorkflowOwner(workflowId: string, userId: string): Promise<void> {
    const w = await this.prisma.workflowRun.findFirst({
      where: { id: workflowId },
      select: { project: { select: { userId: true } } },
    });
    if (!w || w.project.userId !== userId) throw new NotFoundException('工作流不存在或无权访问');
  }

  async ensureCharacterOwner(characterId: string, userId: string): Promise<void> {
    const c = await this.prisma.character.findFirst({
      where: { id: characterId },
      select: { project: { select: { userId: true } } },
    });
    if (!c || c.project.userId !== userId) throw new NotFoundException('角色不存在或无权访问');
  }

  async ensureOrganizationOwner(orgId: string, userId: string): Promise<void> {
    const o = await this.prisma.organization.findFirst({
      where: { id: orgId },
      select: { project: { select: { userId: true } } },
    });
    if (!o || o.project.userId !== userId) throw new NotFoundException('组织不存在或无权访问');
  }

  async ensureChapterOutlineOwner(outlineId: string, userId: string): Promise<void> {
    const o = await this.prisma.chapterOutline.findFirst({
      where: { id: outlineId },
      select: { volume: { select: { project: { select: { userId: true } } } } },
    });
    if (!o || o.volume.project.userId !== userId) throw new NotFoundException('章纲不存在或无权访问');
  }

  async ensureAuditReportOwner(reportId: string, userId: string): Promise<void> {
    const r = await this.prisma.auditReport.findFirst({
      where: { id: reportId },
      select: { project: { select: { userId: true } } },
    });
    if (!r || r.project.userId !== userId) throw new NotFoundException('审核报告不存在或无权访问');
  }

  async ensureRevisionRecordOwner(recordId: string, userId: string): Promise<void> {
    const r = await this.prisma.revisionRecord.findFirst({
      where: { id: recordId },
      select: { project: { select: { userId: true } } },
    });
    if (!r || r.project.userId !== userId) throw new NotFoundException('修订记录不存在或无权访问');
  }

  async ensureInspirationOwner(inspirationId: string, userId: string): Promise<void> {
    const i = await this.prisma.inspiration.findFirst({
      where: { id: inspirationId },
      select: { project: { select: { userId: true } } },
    });
    if (!i || !i.project || i.project.userId !== userId) throw new NotFoundException('灵感不存在或无权访问');
  }

  async ensureWorldSettingOwner(settingId: string, userId: string): Promise<void> {
    const w = await this.prisma.worldSetting.findFirst({
      where: { id: settingId },
      select: { project: { select: { userId: true } } },
    });
    if (!w || w.project.userId !== userId) throw new NotFoundException('世界设定不存在或无权访问');
  }

  async ensureOutlineOwner(outlineId: string, userId: string): Promise<void> {
    const o = await this.prisma.outline.findFirst({
      where: { id: outlineId },
      select: { project: { select: { userId: true } } },
    });
    if (!o || o.project.userId !== userId) throw new NotFoundException('总纲不存在或无权访问');
  }

  async ensureCareerOwner(careerId: string, userId: string): Promise<void> {
    const c = await this.prisma.career.findFirst({
      where: { id: careerId },
      select: { project: { select: { userId: true } } },
    });
    if (!c || c.project.userId !== userId) throw new NotFoundException('职业不存在或无权访问');
  }

  async ensureCharacterRelationshipOwner(relId: string, userId: string): Promise<void> {
    const r = await this.prisma.characterRelationship.findFirst({
      where: { id: relId },
      select: { project: { select: { userId: true } } },
    });
    if (!r || r.project.userId !== userId) throw new NotFoundException('关系不存在或无权访问');
  }
}
