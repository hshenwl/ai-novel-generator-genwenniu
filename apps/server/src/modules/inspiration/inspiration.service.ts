import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { OwnershipService } from '../../common/auth/ownership.service';

@Injectable()
export class InspirationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async findAll(userId: string, projectId?: string, type?: string) {
    const where: any = { project: { userId } };
    if (projectId) where.projectId = projectId;
    if (type && type !== 'all') where.type = type;
    return this.prisma.inspiration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async findOne(id: string, userId: string) {
    await this.ownership.ensureInspirationOwner(id, userId);
    return this.prisma.inspiration.findUnique({ where: { id } });
  }

  async create(data: any, userId: string) {
    if (data.projectId) await this.ownership.ensureProjectOwner(data.projectId, userId);
    return this.prisma.inspiration.create({ data });
  }

  async update(id: string, data: any, userId: string) {
    await this.ownership.ensureInspirationOwner(id, userId);
    const safeData = OwnershipService.stripOwnershipFields(data);
    return this.prisma.inspiration.update({ where: { id }, data: safeData });
  }

  async remove(id: string, userId: string) {
    await this.ownership.ensureInspirationOwner(id, userId);
    return this.prisma.inspiration.delete({ where: { id } });
  }
}
