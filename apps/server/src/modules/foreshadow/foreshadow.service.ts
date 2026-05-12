import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { OwnershipService } from '../../common/auth/ownership.service';

@Injectable()
export class ForeshadowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async findByProject(projectId: string, userId: string, status?: string) {
    await this.ownership.ensureProjectOwner(projectId, userId);
    const where: any = { projectId };
    if (status) where.status = status;
    return this.prisma.foreshadow.findMany({
      where,
      orderBy: [{ plantedChapter: 'asc' }, { createdAt: 'asc' }],
      take: 200,
    });
  }

  async findOne(id: string, userId: string) {
    await this.ownership.ensureForeshadowOwner(id, userId);
    const foreshadow = await this.prisma.foreshadow.findUnique({ where: { id } });
    if (!foreshadow) throw new NotFoundException('伏笔不存在');
    return foreshadow;
  }

  async create(data: any, userId: string) {
    if (data.projectId) await this.ownership.ensureProjectOwner(data.projectId, userId);
    return this.prisma.foreshadow.create({ data });
  }

  async update(id: string, data: any, userId: string) {
    await this.ownership.ensureForeshadowOwner(id, userId);
    return this.prisma.foreshadow.update({ where: { id }, data: OwnershipService.stripOwnershipFields(data) });
  }

  async resolve(id: string, chapter: number, userId: string) {
    await this.ownership.ensureForeshadowOwner(id, userId);
    return this.prisma.foreshadow.update({
      where: { id },
      data: { status: 'resolved', resolvedChapter: chapter },
    });
  }

  async remove(id: string, userId: string) {
    await this.ownership.ensureForeshadowOwner(id, userId);
    return this.prisma.foreshadow.delete({ where: { id } });
  }
}
