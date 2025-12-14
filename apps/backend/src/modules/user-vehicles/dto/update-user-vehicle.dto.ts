import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, Matches } from 'class-validator';

// Expresión regular para validar formato UUID (cualquier versión)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class UpdateUserVehicleDto {
  @ApiPropertyOptional({ description: 'ID de la marca del vehículo', example: '00000001-0000-0000-0000-000000000001' })
  @IsOptional()
  @Matches(UUID_REGEX, { message: 'vehicle_brand_id must be a UUID' })
  vehicle_brand_id?: string;

  @ApiPropertyOptional({ description: 'ID del modelo del vehículo', example: '00000001-0000-0000-0000-000000000010' })
  @IsOptional()
  @Matches(UUID_REGEX, { message: 'vehicle_model_id must be a UUID' })
  vehicle_model_id?: string;

  @ApiPropertyOptional({ description: 'ID del año/generación del vehículo', example: '00000001-0000-0000-0000-000000000100' })
  @IsOptional()
  @Matches(UUID_REGEX, { message: 'vehicle_year_id must be a UUID' })
  vehicle_year_id?: string;

  @ApiPropertyOptional({ description: 'ID de la especificación técnica del vehículo', example: '00000001-0000-0000-0000-000000000200' })
  @IsOptional()
  @Matches(UUID_REGEX, { message: 'vehicle_spec_id must be a UUID' })
  vehicle_spec_id?: string;

  @ApiPropertyOptional({ description: 'Nombre personalizado del vehículo', example: 'Mi Corolla' })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiPropertyOptional({ description: 'Establecer como vehículo predeterminado', default: false })
  @IsBoolean()
  @IsOptional()
  is_default?: boolean;
}

