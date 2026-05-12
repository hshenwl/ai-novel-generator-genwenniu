import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { ChapterService } from './chapter.service';

@ApiTags('章节管理')
@ApiBearerAuth()
@Controller('api/chapters')
export class ChapterController {
  constructor(private readonly service: ChapterService) {}

  @Get('volume/:volumeId')
  @ApiOperation({ summary: '获取卷的章节列表' })
  async findByVolume(@Param('volumeId') volumeId: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findByVolume(volumeId, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取章节详情' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findOne(id, user.userId);
  }

  @Post()
  @ApiOperation({ summary: '创建章节' })
  async create(@Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.create(data, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新章节' })
  async update(@Param('id') id: string, @Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.update(id, data, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除章节' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.remove(id, user.userId);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: '发布章节' })
  async publish(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.publish(id, user.userId);
  }
}
