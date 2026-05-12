import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { OwnershipService } from '../../common/auth/ownership.service';

@Injectable()
export class CareerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async findAll(projectId: string, userId: string) {
    await this.ownership.ensureProjectOwner(projectId, userId);
    return this.prisma.career.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async findOne(id: string, userId: string) {
    await this.ownership.ensureCareerOwner(id, userId);
    const item = await this.prisma.career.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('职业不存在');
    return item;
  }

  async create(data: { projectId: string; name: string; type?: string; description?: string; levels?: string; promotion?: string }, userId: string) {
    await this.ownership.ensureProjectOwner(data.projectId, userId);
    return this.prisma.career.create({ data });
  }

  async update(id: string, data: { name?: string; type?: string; description?: string; levels?: string; promotion?: string }, userId: string) {
    await this.ownership.ensureCareerOwner(id, userId);
    const safeData = OwnershipService.stripOwnershipFields(data);
    return this.prisma.career.update({ where: { id }, data: safeData });
  }

  async remove(id: string, userId: string) {
    await this.ownership.ensureCareerOwner(id, userId);
    await this.prisma.career.delete({ where: { id } });
    return { success: true };
  }
}
