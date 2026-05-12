import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { OwnershipService } from '../../common/auth/ownership.service';

@Injectable()
export class RevisionRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async findAll(userId: string, filters?: { chapterId?: string; projectId?: string }) {
    const where: any = { project: { userId } };
    if (filters?.chapterId) where.chapterId = filters.chapterId;
    if (filters?.projectId) where.projectId = filters.projectId;

    const records = await this.prisma.revisionRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { chapter: { select: { title: true, chapterNo: true } } },
    });
    return records;
  }

  async findOne(id: string, userId: string) {
    await this.ownership.ensureRevisionRecordOwner(id, userId);
    const record = await this.prisma.revisionRecord.findUnique({
      where: { id },
    });
    if (!record) throw new NotFoundException('修订记录不存在');
    return record;
  }

  async create(data: any, userId: string) {
    if (data.projectId) await this.ownership.ensureProjectOwner(data.projectId, userId);
    return this.prisma.revisionRecord.create({ data });
  }

  async update(id: string, data: any, userId: string) {
    await this.ownership.ensureRevisionRecordOwner(id, userId);
    const safeData = OwnershipService.stripOwnershipFields(data);
    return this.prisma.revisionRecord.update({ where: { id }, data: safeData });
  }

  async remove(id: string, userId: string) {
    await this.ownership.ensureRevisionRecordOwner(id, userId);
    await this.prisma.revisionRecord.delete({ where: { id } });
    return { success: true };
  }
}
