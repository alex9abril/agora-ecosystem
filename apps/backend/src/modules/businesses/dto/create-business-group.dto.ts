import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBusinessGroupDto {
  @ApiProperty({ description: 'Nombre comercial del grupo empresarial', example: 'Grupo Andrade' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Razón social', example: 'Grupo Andrade S.A. de C.V.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  legal_name?: string;

  @ApiPropertyOptional({ description: 'Descripción del grupo empresarial', example: 'Grupo empresarial dedicado a la venta de refacciones automotrices' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Slug amigable para URLs (se genera automáticamente si no se proporciona)', example: 'grupo-andrade' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @ApiPropertyOptional({ description: 'URL del logo del grupo', example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsString()
  logo_url?: string;

  @ApiPropertyOptional({ description: 'URL del sitio web del grupo', example: 'https://grupoandrade.com' })
  @IsOptional()
  @IsString()
  website_url?: string;

  @ApiPropertyOptional({ description: 'Identificador fiscal (RFC, NIT, etc.)', example: 'GAN850101ABC' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tax_id?: string;

  @ApiPropertyOptional({ description: 'Configuraciones adicionales en formato JSON', example: { branding: { primary_color: '#FF5733' } } })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Si el grupo está activo', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_active?: boolean = true;
}

