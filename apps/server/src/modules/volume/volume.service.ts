import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { OwnershipService } from '../../common/auth/ownership.service';

@Injectable()
export class VolumeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async findByProject(projectId: string, userId: string) {
    await this.ownership.ensureProjectOwner(projectId, userId);
    return this.prisma.volume.findMany({
      where: { projectId },
      orderBy: { orderIndex: 'asc' },
      take: 50,
      include: {
        chapterOutlines: { orderBy: { chapterNo: 'asc' }, take: 200 },
        chapters: { orderBy: { chapterNo: 'asc' }, take: 200 },
      },
    });
  }

  async findOne(id: string, userId: string) {
    await this.ownership.ensureVolumeOwner(id, userId);
    const volume = await this.prisma.volume.findUnique({
      where: { id },
      include: {
        chapterOutlines: { orderBy: { chapterNo: 'asc' }, take: 200 },
        chapters: { orderBy: { chapterNo: 'asc' }, take: 200 },
      },
    });
    if (!volume) throw new NotFoundException('卷纲不存在');
    return volume;
  }

  async create(data: any, userId: string) {
    if (data.projectId) await this.ownership.ensureProjectOwner(data.projectId, userId);
    return this.prisma.volume.create({ data });
  }

  async update(id: string, data: any, userId: string) {
    await this.ownership.ensureVolumeOwner(id, userId);
    const safeData = OwnershipService.stripOwnershipFields(data);
    return this.prisma.volume.update({ where: { id }, data: safeData });
  }

  async remove(id: string, userId: string) {
    await this.ownership.ensureVolumeOwner(id, userId);
    return this.prisma.volume.delete({ where: { id } });
  }
}
