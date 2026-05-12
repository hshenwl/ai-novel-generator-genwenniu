import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { CreateProjectDto, UpdateProjectDto, ProjectQueryDto } from './dto';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProjectQueryDto, userId: string) {
    const { page = 1, pageSize = 20, status, genre } = query;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { deletedAt: null, userId };
    if (status) where.status = status;
    if (genre) where.genre = genre;

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        worldSetting: true,
        outline: true,
        volumes: { orderBy: { orderIndex: 'asc' } },
        characters: true,
        organizations: true,
      },
    });

    if (!project) throw new NotFoundException(`项目 ${id} 不存在`);
    return project;
  }

  async create(dto: CreateProjectDto, userId: string) {
    const project = await this.prisma.project.create({
      data: { ...dto, userId },
    });

    await this.prisma.worldSetting.create({
      data: { projectId: project.id },
    });

    await this.prisma.outline.create({
      data: { projectId: project.id, content: '' },
    });

    return project;
  }

  async update(id: string, dto: UpdateProjectDto, userId: string) {
    await this.findOne(id, userId); // 先检查所有权
    return this.prisma.project.update({
      where: { id },
      data: { ...dto, version: { increment: 1 } },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'deleted' },
    });
    return { success: true, message: '项目已删除' };
  }

  async getStats(id: string, userId: string) {
    await this.findOne(id, userId);
    const [volumeCount, chapterCount, characterCount] = await Promise.all([
      this.prisma.volume.count({ where: { projectId: id } }),
      this.prisma.chapter.count({ where: { projectId: id } }),
      this.prisma.character.count({ where: { projectId: id } }),
    ]);
    const wordAgg = await this.prisma.chapter.aggregate({
      where: { projectId: id },
      _sum: { wordCount: true },
    });
    return { volumeCount, chapterCount, characterCount, totalWords: wordAgg._sum?.wordCount ?? 0 };
  }

  async getGlobalStats(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    const projectIds = projects.map(p => p.id);
    const [projectCount, chapterCount, characterCount] = await Promise.all([
      Promise.resolve(projectIds.length),
      projectIds.length > 0 ? this.prisma.chapter.count({ where: { projectId: { in: projectIds } } }) : Promise.resolve(0),
      projectIds.length > 0 ? this.prisma.character.count({ where: { projectId: { in: projectIds } } }) : Promise.resolve(0),
    ]);
    const wordAgg = projectIds.length > 0
      ? await this.prisma.chapter.aggregate({ where: { projectId: { in: projectIds } }, _sum: { wordCount: true } })
      : { _sum: { wordCount: null } as any };
    return { projectCount, chapterCount, characterCount, totalWords: wordAgg._sum?.wordCount ?? 0 };
  }
}
