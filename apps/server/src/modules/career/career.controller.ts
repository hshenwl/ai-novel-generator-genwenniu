import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { CareerService } from './career.service';
import { CreateCareerDto, UpdateCareerDto } from './dto';

@ApiTags('职业管理')
@ApiBearerAuth()
@Controller('api/careers')
export class CareerController {
  constructor(private readonly service: CareerService) {}

  @Get()
  @ApiOperation({ summary: '获取职业列表' })
  async findAll(@Query('projectId') projectId: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findAll(projectId, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取职业详情' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findOne(id, user.userId);
  }

  @Post()
  @ApiOperation({ summary: '创建职业' })
  async create(@Body() data: CreateCareerDto, @CurrentUser() user: CurrentUserInfo) {
    return this.service.create(data, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新职业' })
  async update(@Param('id') id: string, @Body() data: UpdateCareerDto, @CurrentUser() user: CurrentUserInfo) {
    return this.service.update(id, data, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除职业' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.remove(id, user.userId);
  }
}
