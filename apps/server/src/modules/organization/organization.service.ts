import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { OwnershipService } from '../../common/auth/ownership.service';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async findByProject(projectId: string, userId: string) {
    await this.ownership.ensureProjectOwner(projectId, userId);
    return this.prisma.organization.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  }

  async findOne(id: string, userId: string) {
    await this.ownership.ensureOrganizationOwner(id, userId);
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('组织不存在');
    return org;
  }

  async create(data: any, userId: string) {
    if (data.projectId) await this.ownership.ensureProjectOwner(data.projectId, userId);
    return this.prisma.organization.create({ data });
  }

  async update(id: string, data: any, userId: string) {
    await this.ownership.ensureOrganizationOwner(id, userId);
    return this.prisma.organization.update({ where: { id }, data: OwnershipService.stripOwnershipFields(data) });
  }

  async remove(id: string, userId: string) {
    await this.ownership.ensureOrganizationOwner(id, userId);
    return this.prisma.organization.delete({ where: { id } });
  }
}
