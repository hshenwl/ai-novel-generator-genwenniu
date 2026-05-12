import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWritingStyleDto {
  @ApiProperty({ description: '风格名称' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: '适用类型', example: '都市/玄幻/脑洞/' })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional({ description: '叙事视角', example: '第一人称/第三人称' })
  @IsOptional()
  @IsString()
  perspective?: string;

  @ApiPropertyOptional({ description: '语言特点' })
  @IsOptional()
  @IsString()
  languageStyle?: string;

  @ApiPropertyOptional({ description: '节奏特点' })
  @IsOptional()
  @IsString()
  paceStyle?: string;

  @ApiPropertyOptional({ description: 'Hook要求' })
  @IsOptional()
  @IsString()
  hookStyle?: string;

  @ApiPropertyOptional({ description: '禁用表达' })
  @IsOptional()
  @IsString()
  forbiddenExpr?: string;

  @ApiPropertyOptional({ description: '示例文本' })
  @IsOptional()
  @IsString()
  sampleText?: string;

  @ApiPropertyOptional({ description: 'Prompt模板' })
  @IsOptional()
  @IsString()
  promptTemplate?: string;

  @ApiPropertyOptional({ description: '所属项目ID' })
  @IsOptional()
  @IsString()
  projectId?: string;
}

export class UpdateWritingStyleDto {
  @ApiPropertyOptional({ description: '风格名称' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ description: '适用类型' })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional({ description: '叙事视角' })
  @IsOptional()
  @IsString()
  perspective?: string;

  @ApiPropertyOptional({ description: '语言特点' })
  @IsOptional()
  @IsString()
  languageStyle?: string;

  @ApiPropertyOptional({ description: '节奏特点' })
  @IsOptional()
  @IsString()
  paceStyle?: string;

  @ApiPropertyOptional({ description: 'Hook要求' })
  @IsOptional()
  @IsString()
  hookStyle?: string;

  @ApiPropertyOptional({ description: '禁用表达' })
  @IsOptional()
  @IsString()
  forbiddenExpr?: string;

  @ApiPropertyOptional({ description: '示例文本' })
  @IsOptional()
  @IsString()
  sampleText?: string;

  @ApiPropertyOptional({ description: 'Prompt模板' })
  @IsOptional()
  @IsString()
  promptTemplate?: string;
}
