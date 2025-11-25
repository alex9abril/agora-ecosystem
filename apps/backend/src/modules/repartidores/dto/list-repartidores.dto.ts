import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListRepartidoresDto {
  @ApiPropertyOptional({ description: 'Página actual', example: 1, default: 1 })
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

  @ApiPropertyOptional({ description: 'Filtrar por disponible', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por activo', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por verificado', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por repartidor ecológico', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isGreen?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por tipo de vehículo', example: 'bicycle' })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiPropertyOptional({ description: 'Buscar por nombre', example: 'Juan' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Ordenar por', example: 'created_at', enum: ['created_at', 'rating_average', 'total_deliveries', 'last_location_update'] })
  @IsOptional()
  @IsString()
  sortBy?: string = 'created_at';

  @ApiPropertyOptional({ description: 'Orden', example: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

