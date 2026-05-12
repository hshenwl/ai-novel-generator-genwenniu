import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { OwnershipService } from '../../common/auth/ownership.service';

@Injectable()
export class CharacterRelationshipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async findAll(projectId: string, userId: string) {
    await this.ownership.ensureProjectOwner(projectId, userId);
    return this.prisma.characterRelationship.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async findOne(id: string, userId: string) {
    await this.ownership.ensureCharacterRelationshipOwner(id, userId);
    const item = await this.prisma.characterRelationship.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('关系不存在');
    return item;
  }

  async create(data: {
    projectId: string;
    sourceId: string;
    targetId: string;
    relationType: string;
    description?: string;
    isHidden?: boolean;
    firstChapter?: number;
    lastChapter?: number;
  }, userId: string) {
    await this.ownership.ensureProjectOwner(data.projectId, userId);
    return this.prisma.characterRelationship.create({ data });
  }

  async update(id: string, data: {
    sourceId?: string;
    targetId?: string;
    relationType?: string;
    description?: string;
    isHidden?: boolean;
    firstChapter?: number;
    lastChapter?: number;
    status?: string;
  }, userId: string) {
    await this.ownership.ensureCharacterRelationshipOwner(id, userId);
    const safeData = OwnershipService.stripOwnershipFields(data);
    return this.prisma.characterRelationship.update({ where: { id }, data: safeData });
  }

  async remove(id: string, userId: string) {
    await this.ownership.ensureCharacterRelationshipOwner(id, userId);
    await this.prisma.characterRelationship.delete({ where: { id } });
    return { success: true };
  }

  async getGraph(projectId: string, userId: string) {
    await this.ownership.ensureProjectOwner(projectId, userId);
    const relations = await this.prisma.characterRelationship.findMany({
      where: { projectId, status: 'active' },
    });
    const characters = await this.prisma.character.findMany({
      where: { projectId },
      select: { id: true, name: true, role: true },
    });
    return { nodes: characters, edges: relations };
  }
}
