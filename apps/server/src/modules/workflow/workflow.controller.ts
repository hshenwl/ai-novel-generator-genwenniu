import { Controller, Get, Post, Body, Param, Sse } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { WorkflowService } from './workflow.service';
import { Observable } from 'rxjs';

@ApiTags('工作流管理')
@ApiBearerAuth()
@Controller('api/workflows')
export class WorkflowController {
  constructor(private readonly service: WorkflowService) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: '获取项目的工作流列表' })
  async findByProject(@Param('projectId') projectId: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findByProject(projectId, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取工作流详情' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findOne(id, user.userId);
  }

  @Post('start')
  @ApiOperation({ summary: '启动工作流' })
  async start(@Body() data: { projectId: string; chapterId?: string; type: string; mode?: string }, @CurrentUser() user: CurrentUserInfo) {
    return this.service.start(data, user.userId);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: '暂停工作流' })
  async pause(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.pause(id, user.userId);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: '恢复工作流' })
  async resume(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.resume(id, user.userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消工作流' })
  async cancel(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.cancel(id, user.userId);
  }

  @Sse(':id/stream')
  @ApiOperation({ summary: '工作流进度流' })
  async stream(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo): Promise<Observable<MessageEvent>> {
    return this.service.getProgressStream(id, user.userId);
  }
}
