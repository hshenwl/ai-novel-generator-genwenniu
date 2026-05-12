import { Controller, Get, Post, Body, Param, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { ExportService } from './export.service';

@ApiTags('导入导出')
@ApiBearerAuth()
@Controller('api/export')
export class ExportController {
  constructor(private readonly service: ExportService) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: '导出项目数据' })
  async exportProject(
    @Param('projectId') projectId: string,
    @Query('format') format: string = 'json',
    @CurrentUser() user: CurrentUserInfo,
    @Res() res: any,
  ) {
    const result = await this.service.exportProject(projectId, format, user.userId);
    
    const contentTypes: Record<string, string> = {
      json: 'application/json',
      txt: 'text/plain',
      md: 'text/markdown',
      markdown: 'text/markdown',
    };

    const extensions: Record<string, string> = {
      json: 'json',
      txt: 'txt',
      md: 'md',
      markdown: 'md',
    };

    res.set({
      'Content-Type': contentTypes[format] || 'text/plain',
      'Content-Disposition': `attachment; filename="novel-export.${extensions[format] || 'txt'}"`,
    });
    res.send(result.content);
  }

  @Get('characters/:projectId')
  @ApiOperation({ summary: '导出角色卡片' })
  async exportCharacters(
    @Param('projectId') projectId: string,
    @CurrentUser() user: CurrentUserInfo,
    @Res() res: any,
  ) {
    const result = await this.service.exportCharacters(projectId, user.userId);
    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="characters.json"',
    });
    res.send(result);
  }

  @Get('audit-reports/:projectId')
  @ApiOperation({ summary: '导出审核报告' })
  async exportAuditReports(
    @Param('projectId') projectId: string,
    @CurrentUser() user: CurrentUserInfo,
    @Res() res: any,
  ) {
    const result = await this.service.exportAuditReports(projectId, user.userId);
    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="audit-reports.json"',
    });
    res.send(result);
  }
}
