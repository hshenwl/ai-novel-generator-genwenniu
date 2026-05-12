import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { OwnershipService } from '../../common/auth/ownership.service';

@Injectable()
export class ChapterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async findByVolume(volumeId: string, userId: string) {
    await this.ownership.ensureVolumeOwner(volumeId, userId);
    return this.prisma.chapter.findMany({
      where: { volumeId },
      orderBy: { chapterNo: 'asc' },
      take: 200,
    });
  }

  async findOne(id: string, userId: string) {
    await this.ownership.ensureChapterOwner(id, userId);
    const chapter = await this.prisma.chapter.findUnique({
      where: { id },
      include: {
        auditReports: { orderBy: { createdAt: 'desc' }, take: 1 },
        revisions: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!chapter) throw new NotFoundException('章节不存在');
    return chapter;
  }

  async create(data: any, userId: string) {
    if (data.volumeId) await this.ownership.ensureVolumeOwner(data.volumeId, userId);
    const wordCount = data.content ? this.countWords(data.content) : 0;
    return this.prisma.chapter.create({
      data: { ...data, wordCount },
    });
  }

  async update(id: string, data: any, userId: string) {
    await this.ownership.ensureChapterOwner(id, userId);
    const updateData: any = OwnershipService.stripOwnershipFields(data);
    if (data.content) {
      updateData.wordCount = this.countWords(data.content);
    }
    return this.prisma.chapter.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string, userId: string) {
    await this.ownership.ensureChapterOwner(id, userId);
    return this.prisma.chapter.delete({ where: { id } });
  }

  async publish(id: string, userId: string) {
    await this.ownership.ensureChapterOwner(id, userId);
    return this.prisma.chapter.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
    });
  }

  private countWords(text: string): number {
    return text.replace(/\s+/g, '').length;
  }
}
