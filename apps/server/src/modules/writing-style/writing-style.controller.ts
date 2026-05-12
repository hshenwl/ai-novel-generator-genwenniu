import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { WritingStyleService } from './writing-style.service';
import { CreateWritingStyleDto, UpdateWritingStyleDto } from './dto';

@ApiTags('写作风格')
@ApiBearerAuth()
@Controller('api/writing-styles')
export class WritingStyleController {
  constructor(private readonly service: WritingStyleService) {}

  @Get()
  @ApiOperation({ summary: '获取写作风格列表' })
  @ApiQuery({ name: 'genre', required: false })
  async findAll(
    @CurrentUser() user: CurrentUserInfo,
    @Query('genre') genre?: string,
  ) {
    return this.service.findAll(user.userId, genre);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取风格详情' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findOne(id, user.userId);
  }

  @Post()
  @ApiOperation({ summary: '创建写作风格' })
  async create(@Body() dto: CreateWritingStyleDto, @CurrentUser() user: CurrentUserInfo) {
    return this.service.create(dto, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新写作风格' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWritingStyleDto,
    @CurrentUser() user: CurrentUserInfo,
  ) {
    return this.service.update(id, dto, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除写作风格' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.remove(id, user.userId);
  }

  @Post('seed-builtin')
  @ApiOperation({ summary: '初始化内置写作风格' })
  async seedBuiltin() {
    return this.service.seedBuiltinStyles();
  }

  @Get('builtin/list')
  @ApiOperation({ summary: '获取内置风格列表' })
  async getBuiltin() {
    return this.service.getBuiltinStyles();
  }
}
