import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsInt, IsUUID, Min, Max, ValidateIf, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface, Validate } from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Validador personalizado para UUID opcional o null
@ValidatorConstraint({ name: 'isUuidOrNull', async: false })
export class IsUuidOrNullConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    // Si es null o undefined, es válido
    if (value === null || value === undefined) {
      return true;
    }
    // Si es un string, validar como UUID
    if (typeof value === 'string') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value);
    }
    return false;
  }

  defaultMessage(args: ValidationArguments) {
    return 'parentCategoryId must be a UUID or null';
  }
}

export class ListCategoriesDto {
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

  @ApiPropertyOptional({ description: 'Filtrar solo categorías globales', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  globalOnly?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por activo', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por categoría padre (null para categorías raíz)', example: '11111111-1111-1111-1111-111111111111' })
  @Transform(({ value }) => {
    // Convertir string "null" a null real
    if (value === 'null') {
      return null;
    }
    // Si está vacío, retornar undefined para que @IsOptional lo maneje
    if (value === '' || value === undefined) {
      return undefined;
    }
    // Mantener el valor si es un string (UUID)
    return value;
  })
  @IsOptional()
  @Validate(IsUuidOrNullConstraint)
  parentCategoryId?: string | null;

  @ApiPropertyOptional({ description: 'Buscar por nombre', example: 'Bebidas' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Ordenar por', example: 'display_order', enum: ['display_order', 'name', 'created_at'] })
  @IsOptional()
  @IsString()
  sortBy?: string = 'display_order';

  @ApiPropertyOptional({ description: 'Orden', example: 'asc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}

