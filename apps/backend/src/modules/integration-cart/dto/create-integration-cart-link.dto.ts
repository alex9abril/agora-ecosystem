import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

const TTL_MAX = 30 * 24 * 3600;
const TTL_MIN = 60;

export class CreateIntegrationCartLinkDto {
  @ApiPropertyOptional({
    description: `Vida útil del enlace en segundos (${TTL_MIN}–${TTL_MAX}). No puede superar la expiración del carrito.`,
    minimum: TTL_MIN,
    maximum: TTL_MAX,
    default: 7 * 24 * 3600,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(TTL_MIN)
  @Max(TTL_MAX)
  ttlSeconds?: number;

  @ApiPropertyOptional({
    description:
      'Ruta relativa en el sitio (FRONTEND_URL). Si se envía, tiene prioridad sobre la ruta derivada de storeId. Ej: /carrito/integracion',
    example: '/carrito/integracion',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  path?: string;

  @ApiPropertyOptional({
    description:
      'ID de core.stores. Obligatorio si no se envía path: debe coincidir con el store_id del carrito; el backend arma la ruta (ej. /sucursal/{slug}/cart). Si se envía path, es opcional pero si viene debe coincidir con el carrito.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'storeId debe ser un UUID válido' })
  storeId?: string;
}
