import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { KnowledgeService } from './knowledge.service';

@ApiTags('知识库管理')
@ApiBearerAuth()
@Controller('api/knowledge')
export class KnowledgeController {
  constructor(private readonly service: KnowledgeService) {}

  @Get('categories')
  @ApiOperation({ summary: '获取知识库分类列表' })
  async getCategories() {
    return this.service.getCategories();
  }

  @Get('files')
  @ApiOperation({ summary: '获取知识库文件列表' })
  async getFiles(@Query('category') category?: string) {
    return this.service.getFiles(category);
  }

  @Get('files/:id')
  @ApiOperation({ summary: '获取知识库文件详情' })
  async getFile(@Param('id') id: string) {
    return this.service.getFile(id);
  }

  @Post('search')
  @ApiOperation({ summary: '搜索知识库（支持FTS和向量两种模式）' })
  async search(
    @Body() data: { query: string; mode?: 'fts' | 'vector' | 'hybrid'; limit?: number },
  ) {
    const results = await this.service.search(data.query, data.mode, data.limit);
    return { results, query: data.query, mode: data.mode || 'fts', total: results.length };
  }

  @Post('index')
  @ApiOperation({ summary: '索引知识库文件' })
  async indexFiles(@Body() data?: { category?: string; force?: boolean }, @CurrentUser() user?: CurrentUserInfo) {
    const d = data || {};
    return this.service.indexFiles(d.category, d.force);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取知识库统计信息' })
  async getStats() {
    return this.service.getStats();
  }
}