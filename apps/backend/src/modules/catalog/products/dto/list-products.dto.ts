import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsInt, IsUUID, Min, Max, ValidatorConstraint, ValidatorConstraintInterface, Validate } from 'class-validator';
import { Type } from 'class-transformer';

// Validador personalizado para UUID
@ValidatorConstraint({ name: 'isValidUuid', async: false })
export class IsValidUuidConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    // Si es undefined, es válido (manejado por @IsOptional)
    if (value === undefined || value === null) {
      return true;
    }
    // Si es un string, validar como UUID
    if (typeof value === 'string') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value);
    }
    return false;
  }

  defaultMessage() {
    return 'must be a valid UUID';
  }
}

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
  @Validate(IsValidUuidConstraint)
  businessId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por grupo empresarial (UUID)', example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @Validate(IsValidUuidConstraint)
  groupId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por sucursal (UUID)', example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @Validate(IsValidUuidConstraint)
  branchId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por categoría', example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @Validate(IsValidUuidConstraint)
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por compatibilidad - ID de marca de vehículo', example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @Validate(IsValidUuidConstraint)
  vehicleBrandId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por compatibilidad - ID de modelo de vehículo', example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @Validate(IsValidUuidConstraint)
  vehicleModelId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por compatibilidad - ID de año/generación', example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @Validate(IsValidUuidConstraint)
  vehicleYearId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por compatibilidad - ID de especificación técnica', example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @Validate(IsValidUuidConstraint)
  vehicleSpecId?: string;

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

