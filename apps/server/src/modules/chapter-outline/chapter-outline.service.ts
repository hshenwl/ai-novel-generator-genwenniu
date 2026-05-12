import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { OwnershipService } from '../../common/auth/ownership.service';

@Injectable()
export class ChapterOutlineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async findByVolume(volumeId: string, userId: string) {
    await this.ownership.ensureVolumeOwner(volumeId, userId);
    return this.prisma.chapterOutline.findMany({
      where: { volumeId },
      orderBy: { chapterNo: 'asc' },
      take: 200,
    });
  }

  async findOne(id: string, userId: string) {
    await this.ownership.ensureChapterOutlineOwner(id, userId);
    const outline = await this.prisma.chapterOutline.findUnique({ where: { id } });
    if (!outline) throw new NotFoundException('章纲不存在');
    return outline;
  }

  async create(data: any, userId: string) {
    if (data.volumeId) await this.ownership.ensureVolumeOwner(data.volumeId, userId);
    return this.prisma.chapterOutline.create({ data });
  }

  async update(id: string, data: any, userId: string) {
    await this.ownership.ensureChapterOutlineOwner(id, userId);
    const safeData = OwnershipService.stripOwnershipFields(data);
    return this.prisma.chapterOutline.update({ where: { id }, data: safeData });
  }

  async remove(id: string, userId: string) {
    await this.ownership.ensureChapterOutlineOwner(id, userId);
    return this.prisma.chapterOutline.delete({ where: { id } });
  }
}
