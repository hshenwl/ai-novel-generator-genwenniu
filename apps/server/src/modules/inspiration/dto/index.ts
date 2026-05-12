import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export class CreateInspirationDto {
  @IsString()
  @MaxLength(100)
  title: string;

  @IsString()
  @IsIn(['创意', '标题', '开局', '金手指', '反派', '桥段', '世界观', '卖点', 'Hook', '伏笔'])
  type: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  @IsIn(['draft', 'used'])
  status?: string;
}

export class UpdateInspirationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  @IsIn(['draft', 'used'])
  status?: string;
}
