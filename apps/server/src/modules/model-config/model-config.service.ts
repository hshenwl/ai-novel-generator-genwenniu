import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { EncryptionService, OwnershipService } from '../../common/auth';
import { EngineService } from '../engine/engine.service';

@Injectable()
export class ModelConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly engineService: EngineService,
  ) {}

  async findAll(userId: string) {
    const configs = await this.prisma.modelConfig.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });

    return configs.map((config) => ({
      ...config,
      apiKey: config.apiKey ? this.encryption.mask(config.apiKey) : null,
      hasApiKey: Boolean(config.apiKey),
    }));
  }

  async findOne(id: string, userId: string) {
    const config = await this.prisma.modelConfig.findFirst({ where: { id, userId } });
    if (!config) throw new NotFoundException('模型配置不存在');
    return {
      ...config,
      apiKey: config.apiKey ? this.encryption.mask(config.apiKey) : null,
      hasApiKey: Boolean(config.apiKey),
    };
  }

  async create(data: any, userId: string) {
    const config = await this.prisma.modelConfig.create({
      data: {
        userId,
        ...data,
        apiKey: data.apiKey ? this.encryption.encrypt(data.apiKey) : null,
      },
    });
    // 热加载新模型到引擎
    this.engineService.reloadUserModels().catch(() => {});
    return {
      ...config,
      apiKey: config.apiKey ? this.encryption.mask(config.apiKey) : null,
      hasApiKey: Boolean(config.apiKey),
    };
  }

  async update(id: string, data: any, userId: string) {
    await this.ensureOwned(id, userId);
    const safeData = OwnershipService.stripOwnershipFields(data);
    const updateData = {
      ...safeData,
      ...(Object.prototype.hasOwnProperty.call(data, 'apiKey')
        ? { apiKey: data.apiKey ? this.encryption.encrypt(data.apiKey) : null }
        : {}),
    };

    const config = await this.prisma.modelConfig.update({ where: { id }, data: updateData });
    this.engineService.reloadUserModels().catch(() => {});
    return {
      ...config,
      apiKey: config.apiKey ? this.encryption.mask(config.apiKey) : null,
      hasApiKey: Boolean(config.apiKey),
    };
  }

  async remove(id: string, userId: string) {
    await this.ensureOwned(id, userId);
    await this.prisma.modelConfig.delete({ where: { id } });
    this.engineService.reloadUserModels().catch(() => {});
    return { success: true, message: '模型配置已删除' };
  }

  async setDefault(id: string, userId: string) {
    await this.ensureOwned(id, userId);
    await this.prisma.modelConfig.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
    const config = await this.prisma.modelConfig.update({
      where: { id },
      data: { isDefault: true },
    });
    this.engineService.reloadUserModels().catch(() => {});
    return {
      ...config,
      apiKey: config.apiKey ? this.encryption.mask(config.apiKey) : null,
      hasApiKey: Boolean(config.apiKey),
    };
  }

  private async ensureOwned(id: string, userId: string) {
    const config = await this.prisma.modelConfig.findFirst({ where: { id, userId } });
    if (!config) throw new NotFoundException('模型配置不存在');
    return config;
  }
}
