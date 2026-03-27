import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

const TTL_MAX = 30 * 24 * 3600;
const TTL_MIN = 60;

export class CreateIntegrationCartLinkDto {
  @ApiProperty({
    description:
      'Teléfono del usuario (WhatsApp). Se usa para localizar al usuario registrado y generar sesión automática.',
    example: '5217717875215',
  })
  @IsString()
  @IsNotEmpty({ message: 'phone es requerido' })
  phone!: string;

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
      'ID de core.stores. Si se envía (y no hay `path`), debe coincidir con el carrito; sirve para validar. Sin `path`, si omites storeId/store_id se usa el store del propio carrito para armar la URL.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'storeId debe ser un UUID válido' })
  storeId?: string;

  @ApiPropertyOptional({
    description: 'Alias en snake_case de `storeId` (útil para n8n u orígenes que serializan así).',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'store_id debe ser un UUID válido' })
  store_id?: string;
}
