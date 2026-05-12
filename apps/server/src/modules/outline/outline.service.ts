import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { OwnershipService } from '../../common/auth/ownership.service';

@Injectable()
export class OutlineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async findByProject(projectId: string, userId: string) {
    await this.ownership.ensureProjectOwner(projectId, userId);
    const outline = await this.prisma.outline.findUnique({
      where: { projectId },
    });
    if (!outline) {
      throw new NotFoundException('总纲不存在');
    }
    return outline;
  }

  async create(projectId: string, data: any, userId: string) {
    await this.ownership.ensureProjectOwner(projectId, userId);
    return this.prisma.outline.create({
      data: { projectId, content: data.content || '', ...data },
    });
  }

  async update(id: string, data: any, userId: string) {
    await this.ownership.ensureOutlineOwner(id, userId);
    const safeData = OwnershipService.stripOwnershipFields(data);
    return this.prisma.outline.update({
      where: { id },
      data: safeData,
    });
  }
}
