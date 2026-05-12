import { Module } from '@nestjs/common';
import { DeAIFlavorService } from './deai-flavor.service';
import { DeAIFlavorController } from './deai-flavor.controller';

@Module({
  controllers: [DeAIFlavorController],
  providers: [DeAIFlavorService],
  exports: [DeAIFlavorService],
})
export class DeAIFlavorModule {}
