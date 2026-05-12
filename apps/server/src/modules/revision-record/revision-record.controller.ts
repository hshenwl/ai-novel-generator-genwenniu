import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { RevisionRecordService } from './revision-record.service';

@ApiTags('修订记录')
@ApiBearerAuth()
@Controller('api/revision-records')
export class RevisionRecordController {
  constructor(private readonly service: RevisionRecordService) {}

  @Get()
  @ApiOperation({ summary: '获取修订记录列表' })
  async findAll(
    @CurrentUser() user: CurrentUserInfo,
    @Query('chapterId') chapterId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.service.findAll(user.userId, { chapterId, projectId });
  }

  @Get(':id')
  @ApiOperation({ summary: '获取修订记录详情' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findOne(id, user.userId);
  }

  @Post()
  @ApiOperation({ summary: '创建修订记录' })
  async create(@Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.create(data, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新修订记录' })
  async update(@Param('id') id: string, @Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.update(id, data, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除修订记录' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.remove(id, user.userId);
  }
}
