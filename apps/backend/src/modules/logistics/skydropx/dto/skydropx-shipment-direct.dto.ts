import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * Crear envío en Skydropx con payload alineado a la API (uso avanzado).
 * Flujo estándar Agora: POST /logistics/shipping-labels con orderId.
 */
export class CreateSkydropxShipmentDirectDto {
  @ApiProperty({ description: 'rate_id devuelto por cotización Skydropx' })
  @IsString()
  @IsNotEmpty()
  rate_id: string;

  @ApiProperty({ enum: ['thermal', 'standard'], required: false })
  @IsOptional()
  @IsIn(['thermal', 'standard'])
  printing_format?: 'thermal' | 'standard';

  @ApiProperty({ type: 'object', description: 'address_from (estructura Skydropx)' })
  @IsObject()
  address_from: Record<string, unknown>;

  @ApiProperty({ type: 'object', description: 'address_to (estructura Skydropx)' })
  @IsObject()
  address_to: Record<string, unknown>;

  @ApiProperty({
    type: 'array',
    description: 'packages[] según documentación Skydropx',
  })
  @IsArray()
  packages: Record<string, unknown>[];
}
