import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { TaskService } from './task.service';
import { GlobalLogService } from './global-log.service';

@ApiTags('任务中心')
@ApiBearerAuth()
@Controller('api/tasks')
export class TaskController {
  constructor(
    private readonly service: TaskService,
    private readonly logService: GlobalLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取任务列表' })
  async findAll(
    @CurrentUser() user: CurrentUserInfo,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.service.findAll(user.userId, status, type);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取任务详情' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findOne(id, user.userId);
  }

  @Post()
  @ApiOperation({ summary: '创建任务' })
  async create(@Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.create(data, user.userId);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: '重试任务' })
  async retry(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.retry(id, user.userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消任务' })
  async cancel(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.cancel(id, user.userId);
  }

  @Get('logs/all')
  @ApiOperation({ summary: '获取全局日志' })
  async getGlobalLogs(
    @Query('level') level?: string,
    @Query('module') mod?: string,
    @Query('take') take?: string,
  ) {
    return this.logService.getLogs({
      level,
      module: mod,
      take: take ? parseInt(take) : 200,
    });
  }

  @Get('logs/stats')
  @ApiOperation({ summary: '获取日志统计' })
  async getLogStats() {
    return this.logService.getStats();
  }

  @Post('logs/clear')
  @ApiOperation({ summary: '清空日志' })
  async clearLogs() {
    this.logService.clear();
    return { success: true };
  }
}
