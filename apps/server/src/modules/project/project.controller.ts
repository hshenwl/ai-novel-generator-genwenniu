import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { ProjectService } from './project.service';
import { CreateProjectDto, UpdateProjectDto, ProjectQueryDto } from './dto';

@ApiTags('项目管理')
@ApiBearerAuth()
@Controller('api/projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @ApiOperation({ summary: '获取项目列表' })
  @ApiResponse({ status: 200, description: '返回项目列表' })
  async findAll(@Query() query: ProjectQueryDto, @CurrentUser() user: CurrentUserInfo) {
    return this.projectService.findAll(query, user.userId);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取全局统计' })
  @ApiResponse({ status: 200, description: '返回全局统计数据' })
  async getGlobalStats(@CurrentUser() user: CurrentUserInfo) {
    return this.projectService.getGlobalStats(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取项目详情' })
  @ApiResponse({ status: 200, description: '返回项目详情' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.projectService.findOne(id, user.userId);
  }

  @Post()
  @ApiOperation({ summary: '创建项目' })
  @ApiResponse({ status: 201, description: '项目创建成功' })
  async create(@Body() dto: CreateProjectDto, @CurrentUser() user: CurrentUserInfo) {
    return this.projectService.create(dto, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新项目' })
  @ApiResponse({ status: 200, description: '项目更新成功' })
  async update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @CurrentUser() user: CurrentUserInfo) {
    return this.projectService.update(id, dto, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除项目' })
  @ApiResponse({ status: 200, description: '项目删除成功' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.projectService.remove(id, user.userId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: '获取项目统计' })
  @ApiResponse({ status: 200, description: '返回项目统计数据' })
  async getStats(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.projectService.getStats(id, user.userId);
  }
}
