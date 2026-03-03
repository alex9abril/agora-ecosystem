import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsDateString, MaxLength } from 'class-validator';

export class CreateWebhookSecretDto {
  @ApiProperty({
    description: 'Nombre descriptivo de la clave (ej. Karlopay producción)',
    example: 'Karlopay producción',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Si true, la clave no caduca (expires_at será null)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  no_expira?: boolean;

  @ApiProperty({
    description: 'Fecha de expiración (ISO). Solo si no_expira es false.',
    example: '2026-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expires_at?: string | null;
}
