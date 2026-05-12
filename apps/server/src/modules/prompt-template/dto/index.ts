import { IsString, IsOptional, IsBoolean, IsNumber, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePromptTemplateDto {
  @ApiProperty({ description: '模板名称' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ description: '分类', example: '大纲/卷纲/章纲/正文/审核/润色' })
  @IsString()
  category: string;

  @ApiProperty({ description: '提示词内容' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '变量列表，JSON数组字符串', example: '["title","genre"]' })
  @IsOptional()
  @IsString()
  variables?: string;

  @ApiPropertyOptional({ description: '标签，逗号分隔' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ description: '所属项目ID' })
  @IsOptional()
  @IsString()
  projectId?: string;
}

export class UpdatePromptTemplateDto {
  @ApiPropertyOptional({ description: '模板名称' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ description: '分类' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '提示词内容' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '变量列表' })
  @IsOptional()
  @IsString()
  variables?: string;

  @ApiPropertyOptional({ description: '标签' })
  @IsOptional()
  @IsString()
  tags?: string;
}
