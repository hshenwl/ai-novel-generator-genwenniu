import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { OwnershipService } from '../../common/auth/ownership.service';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async findByProject(projectId: string, userId: string) {
    await this.ownership.ensureProjectOwner(projectId, userId);
    return this.prisma.workflowRun.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        stepOutputs: { orderBy: { createdAt: 'asc' }, take: 20 },
      },
    });
  }

  async findOne(id: string, userId: string) {
    await this.ownership.ensureWorkflowOwner(id, userId);
    const workflow = await this.prisma.workflowRun.findUnique({
      where: { id },
      include: {
        stepOutputs: { orderBy: { createdAt: 'asc' }, take: 20 },
        auditReports: { take: 10 },
      },
    });
    if (!workflow) throw new NotFoundException('工作流不存在');
    return workflow;
  }

  async start(data: { projectId: string; chapterId?: string; type: string; mode?: string }, userId: string) {
    await this.ownership.ensureProjectOwner(data.projectId, userId);
    const workflow = await this.prisma.workflowRun.create({
      data: {
        projectId: data.projectId,
        chapterId: data.chapterId,
        type: data.type,
        mode: data.mode || 'standard',
        status: 'pending',
      },
    });
    return workflow;
  }

  async pause(id: string, userId: string) {
    await this.ownership.ensureWorkflowOwner(id, userId);
    return this.prisma.workflowRun.update({
      where: { id },
      data: { status: 'paused' },
    });
  }

  async resume(id: string, userId: string) {
    await this.ownership.ensureWorkflowOwner(id, userId);
    return this.prisma.workflowRun.update({
      where: { id },
      data: { status: 'running' },
    });
  }

  async cancel(id: string, userId: string) {
    await this.ownership.ensureWorkflowOwner(id, userId);
    return this.prisma.workflowRun.update({
      where: { id },
      data: { status: 'failed', error: '用户取消' },
    });
  }

  async getProgressStream(id: string, userId: string): Promise<Observable<MessageEvent>> {
    await this.ownership.ensureWorkflowOwner(id, userId);
    const subject = new Subject<MessageEvent>();
    const workflow = await this.prisma.workflowRun.findUnique({ where: { id } });
    if (workflow) subject.next({ data: JSON.stringify(workflow) } as MessageEvent);
    return subject.asObservable();
  }
}
