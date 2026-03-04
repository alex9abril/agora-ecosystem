import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsObject, IsUUID } from 'class-validator';

export class UpdateStoreDto {
  @ApiPropertyOptional({ description: 'Nombre para mostrar' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Si la tienda está activa (publicada)', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'ID del motivo de deshabilitación (requerido al deshabilitar)' })
  @IsOptional()
  @IsUUID()
  disableReasonId?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales al deshabilitar' })
  @IsOptional()
  @IsString()
  disableNotes?: string;

  @ApiPropertyOptional({ description: 'Configuración adicional (JSON)' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
