import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsIn, IsUUID, IsOptional } from 'class-validator';

const STORE_TYPES = ['group', 'branch', 'group_brand'] as const;

export class CreateStoreDto {
  @ApiProperty({ description: 'Tipo de tienda', enum: STORE_TYPES })
  @IsString()
  @IsIn(STORE_TYPES)
  type: 'group' | 'branch' | 'group_brand';

  @ApiPropertyOptional({ description: 'ID del grupo (requerido para type group y group_brand)' })
  @IsOptional()
  @IsUUID()
  businessGroupId?: string;

  @ApiPropertyOptional({ description: 'ID de la sucursal (requerido para type branch)' })
  @IsOptional()
  @IsUUID()
  businessId?: string;

  @ApiPropertyOptional({ description: 'ID de la marca de vehículo (requerido para type group_brand)' })
  @IsOptional()
  @IsUUID()
  vehicleBrandId?: string;
}
