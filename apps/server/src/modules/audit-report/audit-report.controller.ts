import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { AuditReportService } from './audit-report.service';
import { CreateAuditReportDto, UpdateAuditReportDto } from './dto';

@ApiTags('审核报告')
@ApiBearerAuth()
@Controller('api/audit-reports')
export class AuditReportController {
  constructor(private readonly service: AuditReportService) {}

  @Get()
  @ApiOperation({ summary: '获取审核报告列表' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'passStatus', required: false })
  async findAll(
    @CurrentUser() user: CurrentUserInfo,
    @Query('projectId') projectId?: string,
    @Query('passStatus') passStatus?: string,
  ) {
    return this.service.findAll(user.userId, projectId, passStatus);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取审核报告详情' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findOne(id, user.userId);
  }

  @Get('chapter/:chapterId')
  @ApiOperation({ summary: '按章节获取审核报告' })
  async findByChapter(@Param('chapterId') chapterId: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findByChapter(chapterId, user.userId);
  }

  @Post()
  @ApiOperation({ summary: '创建审核报告' })
  async create(@Body() data: CreateAuditReportDto, @CurrentUser() user: CurrentUserInfo) {
    return this.service.create(data, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新审核报告' })
  async update(@Param('id') id: string, @Body() data: UpdateAuditReportDto, @CurrentUser() user: CurrentUserInfo) {
    return this.service.update(id, data, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除审核报告' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.remove(id, user.userId);
  }
}
