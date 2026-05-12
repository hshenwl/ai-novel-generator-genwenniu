import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { VolumeService } from './volume.service';

@ApiTags('卷纲管理')
@ApiBearerAuth()
@Controller('api/volumes')
export class VolumeController {
  constructor(private readonly service: VolumeService) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: '获取项目的卷纲列表' })
  async findByProject(@Param('projectId') projectId: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findByProject(projectId, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取卷纲详情' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findOne(id, user.userId);
  }

  @Post()
  @ApiOperation({ summary: '创建卷纲' })
  async create(@Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.create(data, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新卷纲' })
  async update(@Param('id') id: string, @Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.update(id, data, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除卷纲' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.remove(id, user.userId);
  }
}
