import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsInt, IsUUID, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

const STORE_TYPES = ['global', 'group', 'branch', 'group_brand', 'global_brand'] as const;

export class ListStoresDto {
  @ApiPropertyOptional({ description: 'Página', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Elementos por página', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Tipo de tienda', enum: STORE_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(STORE_TYPES)
  type?: string;

  @ApiPropertyOptional({ description: 'ID del grupo empresarial' })
  @IsOptional()
  @IsUUID()
  businessGroupId?: string;

  @ApiPropertyOptional({ description: 'ID de la sucursal' })
  @IsOptional()
  @IsUUID()
  businessId?: string;

  @ApiPropertyOptional({ description: 'ID de la marca de vehículo' })
  @IsOptional()
  @IsUUID()
  vehicleBrandId?: string;

  @ApiPropertyOptional({ description: 'Solo tiendas activas', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Buscar por nombre o slug', example: 'toyota' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Incluir tiendas archivadas (por defecto no)', example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeArchived?: boolean;
}
