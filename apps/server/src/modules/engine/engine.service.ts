// ============================================================
// 引擎服务 - 统一管理AI Gateway、七步创作引擎、知识库、工作流引擎
// ============================================================

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIGateway, FLASK_PROVIDERS } from '@ai-novel/ai-gateway';
import { SevenStepEngine } from '@ai-novel/seven-step-engine';
import { FTS5KnowledgeBase } from '@ai-novel/knowledge-base';
import { WorkflowExecutor } from '@ai-novel/workflow-engine';
import { PrismaDatabaseProvider } from '../../common/knowledge-db';
import { PrismaService } from '../../common/prisma';
import { EncryptionService } from '../../common/auth';
import { FeedbackCollector } from './feedback-collector.service';
import { ParamOptimizer } from './param-optimizer.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EngineService implements OnModuleInit, OnModuleDestroy {
  private aiGateway!: AIGateway;
  private sevenStepEngine!: SevenStepEngine;
  private knowledgeBase!: FTS5KnowledgeBase;
  private workflowExecutor!: WorkflowExecutor;

  constructor(
    private configService: ConfigService,
    private dbProvider: PrismaDatabaseProvider,
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private feedbackCollector: FeedbackCollector,
    private paramOptimizer: ParamOptimizer,
  ) {}

  async onModuleInit() {
    // 初始化AI Gateway
    this.aiGateway = new AIGateway();

    // 初始化知识库
    const knowledgePath = this.configService.get<string>(
      'KNOWLEDGE_PATH',
      this.configService.get<string>('npm_config_knowledge_path', './knowledge')
    );
    this.knowledgeBase = new FTS5KnowledgeBase(this.dbProvider, knowledgePath);
    await this.knowledgeBase.initialize();

    // 注册AI模型（数据库用户模型 → 本地Flask → Ollama）
    await this.registerDefaultModels();

    // 使用实际注册的模型名初始化七步引擎
    this.rebuildSevenStepEngine();

    // 初始化工作流执行器
    this.workflowExecutor = new WorkflowExecutor(this.aiGateway, this.sevenStepEngine);

    console.log('Engine service initialized');
    console.log('  Registered models:', this.aiGateway.getRegisteredProviders());
    console.log('  Default model:', this.aiGateway.getDefaultProvider());
  }

  async onModuleDestroy() {
    await this.knowledgeBase?.close();
  }

  /**
   * 注册默认AI模型配置（数据库用户模型 + 本地Flask API）
   * 优先级：用户数据库模型 > 本地Flask API > 环境变量远程模型
   */
  private async registerDefaultModels() {
    // 1. 从数据库加载用户配置的模型（最高优先级）
    await this.loadUserModels();

    // 2. 注册本地 Flask API 服务（作为备选）
    for (const [key, fc] of Object.entries(FLASK_PROVIDERS)) {
      if (key === 'ollama') continue;
      this.aiGateway.registerProvider(`flask-${key}`, {
        id: `flask-${key}`,
        name: `本地${fc.displayName}`,
        provider: 'flask' as any,
        modelId: fc.defaultModel,
        baseUrl: `http://127.0.0.1:${fc.port}`,
        maxTokens: 4096,
        temperature: 0.7,
      });
    }

    // 3. 注册 Ollama（本地）
    this.aiGateway.registerProvider('ollama', {
      id: 'ollama',
      name: 'Ollama',
      provider: 'ollama' as any,
      modelId: 'llama3',
      baseUrl: 'http://127.0.0.1:11434/v1',
      maxTokens: 4096,
      temperature: 0.7,
    });

    // 设置默认模型（用户数据库模型 > Flask > Ollama）
    const registered = this.aiGateway.getRegisteredProviders();
    const userModels = registered.filter(r => r.startsWith('user-'));
    if (userModels.length > 0) {
      this.aiGateway.setDefaultProvider(userModels[0]);
    } else {
      const fallbacks = ['flask-gemini', 'flask-deepseek', 'flask-chatgpt', 'ollama'];
      for (const f of fallbacks) {
        if (registered.includes(f)) { this.aiGateway.setDefaultProvider(f); break; }
      }
    }
  }

  /**
   * 从数据库加载用户通过"模型配置"页面保存的AI模型
   */
  private async loadUserModels() {
    try {
      const configs = await this.prisma.modelConfig.findMany({ take: 50 });
      if (configs.length === 0) return;

      const providerMap: Record<string, string> = {
        openai: 'openai',
        anthropic: 'anthropic',
        claude: 'anthropic',
        google: 'google',
        gemini: 'google',
        deepseek: 'deepseek',
        tongyi: 'openai',       // 通义兼容OpenAI格式
        zhipu: 'openai',        // 智谱兼容OpenAI格式
        wenxin: 'openai',       // 文心兼容OpenAI格式
        ollama: 'ollama',
      };

      let registeredCount = 0;
      for (const config of configs) {
        try {
          const providerType = providerMap[config.provider] || 'openai';
          const apiKey = config.apiKey
            ? (this.encryption.decrypt(config.apiKey) || config.apiKey)
            : undefined;
          const providerId = `user-${config.name}`;

          this.aiGateway.registerProvider(providerId, {
            id: providerId,
            name: config.name,
            provider: providerType as any,
            modelId: config.modelId,
            apiKey,
            baseUrl: config.baseUrl || undefined,
            maxTokens: config.maxTokens || 4096,
            temperature: config.temperature ?? 0.7,
          });

          if (config.isDefault) {
            this.aiGateway.setDefaultProvider(providerId);
          }
          registeredCount++;
        } catch (e) {
          console.warn(`Failed to load user model ${config.name}:`, (e as Error).message);
        }
      }

      // 如果没有设置过默认模型，用第一个用户模型
      if (registeredCount > 0 && !this.aiGateway.getDefaultProvider()) {
        const firstUser = `user-${configs[0].name}`;
        this.aiGateway.setDefaultProvider(firstUser);
      }

      console.log(`Loaded ${registeredCount} user model(s) from database`);
    } catch (e) {
      console.warn('Failed to load user models from database:', (e as Error).message);
    }
  }

  // ========== AI Gateway ==========

  getAIGateway(): AIGateway {
    return this.aiGateway;
  }

  registerModel(name: string, config: any, _userId?: string) {
    this.aiGateway.registerProvider(name, config);
  }

  setDefaultModel(name: string, _userId?: string) {
    this.aiGateway.setDefaultProvider(name);
  }

  getRegisteredModels(): string[] {
    return this.aiGateway.getRegisteredProviders();
  }

  /**
   * 重新加载用户模型（供模型配置变更后调用）
   */
  async reloadUserModels() {
    await this.loadUserModels();
    this.rebuildSevenStepEngine();
  }

  /**
   * 用当前注册的默认模型重建七步引擎
   */
  private rebuildSevenStepEngine() {
    const defaultModel = this.aiGateway.getDefaultProvider() || 'default';
    this.sevenStepEngine = new SevenStepEngine(this.aiGateway, {
      plannerModel: defaultModel,
      writerModel: defaultModel,
      readerModel: defaultModel,
      editorModel: defaultModel,
      auditorModel: defaultModel,
      reviserModel: defaultModel,
    });
    console.log(`[Engine] SevenStepEngine rebuilt with default model: ${defaultModel}`);
  }

  // ========== 知识库 ==========

  getKnowledgeBase(): FTS5KnowledgeBase {
    return this.knowledgeBase;
  }

  async searchKnowledge(query: string, options?: any) {
    return this.knowledgeBase.search(query, options);
  }

  async getKnowledgeByScenario(scenario: string) {
    return this.knowledgeBase.recommendByScenario(scenario as any);
  }

  async getKnowledgeStats() {
    return this.knowledgeBase.getStats();
  }

  // ========== 七步创作引擎 ==========

  getSevenStepEngine(): SevenStepEngine {
    return this.sevenStepEngine;
  }

  // ========== 工作流 ==========

  getWorkflowExecutor(): WorkflowExecutor {
    return this.workflowExecutor;
  }

  createWorkflow(projectId: string, type: string, mode: string, config?: any) {
    return this.workflowExecutor.createInstance(projectId, type, mode, config);
  }

  async startWorkflow(workflowId: string, context: any, options?: { taskType?: string; genre?: string; userId?: string; model?: string }) {
    // 1. 获取推荐参数
    const taskType = options?.taskType || context.task || 'chapter';
    const genre = options?.genre || context.genre;
    const optimalParams = await this.paramOptimizer.getOptimalParams(taskType, genre, options?.userId);

    // 2. 如果前端指定了模型，临时切换默认模型
    const originalDefault = this.aiGateway.getDefaultProvider();
    if (options?.model && this.aiGateway.getRegisteredProviders().includes(options.model)) {
      this.aiGateway.setDefaultProvider(options.model);
    } else if (optimalParams.modelName && this.aiGateway.getRegisteredProviders().includes(optimalParams.modelName)) {
      this.aiGateway.setDefaultProvider(optimalParams.modelName);
    }

    // 3. 从数据库补充完整的 CreationContext
    const fullContext = await this.buildFullContext(context);

    // 4. 启动工作流
    const instance = await this.workflowExecutor.start(workflowId, fullContext);

    // 5. 恢复原始默认模型
    try { this.aiGateway.setDefaultProvider(originalDefault); } catch {}

    // 6. 工作流完成后自动采集反馈
    if (instance.status === 'completed' || instance.status === 'failed') {
      await this.feedbackCollector.recordFromWorkflow({
        projectId: context.projectId,
        workflowId,
        taskType,
        genre,
        modelName: options?.model || optimalParams.modelName || originalDefault,
        workflowMode: instance.mode,
        result: { success: instance.status === 'completed', content: instance.result, metadata: {} },
        stepHistory: instance.stepHistory || [],
      });
    }

    return instance;
  }

  /**
   * 从数据库构建完整的 CreationContext
   */
  private async buildFullContext(rawContext: any): Promise<any> {
    const projectId = rawContext.projectId;
    if (!projectId) {
      return {
        ...rawContext,
        projectName: rawContext.projectName || rawContext.prompt || '未命名',
        genre: rawContext.genre || '玄幻',
        perspective: rawContext.perspective || '第三人称',
        characters: [],
        organizations: [],
        foreshadows: [],
        hooks: [],
      };
    }

    try {
      // 从数据库加载项目和关联数据
      const [project, worldSetting, outline, characters, organizations, foreshadows, hooks] = await Promise.all([
        this.prisma.project.findUnique({ where: { id: projectId } }),
        this.prisma.worldSetting.findUnique({ where: { projectId } }),
        this.prisma.outline.findUnique({ where: { projectId } }),
        this.prisma.character.findMany({ where: { projectId }, take: 50 }),
        this.prisma.organization.findMany({ where: { projectId }, take: 20 }),
        this.prisma.foreshadow.findMany({ where: { projectId }, take: 50 }),
        this.prisma.hook.findMany({ where: { projectId }, take: 50 }),
      ]);

      return {
        ...rawContext,
        projectId,
        projectName: project?.name || rawContext.projectName || '未命名',
        genre: project?.genre || rawContext.genre || '玄幻',
        perspective: project?.perspective || rawContext.perspective || '第三人称',
        worldSetting: worldSetting?.background || rawContext.worldSetting || '',
        outline: outline?.content || rawContext.outline || '',
        characters: (characters || []).map(c => ({
          id: c.id, name: c.name, role: c.role, description: c.personality || '',
          characterVoice: c.characterVoice || '', status: c.status || 'active',
        })),
        organizations: (organizations || []).map(o => ({
          id: o.id, name: o.name, type: o.type || '', description: o.description || '',
        })),
        foreshadows: (foreshadows || []).map(f => ({
          id: f.id, name: f.name, type: f.type || '', status: f.status || 'planted',
          plantedChapter: f.plantedChapter || undefined, expectedChapter: f.expectedChapter || undefined,
        })),
        hooks: (hooks || []).map(h => ({
          id: h.id, name: h.name, type: h.type, status: h.status || 'new',
          strengthScore: h.strengthScore || undefined,
        })),
      };
    } catch (e) {
      console.warn('Failed to build full context from DB:', (e as Error).message);
      return {
        ...rawContext,
        projectName: rawContext.projectName || '未命名',
        genre: rawContext.genre || '玄幻',
        perspective: rawContext.perspective || '第三人称',
        characters: [],
        organizations: [],
        foreshadows: [],
        hooks: [],
      };
    }
  }

  async pauseWorkflow(workflowId: string, _userId?: string) {
    return this.workflowExecutor.pause(workflowId);
  }

  async resumeWorkflow(workflowId: string, _userId?: string) {
    return this.workflowExecutor.resume(workflowId);
  }

  getWorkflow(workflowId: string, _userId?: string) {
    return this.workflowExecutor.getInstance(workflowId);
  }

  getProjectWorkflows(projectId: string, _userId?: string) {
    return this.workflowExecutor.getProjectInstances(projectId);
  }

  // ========== 自动调参 ==========

  getFeedbackCollector() {
    return this.feedbackCollector;
  }

  getParamOptimizer() {
    return this.paramOptimizer;
  }

  async getOptimalParams(taskType: string, genre?: string, userId?: string) {
    return this.paramOptimizer.getOptimalParams(taskType, genre, userId);
  }

  // ========== 统计 ==========

  getAIStats(since?: Date) {
    return this.aiGateway.getStats(since);
  }

  getAICallRecords(limit?: number) {
    return this.aiGateway.getRecords(limit);
  }
}
