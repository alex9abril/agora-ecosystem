import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsInt, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListProductsDto {
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

  @ApiPropertyOptional({ description: 'Filtrar por negocio (UUID)', example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @IsUUID()
  businessId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por categoría', example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por disponible', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por destacado', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Buscar por nombre o descripción', example: 'Hamburguesa' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Ordenar por', example: 'display_order', enum: ['display_order', 'name', 'price', 'created_at'] })
  @IsOptional()
  @IsString()
  sortBy?: string = 'display_order';

  @ApiPropertyOptional({ description: 'Orden', example: 'asc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}

