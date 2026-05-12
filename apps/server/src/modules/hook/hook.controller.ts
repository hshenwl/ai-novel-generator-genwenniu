import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { HookService } from './hook.service';

@ApiTags('Hook管理')
@ApiBearerAuth()
@Controller('api/hooks')
export class HookController {
  constructor(private readonly service: HookService) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: '获取项目的Hook列表' })
  async findByProject(
    @Param('projectId') projectId: string,
    @CurrentUser() user: CurrentUserInfo,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.service.findByProject(projectId, user.userId, status, type);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取Hook详情' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findOne(id, user.userId);
  }

  @Post()
  @ApiOperation({ summary: '创建Hook' })
  async create(@Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.create(data, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新Hook' })
  async update(@Param('id') id: string, @Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.update(id, data, user.userId);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: '兑现Hook' })
  async resolve(@Param('id') id: string, @Body() data: { chapter: number }, @CurrentUser() user: CurrentUserInfo) {
    return this.service.resolve(id, data.chapter, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除Hook' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.remove(id, user.userId);
  }
}
