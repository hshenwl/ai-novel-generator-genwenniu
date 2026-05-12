import { Module } from '@nestjs/common';
import { ForeshadowController } from './foreshadow.controller';
import { ForeshadowService } from './foreshadow.service';

@Module({
  controllers: [ForeshadowController],
  providers: [ForeshadowService],
  exports: [ForeshadowService],
})
export class ForeshadowModule {}