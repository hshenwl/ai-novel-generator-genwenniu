import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { QualityCenterService } from './quality-center.service';

@ApiTags('质量中心')
@ApiBearerAuth()
@Controller('api/quality-center')
export class QualityCenterController {
  constructor(private readonly service: QualityCenterService) {}

  @Get('chapter/:chapterId')
  @ApiOperation({ summary: '获取章节质量报告' })
  async getChapterQuality(
    @Param('chapterId') chapterId: string,
    @CurrentUser() user: CurrentUserInfo,
  ) {
    return this.service.getChapterQuality(chapterId, user.userId);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: '获取项目全部章节质量报告' })
  async getProjectQuality(
    @Param('projectId') projectId: string,
    @CurrentUser() user: CurrentUserInfo,
  ) {
    return this.service.getProjectQuality(projectId, user.userId);
  }

  @Post('quick-rewrite')
  @ApiOperation({ summary: '一键重写' })
  async quickRewrite(
    @Body() body: { chapterId: string; route?: string },
    @CurrentUser() user: CurrentUserInfo,
  ) {
    return this.service.quickRewrite(body.chapterId, user.userId, body.route as any);
  }
}
