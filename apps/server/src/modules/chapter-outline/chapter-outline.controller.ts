import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { ChapterOutlineService } from './chapter-outline.service';

@ApiTags('章纲管理')
@ApiBearerAuth()
@Controller('api/chapter-outlines')
export class ChapterOutlineController {
  constructor(private readonly service: ChapterOutlineService) {}

  @Get('volume/:volumeId')
  @ApiOperation({ summary: '获取卷的章纲列表' })
  async findByVolume(@Param('volumeId') volumeId: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findByVolume(volumeId, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取章纲详情' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findOne(id, user.userId);
  }

  @Post()
  @ApiOperation({ summary: '创建章纲' })
  async create(@Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.create(data, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新章纲' })
  async update(@Param('id') id: string, @Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.update(id, data, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除章纲' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.remove(id, user.userId);
  }
}
