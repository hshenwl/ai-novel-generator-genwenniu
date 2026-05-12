import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DeAIFlavorService } from './deai-flavor.service';
import { FlavorCategory, FlavorIntensity, FlavorExecutionInput } from './deai-flavor.types';

@ApiTags('AI去味')
@ApiBearerAuth()
@Controller('api/deai-flavor')
export class DeAIFlavorController {
  constructor(private readonly service: DeAIFlavorService) {}

  @Get('modes')
  @ApiOperation({ summary: '获取所有去味模式' })
  getModes() {
    return this.service.getAllModes();
  }

  @Get('modes/summary')
  @ApiOperation({ summary: '获取去味模式摘要' })
  getModeSummary() {
    return this.service.getModeSummary();
  }

  @Get('modes/by-intensity')
  @ApiOperation({ summary: '按强度获取去味模式' })
  getModesByIntensity(@Query('intensity') intensity: FlavorIntensity) {
    return this.service.getModesByIntensity(intensity);
  }

  @Get('modes/by-category')
  @ApiOperation({ summary: '按类别获取去味模式' })
  getModesByCategory(@Query('category') category: FlavorCategory) {
    return this.service.getModesByCategory(category);
  }

  @Post('detect')
  @ApiOperation({ summary: '仅检测AI味问题（不修改）' })
  detect(@Body() input: FlavorExecutionInput) {
    return this.service.detectOnly(input);
  }

  @Post('execute')
  @ApiOperation({ summary: '执行AI去味（检测+基础清理）' })
  execute(@Body() input: FlavorExecutionInput) {
    return this.service.execute(input);
  }
}
