import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class MergeDataBridgeTestExportsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  mergeBatchId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  clearExisting?: boolean;
}
