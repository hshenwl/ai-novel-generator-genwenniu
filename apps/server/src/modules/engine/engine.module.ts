// ============================================================
// 引擎模块 - 集成AI Gateway、七步创作引擎、知识库、工作流引擎
// ============================================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../common/prisma';
import { KnowledgeDbModule } from '../../common/knowledge-db/knowledge-db.module';
import { AuthModule } from '../auth/auth.module';
import { TaskModule } from '../task/task.module';
import { EngineController } from './engine.controller';
import { EngineService } from './engine.service';
import { FeedbackCollector } from './feedback-collector.service';
import { ParamOptimizer } from './param-optimizer.service';

@Module({
  imports: [ConfigModule, PrismaModule, KnowledgeDbModule, AuthModule, TaskModule],
  controllers: [EngineController],
  providers: [EngineService, FeedbackCollector, ParamOptimizer],
  exports: [EngineService, FeedbackCollector, ParamOptimizer],
})
export class EngineModule {}
