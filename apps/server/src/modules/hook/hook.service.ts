import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { OwnershipService } from '../../common/auth/ownership.service';

@Injectable()
export class HookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async findByProject(projectId: string, userId: string, status?: string, type?: string) {
    await this.ownership.ensureProjectOwner(projectId, userId);
    const where: any = { projectId };
    if (status) where.status = status;
    if (type) where.type = type;
    return this.prisma.hook.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  }

  async findOne(id: string, userId: string) {
    await this.ownership.ensureHookOwner(id, userId);
    const hook = await this.prisma.hook.findUnique({ where: { id } });
    if (!hook) throw new NotFoundException('Hook不存在');
    return hook;
  }

  async create(data: any, userId: string) {
    if (data.projectId) await this.ownership.ensureProjectOwner(data.projectId, userId);
    return this.prisma.hook.create({ data });
  }

  async update(id: string, data: any, userId: string) {
    await this.ownership.ensureHookOwner(id, userId);
    return this.prisma.hook.update({ where: { id }, data: OwnershipService.stripOwnershipFields(data) });
  }

  async resolve(id: string, chapter: number, userId: string) {
    await this.ownership.ensureHookOwner(id, userId);
    return this.prisma.hook.update({
      where: { id },
      data: { status: 'resolved', actualResolve: chapter },
    });
  }

  async remove(id: string, userId: string) {
    await this.ownership.ensureHookOwner(id, userId);
    return this.prisma.hook.delete({ where: { id } });
  }
}
