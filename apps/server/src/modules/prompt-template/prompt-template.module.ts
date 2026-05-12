import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma';
import { AuthModule } from '../auth/auth.module';
import { PromptTemplateController } from './prompt-template.controller';
import { PromptTemplateService } from './prompt-template.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PromptTemplateController],
  providers: [PromptTemplateService],
  exports: [PromptTemplateService],
})
export class PromptTemplateModule {}
