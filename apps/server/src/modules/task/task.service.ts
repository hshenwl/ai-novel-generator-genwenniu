import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';

@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, status?: string, type?: string) {
    const where: any = { userId };
    if (status) where.status = status;
    if (type) where.type = type;
    return this.prisma.task.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async findOne(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({ where: { id, userId } });
    if (!task) throw new NotFoundException('任务不存在');
    return task;
  }

  async create(data: any, userId: string) {
    return this.prisma.task.create({
      data: {
        type: data.type,
        priority: data.priority || 'normal',
        payload: JSON.stringify(data.payload || {}),
        maxRetry: data.maxRetry || 3,
        userId,
      },
    });
  }

  async retry(id: string, userId: string) {
    const task = await this.findOne(id, userId);
    return this.prisma.task.update({
      where: { id },
      data: { status: 'pending', retryCount: task.retryCount + 1 },
    });
  }

  async cancel(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.task.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }
}
