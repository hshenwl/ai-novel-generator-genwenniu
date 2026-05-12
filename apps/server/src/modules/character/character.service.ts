import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { OwnershipService } from '../../common/auth/ownership.service';

@Injectable()
export class CharacterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async findByProject(projectId: string, userId: string, role?: string) {
    await this.ownership.ensureProjectOwner(projectId, userId);
    const where: any = { projectId };
    if (role) where.role = role;
    return this.prisma.character.findMany({
      where,
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      take: 200,
    });
  }

  async findOne(id: string, userId: string) {
    await this.ownership.ensureCharacterOwner(id, userId);
    const character = await this.prisma.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundException('角色不存在');
    return character;
  }

  async create(data: any, userId: string) {
    if (data.projectId) await this.ownership.ensureProjectOwner(data.projectId, userId);
    return this.prisma.character.create({ data });
  }

  async update(id: string, data: any, userId: string) {
    await this.ownership.ensureCharacterOwner(id, userId);
    return this.prisma.character.update({ where: { id }, data: OwnershipService.stripOwnershipFields(data) });
  }

  async remove(id: string, userId: string) {
    await this.ownership.ensureCharacterOwner(id, userId);
    return this.prisma.character.delete({ where: { id } });
  }
}
