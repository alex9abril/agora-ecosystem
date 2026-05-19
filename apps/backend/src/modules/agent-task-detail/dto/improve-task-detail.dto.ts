import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ImproveTaskDetailDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32000)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32000)
  context?: string;

  @IsOptional()
  @IsIn(['expand', 'rewrite'])
  mode?: 'expand' | 'rewrite';
}
