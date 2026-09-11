import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Allow, IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export type DataBridgeTestExportTableName =
  | 'prueba_inventory_export'
  | 'prueba_mex_insurance_prices_export';

export class UploadDataBridgeTestExportDto {
  @ApiProperty({ enum: ['prueba_inventory_export', 'prueba_mex_insurance_prices_export'] })
  @IsString()
  @IsIn(['prueba_inventory_export', 'prueba_mex_insurance_prices_export'])
  tableName!: DataBridgeTestExportTableName;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  sourceFileName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  importBatchId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  clearExisting?: boolean;

  @ApiProperty({ type: [Object] })
  @IsArray()
  @Allow()
  @Type(() => Object)
  rows!: unknown[];
}
