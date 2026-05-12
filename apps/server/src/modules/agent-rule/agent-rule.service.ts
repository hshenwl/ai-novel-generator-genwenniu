import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { OwnershipService } from '../../common/auth/ownership.service';
import * as fs from 'fs';
import * as path from 'path';

const BUILTIN_RULES = [
  { agentName: 'shared', fileName: 'shared.md', title: '全局共享规则', scope: '所有步骤' },
  { agentName: 'planner', fileName: 'planner.md', title: 'Planner规则', scope: 'Planner步骤' },
  { agentName: 'writer', fileName: 'writer.md', title: 'Writer规则', scope: 'Writer步骤' },
  { agentName: 'deep_reader', fileName: 'deepreader.md', title: 'DeepReader规则', scope: 'DeepReader步骤' },
  { agentName: 'deep_editor', fileName: 'deepeditor.md', title: 'DeepEditor规则', scope: 'DeepEditor步骤' },
  { agentName: 'auditor', fileName: 'auditor.md', title: 'Auditor规则', scope: 'Auditor步骤' },
  { agentName: 'reviser', fileName: 'reviser.md', title: 'Reviser规则', scope: 'Reviser步骤' },
  { agentName: 'settler', fileName: 'settler.md', title: 'Settler规则', scope: 'Settler步骤' },
];

@Injectable()
export class AgentRuleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async findAll(userId: string, projectId?: string) {
    const where: any = {};
    if (projectId) {
      await this.ownership.ensureProjectOwner(projectId, userId);
      where.OR = [{ projectId }, { projectId: null, isBuiltin: true }];
    } else {
      where.OR = [{ userId }, { projectId: null, isBuiltin: true }];
    }
    return this.prisma.agentRule.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string, userId: string) {
    const rule = await this.prisma.agentRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('规则不存在');
    if (rule.projectId) await this.ownership.ensureProjectOwner(rule.projectId, userId);
    return rule;
  }

  async create(data: any, userId: string) {
    if (data.projectId) await this.ownership.ensureProjectOwner(data.projectId, userId);
    return this.prisma.agentRule.create({ data: { ...data, userId } });
  }

  async update(id: string, data: any, userId: string) {
    const rule = await this.findOne(id, userId);
    if (rule.isBuiltin) throw new NotFoundException('内置规则不可修改');
    return this.prisma.agentRule.update({ where: { id }, data: OwnershipService.stripOwnershipFields(data) });
  }

  async remove(id: string, userId: string) {
    const rule = await this.findOne(id, userId);
    if (rule.isBuiltin) throw new NotFoundException('内置规则不可删除');
    return this.prisma.agentRule.delete({ where: { id } });
  }

  getBuiltinRules() {
    return BUILTIN_RULES;
  }

  async getCompiledRule(agentName: string, projectId?: string, userId?: string): Promise<string> {
    const parts: string[] = [];

    const builtinShared = await this.prisma.agentRule.findFirst({
      where: { agentName: 'shared', isBuiltin: true },
    });
    if (builtinShared) parts.push(builtinShared.content);

    const builtinStep = await this.prisma.agentRule.findFirst({
      where: { agentName, isBuiltin: true },
    });
    if (builtinStep && agentName !== 'shared') parts.push(builtinStep.content);

    if (projectId && userId) {
      try {
        await this.ownership.ensureProjectOwner(projectId, userId);
        const projectRule = await this.prisma.agentRule.findFirst({
          where: { agentName, projectId, isBuiltin: false },
        });
        if (projectRule) parts.push(projectRule.content);
      } catch {}
    }

    return parts.join('\n\n---\n\n');
  }
}
