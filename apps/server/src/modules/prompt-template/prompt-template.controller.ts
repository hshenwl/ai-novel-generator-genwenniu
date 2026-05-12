import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { PromptTemplateService } from './prompt-template.service';
import { CreatePromptTemplateDto, UpdatePromptTemplateDto } from './dto';

@ApiTags('提示词模板')
@ApiBearerAuth()
@Controller('api/prompt-templates')
export class PromptTemplateController {
  constructor(private readonly service: PromptTemplateService) {}

  @Get()
  @ApiOperation({ summary: '获取提示词模板列表' })
  @ApiQuery({ name: 'category', required: false })
  async findAll(
    @CurrentUser() user: CurrentUserInfo,
    @Query('category') category?: string,
  ) {
    return this.service.findAll(user.userId, category);
  }

  @Get('categories')
  @ApiOperation({ summary: '获取分类列表' })
  async getCategories() {
    return this.service.getCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取模板详情' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findOne(id, user.userId);
  }

  @Post()
  @ApiOperation({ summary: '创建提示词模板' })
  async create(@Body() dto: CreatePromptTemplateDto, @CurrentUser() user: CurrentUserInfo) {
    return this.service.create(dto, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新提示词模板' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePromptTemplateDto,
    @CurrentUser() user: CurrentUserInfo,
  ) {
    return this.service.update(id, dto, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除提示词模板' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.remove(id, user.userId);
  }
}
