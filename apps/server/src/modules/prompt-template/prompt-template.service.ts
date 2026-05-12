import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { OwnershipService } from '../../common/auth/ownership.service';

@Injectable()
export class PromptTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, category?: string) {
    const where: any = { OR: [{ projectId: null }, { project: { userId } }] };
    if (category) where.category = category;

    return this.prisma.promptTemplate.findMany({
      where,
      orderBy: [{ isBuiltin: 'desc' }, { usageCount: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  async findOne(id: string, userId: string) {
    const tmpl = await this.prisma.promptTemplate.findUnique({ where: { id } });
    if (!tmpl) throw new NotFoundException('提示词模板不存在');
    if (tmpl.isBuiltin) return tmpl;
    if (tmpl.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: tmpl.projectId, userId, deletedAt: null },
        select: { id: true },
      });
      if (!project) throw new NotFoundException('提示词模板不存在或无权访问');
    }
    return tmpl;
  }

  async create(data: any, userId: string) {
    return this.prisma.promptTemplate.create({
      data: { ...data, isBuiltin: false },
    });
  }

  async update(id: string, data: any, userId: string) {
    const tmpl = await this.prisma.promptTemplate.findUnique({ where: { id } });
    if (!tmpl) throw new NotFoundException('提示词模板不存在');
    if (tmpl.isBuiltin) throw new ForbiddenException('内置模板不可修改');
    if (tmpl.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: tmpl.projectId, userId, deletedAt: null },
        select: { id: true },
      });
      if (!project) throw new NotFoundException('提示词模板不存在或无权访问');
    }
    return this.prisma.promptTemplate.update({ where: { id }, data: OwnershipService.stripOwnershipFields(data) });
  }

  async remove(id: string, userId: string) {
    const tmpl = await this.prisma.promptTemplate.findUnique({ where: { id } });
    if (!tmpl) throw new NotFoundException('提示词模板不存在');
    if (tmpl.isBuiltin) throw new ForbiddenException('内置模板不可删除');
    if (tmpl.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: tmpl.projectId, userId, deletedAt: null },
        select: { id: true },
      });
      if (!project) throw new NotFoundException('提示词模板不存在或无权访问');
    }
    await this.prisma.promptTemplate.delete({ where: { id } });
    return { success: true };
  }

  async getCategories() {
    const result = await this.prisma.promptTemplate.groupBy({
      by: ['category'],
      _count: { id: true },
      orderBy: { category: 'asc' },
    });
    return result.map((r) => ({ category: r.category, count: r._count.id }));
  }
}
