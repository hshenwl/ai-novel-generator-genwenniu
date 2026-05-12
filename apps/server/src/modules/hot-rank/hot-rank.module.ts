import { Module } from '@nestjs/common';
import { EngineModule } from '../engine/engine.module';
import { HotRankController } from './hot-rank.controller';
import { HotRankService } from './hot-rank.service';

@Module({
  imports: [EngineModule],
  controllers: [HotRankController],
  providers: [HotRankService],
})
export class HotRankModule {}
