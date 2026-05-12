import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { ForeshadowService } from './foreshadow.service';

@ApiTags('伏笔管理')
@ApiBearerAuth()
@Controller('api/foreshadows')
export class ForeshadowController {
  constructor(private readonly service: ForeshadowService) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: '获取项目的伏笔列表' })
  async findByProject(
    @Param('projectId') projectId: string,
    @CurrentUser() user: CurrentUserInfo,
    @Query('status') status?: string,
  ) {
    return this.service.findByProject(projectId, user.userId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取伏笔详情' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findOne(id, user.userId);
  }

  @Post()
  @ApiOperation({ summary: '创建伏笔' })
  async create(@Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.create(data, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新伏笔' })
  async update(@Param('id') id: string, @Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.update(id, data, user.userId);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: '回收伏笔' })
  async resolve(@Param('id') id: string, @Body() data: { chapter: number }, @CurrentUser() user: CurrentUserInfo) {
    return this.service.resolve(id, data.chapter, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除伏笔' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.remove(id, user.userId);
  }
}
