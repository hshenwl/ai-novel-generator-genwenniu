import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { OwnershipService } from '../../common/auth/ownership.service';

const BUILTIN_STYLES = [
  {
    name: '番茄风第一人称',
    genre: '都市脑洞',
    perspective: '第一人称',
    isBuiltin: true,
    rules: JSON.stringify([
      '第一人称强代入，读者即主角',
      '开篇3句内进入矛盾/冲突',
      '章末必须有强Hook，制造追读期待',
      '情绪直接表达，不绕弯子',
      '爽点密集，每1000字至少1个',
      '对白口语化、接地气',
      '少长段设定说明，设定融入情节',
      '禁文艺腔、AI腔、总结腔',
      '强化即时感受，少心理描写多行动',
      '强化目标/压力/选择/反应循环',
    ]),
    deAIFlavorIntensity: 'strong',
    deAIFlavorCategories: ['A', 'B', 'C', 'D', 'E'],
  },
  {
    name: '起点升级流第三人称',
    genre: '玄幻',
    perspective: '第三人称',
    isBuiltin: true,
    rules: JSON.stringify([
      '第三人称有限视角，紧贴主角',
      '升级节奏明快，每章有进展',
      '金手指/系统明确，能力体系清晰',
      '爽点：突破/击败/获得/认可',
      '对白简洁有力',
      '禁AI总结腔',
    ]),
    deAIFlavorIntensity: 'standard',
    deAIFlavorCategories: ['A', 'B', 'C'],
  },
  {
    name: '都市脑洞爽文风',
    genre: '都市',
    perspective: '第一人称',
    isBuiltin: true,
    rules: JSON.stringify([
      '脑洞大开，设定新奇',
      '爽点频繁，打脸/逆袭/震惊三连',
      '现代背景，接地气',
      '对白网感强',
    ]),
    deAIFlavorIntensity: 'standard',
    deAIFlavorCategories: ['A', 'B', 'C'],
  },
  {
    name: '修仙升级流',
    genre: '仙侠',
    perspective: '第三人称',
    isBuiltin: true,
    rules: JSON.stringify([
      '境界体系严谨',
      '修炼描写有画面感',
      '战力对比清晰',
      '机缘/奇遇推动升级',
    ]),
    deAIFlavorIntensity: 'light',
    deAIFlavorCategories: ['A'],
  },
  {
    name: '悬疑强钩子风',
    genre: '悬疑',
    perspective: '第一人称',
    isBuiltin: true,
    rules: JSON.stringify([
      '每章至少一个悬念/反转',
      '信息控制严格，读者与主角同步',
      '伏笔密集，长线回收',
      '气氛营造细腻',
    ]),
    deAIFlavorIntensity: 'standard',
    deAIFlavorCategories: ['A', 'B', 'C'],
  },
  {
    name: '细腻情绪流',
    genre: '言情',
    perspective: '第一人称',
    isBuiltin: true,
    rules: JSON.stringify([
      '情绪描写细腻真实',
      '心理活动有代入感',
      '对话含蓄有张力',
      '节奏舒缓有起伏',
    ]),
    deAIFlavorIntensity: 'light',
    deAIFlavorCategories: ['A'],
  },
  {
    name: '轻松吐槽流',
    genre: '搞笑',
    perspective: '第一人称',
    isBuiltin: true,
    rules: JSON.stringify([
      '吐槽犀利，网感强',
      '反转出人意料',
      '对白密集且有梗',
      '轻松不刻意',
    ]),
    deAIFlavorIntensity: 'light',
    deAIFlavorCategories: ['A'],
  },
];

@Injectable()
export class WritingStyleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, genre?: string) {
    const where: any = { OR: [{ projectId: null }, { project: { userId } }] };
    if (genre) where.genre = genre;

    return this.prisma.writingStyle.findMany({
      where,
      orderBy: [{ isBuiltin: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  async findOne(id: string, userId: string) {
    const style = await this.prisma.writingStyle.findUnique({ where: { id } });
    if (!style) throw new NotFoundException('写作风格不存在');
    if (style.isBuiltin) return style;
    if (style.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: style.projectId, userId, deletedAt: null },
        select: { id: true },
      });
      if (!project) throw new NotFoundException('写作风格不存在或无权访问');
    }
    return style;
  }

  async create(data: any, userId: string) {
    return this.prisma.writingStyle.create({
      data: { ...data, isBuiltin: false },
    });
  }

  async update(id: string, data: any, userId: string) {
    const style = await this.prisma.writingStyle.findUnique({ where: { id } });
    if (!style) throw new NotFoundException('写作风格不存在');
    if (style.isBuiltin) throw new ForbiddenException('内置风格不可修改');
    if (style.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: style.projectId, userId, deletedAt: null },
        select: { id: true },
      });
      if (!project) throw new NotFoundException('写作风格不存在或无权访问');
    }
    return this.prisma.writingStyle.update({ where: { id }, data: OwnershipService.stripOwnershipFields(data) });
  }

  async remove(id: string, userId: string) {
    const style = await this.prisma.writingStyle.findUnique({ where: { id } });
    if (!style) throw new NotFoundException('写作风格不存在');
    if (style.isBuiltin) throw new ForbiddenException('内置风格不可删除');
    if (style.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: style.projectId, userId, deletedAt: null },
        select: { id: true },
      });
      if (!project) throw new NotFoundException('写作风格不存在或无权访问');
    }
    await this.prisma.writingStyle.delete({ where: { id } });
    return { success: true };
  }

  async seedBuiltinStyles() {
    let seeded = 0;
    for (const style of BUILTIN_STYLES) {
      const existing = await this.prisma.writingStyle.findFirst({
        where: { name: style.name, isBuiltin: true },
      });
      if (!existing) {
        const data: any = { ...style };
        if (Array.isArray(data.deAIFlavorCategories)) {
          data.deAIFlavorCategories = JSON.stringify(data.deAIFlavorCategories);
        }
        await this.prisma.writingStyle.create({ data });
        seeded++;
      }
    }
    return { seeded, total: BUILTIN_STYLES.length };
  }

  async getBuiltinStyles() {
    return this.prisma.writingStyle.findMany({
      where: { isBuiltin: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
