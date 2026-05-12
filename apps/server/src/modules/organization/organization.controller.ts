import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { OrganizationService } from './organization.service';

@ApiTags('组织管理')
@ApiBearerAuth()
@Controller('api/organizations')
export class OrganizationController {
  constructor(private readonly service: OrganizationService) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: '获取项目的组织列表' })
  async findByProject(@Param('projectId') projectId: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findByProject(projectId, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取组织详情' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findOne(id, user.userId);
  }

  @Post()
  @ApiOperation({ summary: '创建组织' })
  async create(@Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.create(data, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新组织' })
  async update(@Param('id') id: string, @Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.update(id, data, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除组织' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.remove(id, user.userId);
  }
}
