import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuditReportDto {
  @ApiProperty({ description: '项目ID' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: '章节ID' })
  @IsString()
  chapterId: string;

  @ApiPropertyOptional({ description: '工作流ID' })
  @IsString()
  @IsOptional()
  workflowId?: string;

  @ApiProperty({ description: '总分' })
  @IsNumber()
  totalScore: number;

  @ApiProperty({ description: '20维度评分(JSON)' })
  @IsString()
  dimensionScores: string;

  @ApiProperty({ description: '问题列表' })
  @IsString()
  issues: string;

  @ApiProperty({ description: '修改建议' })
  @IsString()
  suggestions: string;

  @ApiProperty({ description: '通过状态', enum: ['PASS', 'MINOR_REVISE', 'MAJOR_REVISE', 'REWRITE', 'BLOCKED'] })
  @IsString()
  @IsIn(['PASS', 'MINOR_REVISE', 'MAJOR_REVISE', 'REWRITE', 'BLOCKED'])
  passStatus: string;

  @ApiPropertyOptional({ description: '审核模型' })
  @IsString()
  @IsOptional()
  auditorModel?: string;
}

export class UpdateAuditReportDto {
  @ApiPropertyOptional({ description: '总分' })
  @IsNumber()
  @IsOptional()
  totalScore?: number;

  @ApiPropertyOptional({ description: '20维度评分(JSON)' })
  @IsString()
  @IsOptional()
  dimensionScores?: string;

  @ApiPropertyOptional({ description: '问题列表' })
  @IsString()
  @IsOptional()
  issues?: string;

  @ApiPropertyOptional({ description: '修改建议' })
  @IsString()
  @IsOptional()
  suggestions?: string;

  @ApiPropertyOptional({ description: '通过状态' })
  @IsString()
  @IsOptional()
  @IsIn(['PASS', 'MINOR_REVISE', 'MAJOR_REVISE', 'REWRITE', 'BLOCKED'])
  passStatus?: string;

  @ApiPropertyOptional({ description: '审核模型' })
  @IsString()
  @IsOptional()
  auditorModel?: string;
}
