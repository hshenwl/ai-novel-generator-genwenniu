import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { OutlineService } from './outline.service';

@ApiTags('小说总纲')
@ApiBearerAuth()
@Controller('api/outlines')
export class OutlineController {
  constructor(private readonly service: OutlineService) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: '获取项目的总纲' })
  async findByProject(@Param('projectId') projectId: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findByProject(projectId, user.userId);
  }

  @Post('project/:projectId')
  @ApiOperation({ summary: '创建总纲' })
  async create(@Param('projectId') projectId: string, @Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.create(projectId, data, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新总纲' })
  async update(@Param('id') id: string, @Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.update(id, data, user.userId);
  }
}
