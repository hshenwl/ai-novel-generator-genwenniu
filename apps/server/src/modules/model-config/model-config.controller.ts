import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { ModelConfigService } from './model-config.service';

@ApiTags('模型配置')
@ApiBearerAuth()
@Controller('api/model-configs')
export class ModelConfigController {
  constructor(private readonly service: ModelConfigService) {}

  @Get()
  @ApiOperation({ summary: '获取模型配置列表' })
  async findAll(@CurrentUser() user: CurrentUserInfo) {
    return this.service.findAll(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取模型配置详情' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findOne(id, user.userId);
  }

  @Post()
  @ApiOperation({ summary: '创建模型配置' })
  async create(@Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.create(data, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新模型配置' })
  async update(@Param('id') id: string, @Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.update(id, data, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除模型配置' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.remove(id, user.userId);
  }

  @Post(':id/set-default')
  @ApiOperation({ summary: '设为默认模型' })
  async setDefault(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.setDefault(id, user.userId);
  }
}
