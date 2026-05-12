import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma';
import { AgentRuleController } from './agent-rule.controller';
import { AgentRuleService } from './agent-rule.service';

@Module({
  imports: [PrismaModule],
  controllers: [AgentRuleController],
  providers: [AgentRuleService],
})
export class AgentRuleModule {}
