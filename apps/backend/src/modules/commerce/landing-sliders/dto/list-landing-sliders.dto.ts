import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsInt, Min, Matches } from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Formato UUID (cualquier versión, acepta ej. 00000001-0000-0000-0000-000000000001)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toOptionalUuid(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const s = Array.isArray(value) ? value[0] : value;
  return typeof s === 'string' ? s : undefined;
}

export class ListLandingSlidersDto {
  @ApiPropertyOptional({ 
    description: 'Filtrar por grupo empresarial',
    example: '00000001-0000-0000-0000-000000000001'
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalUuid(value))
  @Matches(UUID_REGEX, { message: 'business_group_id must be a UUID' })
  business_group_id?: string;

  @ApiPropertyOptional({ 
    description: 'Filtrar por sucursal',
    example: '00000001-0000-0000-0000-000000000001'
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalUuid(value))
  @Matches(UUID_REGEX, { message: 'business_id must be a UUID' })
  business_id?: string;

  @ApiPropertyOptional({ 
    description: 'Filtrar por marca de vehículo.',
    example: '00000001-0000-0000-0000-000000000001'
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalUuid(value))
  @Matches(UUID_REGEX, { message: 'vehicle_brand_id must be a UUID' })
  vehicle_brand_id?: string;

  @ApiPropertyOptional({ 
    description: 'Si true, listar solo sliders globales (sin grupo, sucursal ni marca).',
    example: false
  })
  @IsOptional()
  @Transform(({ value }) => (value === true || value === 'true') ? true : undefined)
  @IsBoolean()
  only_global?: boolean;

  @ApiPropertyOptional({ 
    description: 'Solo mostrar sliders activos',
    example: true,
    default: false
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Por defecto incluimos inactivos para que la UI de gestión siempre vea todo
    if (value === undefined || value === null || value === '') return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return Boolean(value);
  })
  @IsBoolean()
  only_active?: boolean;

  @ApiPropertyOptional({ 
    description: 'Número de página',
    example: 1,
    default: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ 
    description: 'Límite de resultados por página',
    example: 20,
    default: 20
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

