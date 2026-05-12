import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma';
import { AuthModule } from '../auth/auth.module';
import { EngineModule } from '../engine/engine.module';
import { ModelConfigController } from './model-config.controller';
import { ModelConfigService } from './model-config.service';

@Module({
  imports: [PrismaModule, AuthModule, EngineModule],
  controllers: [ModelConfigController],
  providers: [ModelConfigService],
  exports: [ModelConfigService],
})
export class ModelConfigModule {}
