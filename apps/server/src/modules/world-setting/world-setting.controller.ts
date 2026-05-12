import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { WorldSettingService } from './world-setting.service';

@ApiTags('世界设定')
@ApiBearerAuth()
@Controller('api/world-settings')
export class WorldSettingController {
  constructor(private readonly service: WorldSettingService) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: '获取项目的世界设定' })
  async findByProject(@Param('projectId') projectId: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findByProject(projectId, user.userId);
  }

  @Post('project/:projectId')
  @ApiOperation({ summary: '创建世界设定' })
  async create(@Param('projectId') projectId: string, @Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.create(projectId, data, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新世界设定' })
  async update(@Param('id') id: string, @Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.update(id, data, user.userId);
  }
}
