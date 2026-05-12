import { Controller, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HotRankService } from './hot-rank.service';

@ApiTags('热榜分析')
@ApiBearerAuth()
@Controller('api/hot-rank')
export class HotRankController {
  constructor(private readonly service: HotRankService) {}

  @Post('analyze')
  @ApiOperation({ summary: '执行热榜分析' })
  async analyze(
    @Body() body: { platform: string; analysisType: string; model?: string },
  ) {
    return this.service.analyze(body.platform, body.analysisType, body.model);
  }
}
