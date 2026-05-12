import { Module } from '@nestjs/common';
import { OutlineController } from './outline.controller';
import { OutlineService } from './outline.service';

@Module({
  controllers: [OutlineController],
  providers: [OutlineService],
  exports: [OutlineService],
})
export class OutlineModule {}