import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { OwnershipService } from '../../common/auth/ownership.service';

@Injectable()
export class WorldSettingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async findByProject(projectId: string, userId: string) {
    await this.ownership.ensureProjectOwner(projectId, userId);
    const setting = await this.prisma.worldSetting.findUnique({
      where: { projectId },
    });
    if (!setting) {
      throw new NotFoundException('世界设定不存在');
    }
    return setting;
  }

  async create(projectId: string, data: any, userId: string) {
    await this.ownership.ensureProjectOwner(projectId, userId);
    return this.prisma.worldSetting.create({
      data: { projectId, ...data },
    });
  }

  async update(id: string, data: any, userId: string) {
    await this.ownership.ensureWorldSettingOwner(id, userId);
    const safeData = OwnershipService.stripOwnershipFields(data);
    return this.prisma.worldSetting.update({
      where: { id },
      data: safeData,
    });
  }
}
