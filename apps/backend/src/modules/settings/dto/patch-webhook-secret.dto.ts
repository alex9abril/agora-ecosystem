import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsDateString, MaxLength } from 'class-validator';

export class PatchWebhookSecretDto {
  @ApiProperty({
    description: 'Nombre descriptivo (opcional)',
    example: 'Karlopay producción',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'Revocar clave (is_active = false)',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({
    description: 'Fecha de expiración (ISO). null = no caduca.',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expires_at?: string | null;
}
