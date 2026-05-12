import { Module } from '@nestjs/common';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { GlobalLogService } from './global-log.service';

@Module({
  controllers: [TaskController],
  providers: [TaskService, GlobalLogService],
  exports: [TaskService, GlobalLogService],
})
export class TaskModule {}