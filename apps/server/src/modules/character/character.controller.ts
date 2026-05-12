import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { CharacterService } from './character.service';

@ApiTags('角色管理')
@ApiBearerAuth()
@Controller('api/characters')
export class CharacterController {
  constructor(private readonly service: CharacterService) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: '获取项目的角色列表' })
  async findByProject(@Param('projectId') projectId: string, @CurrentUser() user: CurrentUserInfo, @Query('role') role?: string) {
    return this.service.findByProject(projectId, user.userId, role);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取角色详情' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findOne(id, user.userId);
  }

  @Post()
  @ApiOperation({ summary: '创建角色' })
  async create(@Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.create(data, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新角色' })
  async update(@Param('id') id: string, @Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.update(id, data, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除角色' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.remove(id, user.userId);
  }
}
