import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { CharacterRelationshipService } from './character-relationship.service';
import { CreateCharacterRelationshipDto, UpdateCharacterRelationshipDto } from './dto';

@ApiTags('关系图谱')
@ApiBearerAuth()
@Controller('api/character-relationships')
export class CharacterRelationshipController {
  constructor(private readonly service: CharacterRelationshipService) {}

  @Get()
  @ApiOperation({ summary: '获取关系列表' })
  async findAll(@Query('projectId') projectId: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findAll(projectId, user.userId);
  }

  @Get('graph')
  @ApiOperation({ summary: '获取关系图谱数据' })
  async getGraph(@Query('projectId') projectId: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.getGraph(projectId, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取关系详情' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findOne(id, user.userId);
  }

  @Post()
  @ApiOperation({ summary: '创建关系' })
  async create(@Body() data: CreateCharacterRelationshipDto, @CurrentUser() user: CurrentUserInfo) {
    return this.service.create(data, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新关系' })
  async update(@Param('id') id: string, @Body() data: UpdateCharacterRelationshipDto, @CurrentUser() user: CurrentUserInfo) {
    return this.service.update(id, data, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除关系' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.remove(id, user.userId);
  }
}
