// ============================================================
// 引擎控制器 - 提供AI、知识库、工作流API接口
// 支持：模型管理、知识库检索、工作流创建执行、SSE实时进度
// ============================================================

import { Controller, Get, Post, Body, Param, Query, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { EngineService } from './engine.service';

@ApiTags('AI引擎')
@ApiBearerAuth()
@Controller('api/engine')
export class EngineController {
  constructor(private readonly engineService: EngineService) {}

  // ========== AI模型管理 ==========

  @Get('models')
  getModels() {
    return {
      models: this.engineService.getRegisteredModels(),
      default: this.engineService.getAIGateway().getDefaultProvider(),
      configs: this.engineService.getAIGateway().getAllConfigs(),
    };
  }

  @Post('models/register')
  registerModel(@Body() body: { name: string; config: any }, @CurrentUser() user: CurrentUserInfo) {
    this.engineService.registerModel(body.name, body.config, user.userId);
    return { success: true };
  }

  @Post('models/default')
  setDefaultModel(@Body() body: { name: string }, @CurrentUser() user: CurrentUserInfo) {
    this.engineService.setDefaultModel(body.name, user.userId);
    return { success: true };
  }

  // ========== AI统计 ==========

  @Get('stats')
  getStats(@Query('since') since?: string) {
    const sinceDate = since ? new Date(since) : undefined;
    return this.engineService.getAIStats(sinceDate);
  }

  @Get('records')
  getRecords(@Query('limit') limit?: string) {
    return {
      records: this.engineService.getAICallRecords(limit ? parseInt(limit) : 100),
    };
  }

  // ========== 知识库 ==========

  @Get('knowledge/search')
  async searchKnowledge(
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('dirs') dirs?: string,
  ) {
    const results = await this.engineService.searchKnowledge(query, {
      limit: limit ? parseInt(limit) : 10,
      directories: dirs ? dirs.split(',') : [],
    });
    return { results };
  }

  @Get('knowledge/scenario/:scenario')
  async getKnowledgeByScenario(@Param('scenario') scenario: string) {
    const files = await this.engineService.getKnowledgeByScenario(scenario);
    return { files };
  }

  @Get('knowledge/stats')
  async getKnowledgeStats() {
    return this.engineService.getKnowledgeStats();
  }

  // ========== 章节生成 ==========

  @Post('chapter/generate')
  async generateChapter(@Body() body: {
    projectId: string;
    chapterId?: string;
    context: any;
    mode?: string;
    chapterNo?: number;
    targetWords?: number;
    model?: string;
  }, @CurrentUser() user: CurrentUserInfo) {
    const instance = this.engineService.createWorkflow(
      body.projectId,
      'chapter_generation',
      body.mode || 'standard',
      { chapterId: body.chapterId },
    );

    const result = await this.engineService.startWorkflow(instance.id, {
      ...body.context,
      projectId: body.projectId,
      chapterId: body.chapterId,
    }, {
      taskType: body.context?.task || 'chapter',
      genre: body.context?.genre,
      model: body.model,
      userId: user.userId,
    });

    return { workflow: result };
  }

  // ========== 工作流管理 ==========

  @Post('workflow/create')
  createWorkflow(@Body() body: {
    projectId: string;
    type: string;
    mode: string;
    config?: any;
  }, @CurrentUser() user: CurrentUserInfo) {
    const instance = this.engineService.createWorkflow(
      body.projectId,
      body.type,
      body.mode,
      body.config,
    );
    return { workflow: instance };
  }

  @Post('workflow/:id/start')
  async startWorkflow(
    @Param('id') id: string,
    @Body() body: { context: any },
    @CurrentUser() user: CurrentUserInfo,
  ) {
    const instance = await this.engineService.startWorkflow(id, body.context, { userId: user.userId });
    return { workflow: instance };
  }

  @Post('workflow/:id/pause')
  pauseWorkflow(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    this.engineService.pauseWorkflow(id, user.userId);
    return { success: true };
  }

  @Post('workflow/:id/resume')
  async resumeWorkflow(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    const instance = await this.engineService.resumeWorkflow(id, user.userId);
    return { workflow: instance };
  }

  @Post('workflow/:id/cancel')
  cancelWorkflow(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    this.engineService.getWorkflowExecutor().cancel(id, user.userId);
    return { success: true };
  }

  @Get('workflow/:id')
  getWorkflow(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    const workflow = this.engineService.getWorkflow(id, user.userId);
    if (!workflow) {
      return { error: 'Workflow not found' };
    }
    return { workflow };
  }

  @Get('workflow/project/:projectId')
  getProjectWorkflows(@Param('projectId') projectId: string, @CurrentUser() user: CurrentUserInfo) {
    return {
      workflows: this.engineService.getProjectWorkflows(projectId, user.userId),
    };
  }

  // ========== SSE实时推送 ==========

  @Sse('workflow/:id/stream')
  workflowStream(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo): Observable<MessageEvent> {
    const workflow = this.engineService.getWorkflow(id, user.userId);
    if (!workflow) {
      return new Observable<MessageEvent>(subscriber => {
        subscriber.next({ data: JSON.stringify({ error: 'Workflow not found' }) } as MessageEvent);
        subscriber.complete();
      });
    }
    return new Observable<MessageEvent>((subscriber) => {
      const executor = this.engineService.getWorkflowExecutor();

      const listener = (event: any) => {
        if (event.instanceId === id) {
          subscriber.next({
            data: JSON.stringify(event),
          } as MessageEvent);

          // 终止状态时关闭流
          if (
            event.type === 'completed' ||
            event.type === 'failed' ||
            event.type === 'blocked'
          ) {
            subscriber.complete();
          }
        }
      };

      executor.addEventListener(listener);

      if (workflow) {
        subscriber.next({
          data: JSON.stringify({
            type: 'status',
            instanceId: id,
            status: workflow.status,
            progress: workflow.progress,
            currentStep: workflow.currentStep,
            stepHistory: workflow.stepHistory,
          }),
        } as MessageEvent);
      }

      // 清理
      return () => {
        executor.removeEventListener(listener);
      };
    });
  }

  // ========== 自动调参 ==========

  @Get('tuning/params')
  async getTuningParams(
    @Query('taskType') taskType: string,
    @Query('genre') genre?: string,
  ) {
    return this.engineService.getOptimalParams(taskType, genre);
  }

  @Get('tuning/feedback')
  async getFeedback(
    @Query('taskType') taskType?: string,
    @Query('limit') limit?: string,
  ) {
    const collector = this.engineService.getFeedbackCollector();
    return collector.getFeedback({
      taskType,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get('tuning/trends')
  async getTrends(@Query('days') days?: string, @Query('projectId') projectId?: string) {
    const collector = this.engineService.getFeedbackCollector();
    return collector.getTrends(projectId, days ? parseInt(days) : 30);
  }

  @Get('tuning/models')
  async getModelComparison(@Query('projectId') projectId?: string) {
    const collector = this.engineService.getFeedbackCollector();
    return collector.getModelComparison(projectId);
  }

  @Get('tuning/dimensions')
  async getDimensionAnalysis(@Query('projectId') projectId?: string) {
    const collector = this.engineService.getFeedbackCollector();
    return collector.getDimensionAnalysis(projectId);
  }

  @Post('tuning/override')
  async setOverride(@Body() body: { taskType: string; genre?: string; paramName: string; paramValue: string }, @CurrentUser() user: CurrentUserInfo) {
    const optimizer = this.engineService.getParamOptimizer();
    await optimizer.setOverride(user.userId, body);
    return { success: true };
  }

  @Post('tuning/recalculate')
  async recalculate() {
    const optimizer = this.engineService.getParamOptimizer();
    return optimizer.recalculate();
  }
}
