import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInfo } from '../../common/auth';
import { AgentRuleService } from './agent-rule.service';

@ApiTags('Agent规则')
@ApiBearerAuth()
@Controller('api/agent-rules')
export class AgentRuleController {
  constructor(private readonly service: AgentRuleService) {}

  @Get()
  @ApiOperation({ summary: '获取规则列表' })
  async findAll(
    @CurrentUser() user: CurrentUserInfo,
    @Query('projectId') projectId?: string,
  ) {
    return this.service.findAll(user.userId, projectId);
  }

  @Get('builtin')
  @ApiOperation({ summary: '获取内置规则列表' })
  getBuiltinRules() {
    return this.service.getBuiltinRules();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取规则详情' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.findOne(id, user.userId);
  }

  @Get(':agentName/compiled')
  @ApiOperation({ summary: '获取编译后的规则' })
  async getCompiled(
    @Param('agentName') agentName: string,
    @Query('projectId') projectId?: string,
    @CurrentUser() user?: CurrentUserInfo,
  ) {
    return this.service.getCompiledRule(agentName, projectId, user?.userId);
  }

  @Post()
  @ApiOperation({ summary: '创建规则' })
  async create(@Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.create(data, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新规则' })
  async update(@Param('id') id: string, @Body() data: any, @CurrentUser() user: CurrentUserInfo) {
    return this.service.update(id, data, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除规则' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.service.remove(id, user.userId);
  }
}
