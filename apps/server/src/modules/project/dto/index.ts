import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ description: '项目名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '小说类型' })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional({ description: '叙事视角' })
  @IsOptional()
  @IsString()
  perspective?: string;

  @ApiPropertyOptional({ description: '项目描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '目标字数', default: 500000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  targetWords?: number;
}

export class UpdateProjectDto {
  @ApiPropertyOptional({ description: '项目名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '小说类型' })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional({ description: '叙事视角' })
  @IsOptional()
  @IsString()
  perspective?: string;

  @ApiPropertyOptional({ description: '项目描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '目标字数' })
  @IsOptional()
  @IsInt()
  @Min(1)
  targetWords?: number;

  @ApiPropertyOptional({ description: '项目状态' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class ProjectQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({ description: '项目状态' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '小说类型' })
  @IsOptional()
  @IsString()
  genre?: string;
}