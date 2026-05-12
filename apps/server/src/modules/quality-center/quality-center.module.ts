import { Module } from '@nestjs/common';
import { EngineModule } from '../engine/engine.module';
import { PrismaModule } from '../../common/prisma';
import { QualityCenterController } from './quality-center.controller';
import { QualityCenterService } from './quality-center.service';

@Module({
  imports: [PrismaModule, EngineModule],
  controllers: [QualityCenterController],
  providers: [QualityCenterService],
})
export class QualityCenterModule {}
