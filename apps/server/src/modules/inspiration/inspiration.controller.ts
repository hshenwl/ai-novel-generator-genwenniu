import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { InspirationService } from './inspiration.service';

@ApiTags('灵感')
@ApiBearerAuth()
@Controller('api/inspirations')
export class InspirationController {
  constructor(private readonly service: InspirationService) {}

  @Get()
  @ApiOperation({ summary: '获取灵感列表' })
  async findAll(@CurrentUser() user: CurrentUserInfo, @Query('projectId') projectId?: string, @Query('type') type?: string) {
    return this.service.findAll(user.userId, projectId, type);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取灵感详情' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findOne(id, user.userId);
  }

  @Post()
  @ApiOperation({ summary: '创建灵感' })
  async create(@Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.create(data, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新灵感' })
  async update(@Param('id') id: string, @Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.update(id, data, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除灵感' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.remove(id, user.userId);
  }
}
