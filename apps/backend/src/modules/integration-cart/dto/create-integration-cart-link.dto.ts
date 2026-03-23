import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
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
      'Ruta relativa en el sitio (FRONTEND_URL). Ej: /carrito/integracion. Por defecto INTEGRATION_CART_WEB_PATH o /carrito/integracion',
    example: '/carrito/integracion',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  path?: string;
}
