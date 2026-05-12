import { Module } from '@nestjs/common';
import { ChapterOutlineController } from './chapter-outline.controller';
import { ChapterOutlineService } from './chapter-outline.service';

@Module({
  controllers: [ChapterOutlineController],
  providers: [ChapterOutlineService],
  exports: [ChapterOutlineService],
})
export class ChapterOutlineModule {}