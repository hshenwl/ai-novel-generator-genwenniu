import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { OwnershipService } from '../../common/auth/ownership.service';

@Injectable()
export class AuditReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async findAll(userId: string, projectId?: string, passStatus?: string) {
    const where: any = { project: { userId } };
    if (projectId) where.projectId = projectId;
    if (passStatus) where.passStatus = passStatus;

    return this.prisma.auditReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        chapter: {
          select: { id: true, title: true, chapterNo: true },
        },
      },
    });
  }

  async findOne(id: string, userId: string) {
    await this.ownership.ensureAuditReportOwner(id, userId);
    const report = await this.prisma.auditReport.findUnique({
      where: { id },
      include: {
        chapter: { select: { id: true, title: true, chapterNo: true } },
        project: { select: { id: true, name: true } },
      },
    });
    if (!report) throw new NotFoundException('审核报告不存在');
    return report;
  }

  async findByChapter(chapterId: string, userId: string) {
    await this.ownership.ensureChapterOwner(chapterId, userId);
    const reports = await this.prisma.auditReport.findMany({
      where: { chapterId },
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true } },
      },
    });
    return reports;
  }

  async create(data: {
    projectId: string;
    chapterId: string;
    workflowId?: string;
    totalScore: number;
    dimensionScores: string;
    issues: string;
    suggestions: string;
    passStatus: string;
    auditorModel?: string;
  }, userId: string) {
    await this.ownership.ensureProjectOwner(data.projectId, userId);
    return this.prisma.auditReport.create({ data });
  }

  async update(id: string, data: any, userId: string) {
    await this.ownership.ensureAuditReportOwner(id, userId);
    const safeData = OwnershipService.stripOwnershipFields(data);
    return this.prisma.auditReport.update({ where: { id }, data: safeData });
  }

  async remove(id: string, userId: string) {
    await this.ownership.ensureAuditReportOwner(id, userId);
    await this.prisma.auditReport.delete({ where: { id } });
    return { success: true, message: '审核报告已删除' };
  }
}
