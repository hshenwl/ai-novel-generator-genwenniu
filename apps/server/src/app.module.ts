import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectModule } from './modules/project/project.module';
import { WorldSettingModule } from './modules/world-setting/world-setting.module';
import { OutlineModule } from './modules/outline/outline.module';
import { VolumeModule } from './modules/volume/volume.module';
import { ChapterOutlineModule } from './modules/chapter-outline/chapter-outline.module';
import { ChapterModule } from './modules/chapter/chapter.module';
import { CharacterModule } from './modules/character/character.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { ForeshadowModule } from './modules/foreshadow/foreshadow.module';
import { HookModule } from './modules/hook/hook.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { TaskModule } from './modules/task/task.module';
import { ModelConfigModule } from './modules/model-config/model-config.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { EngineModule } from './modules/engine/engine.module';
import { AuditReportModule } from './modules/audit-report/audit-report.module';
import { PromptTemplateModule } from './modules/prompt-template/prompt-template.module';
import { WritingStyleModule } from './modules/writing-style/writing-style.module';
import { CareerModule } from './modules/career/career.module';
import { CharacterRelationshipModule } from './modules/character-relationship/character-relationship.module';
import { InspirationModule } from './modules/inspiration/inspiration.module';
import { RevisionRecordModule } from './modules/revision-record/revision-record.module';
import { ExportModule } from './modules/export/export.module';
import { DeAIFlavorModule } from './modules/deai-flavor/deai-flavor.module';
import { HotRankModule } from './modules/hot-rank/hot-rank.module';
import { QualityCenterModule } from './modules/quality-center/quality-center.module';
import { AgentRuleModule } from './modules/agent-rule/agent-rule.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [
        () => ({
          APP_MODE: process.env.APP_MODE || 'local',
          PORT: parseInt(process.env.PORT || '18765', 10),
          DATABASE_URL: process.env.DATABASE_URL || 'file:./data/novel.db',
          STORAGE_DRIVER: process.env.STORAGE_DRIVER || 'local',
          STORAGE_LOCAL_PATH: process.env.STORAGE_LOCAL_PATH || './uploads',
          QUEUE_DRIVER: process.env.QUEUE_DRIVER || 'sqlite',
          AUTH_MODE: process.env.AUTH_MODE || 'local',
          JWT_SECRET: process.env.JWT_SECRET,
          JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
          KNOWLEDGE_PATH: process.env.KNOWLEDGE_PATH || '../knowledge',
          KNOWLEDGE_RETRIEVAL_MODE: process.env.KNOWLEDGE_RETRIEVAL_MODE || 'fts',
          OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
          APP_SECRET: process.env.APP_SECRET,
        }),
      ],
    }),
    PrismaModule,
    AuthModule,
    ProjectModule,
    WorldSettingModule,
    OutlineModule,
    VolumeModule,
    ChapterOutlineModule,
    ChapterModule,
    CharacterModule,
    OrganizationModule,
    ForeshadowModule,
    HookModule,
    WorkflowModule,
    TaskModule,
    ModelConfigModule,
    KnowledgeModule,
    EngineModule,
    AuditReportModule,
    PromptTemplateModule,
    WritingStyleModule,
    CareerModule,
    CharacterRelationshipModule,
    InspirationModule,
    RevisionRecordModule,
    ExportModule,
    DeAIFlavorModule,
    HotRankModule,
    QualityCenterModule,
    AgentRuleModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
