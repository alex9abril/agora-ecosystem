import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject, ValidateNested, IsUrl, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class BrandingColorsDto {
  @ApiPropertyOptional({
    description: 'Color primario (hex)',
    example: '#FF5733',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe estar en formato hexadecimal (#RRGGBB)' })
  primary_color?: string;

  @ApiPropertyOptional({
    description: 'Color secundario (hex)',
    example: '#33C3F0',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe estar en formato hexadecimal (#RRGGBB)' })
  secondary_color?: string;

  @ApiPropertyOptional({
    description: 'Color de acento (hex)',
    example: '#FFC300',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe estar en formato hexadecimal (#RRGGBB)' })
  accent_color?: string;

  @ApiPropertyOptional({
    description: 'Color de texto primario (hex)',
    example: '#1A1A1A',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe estar en formato hexadecimal (#RRGGBB)' })
  text_primary?: string;

  @ApiPropertyOptional({
    description: 'Color de texto secundario (hex)',
    example: '#666666',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe estar en formato hexadecimal (#RRGGBB)' })
  text_secondary?: string;

  @ApiPropertyOptional({
    description: 'Color de fondo (hex)',
    example: '#FFFFFF',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe estar en formato hexadecimal (#RRGGBB)' })
  background_color?: string;

  @ApiPropertyOptional({
    description: 'Color de fondo secundario (hex)',
    example: '#F5F5F5',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe estar en formato hexadecimal (#RRGGBB)' })
  background_secondary?: string;

  @ApiPropertyOptional({
    description: 'Color de éxito (hex)',
    example: '#28A745',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe estar en formato hexadecimal (#RRGGBB)' })
  success_color?: string;

  @ApiPropertyOptional({
    description: 'Color de advertencia (hex)',
    example: '#FFC107',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe estar en formato hexadecimal (#RRGGBB)' })
  warning_color?: string;

  @ApiPropertyOptional({
    description: 'Color de error (hex)',
    example: '#DC3545',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe estar en formato hexadecimal (#RRGGBB)' })
  error_color?: string;

  @ApiPropertyOptional({
    description: 'Color de información (hex)',
    example: '#17A2B8',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe estar en formato hexadecimal (#RRGGBB)' })
  info_color?: string;
}

export class BrandingFontsDto {
  @ApiPropertyOptional({
    description: 'Fuente primaria',
    example: 'Inter',
  })
  @IsOptional()
  @IsString()
  primary?: string;

  @ApiPropertyOptional({
    description: 'Fuente secundaria',
    example: 'Roboto',
  })
  @IsOptional()
  @IsString()
  secondary?: string;

  @ApiPropertyOptional({
    description: 'Fuente para títulos',
    example: 'Poppins',
  })
  @IsOptional()
  @IsString()
  heading?: string;
}

export class BrandingTextsDto {
  @ApiPropertyOptional({
    description: 'Mensaje de bienvenida',
    example: 'Bienvenido a nuestra tienda',
  })
  @IsOptional()
  @IsString()
  welcome_message?: string;

  @ApiPropertyOptional({
    description: 'Tagline o eslogan',
    example: 'Tu tienda de confianza',
  })
  @IsOptional()
  @IsString()
  tagline?: string;

  @ApiPropertyOptional({
    description: 'Texto del footer',
    example: '© 2025 Todos los derechos reservados',
  })
  @IsOptional()
  @IsString()
  footer_text?: string;

  @ApiPropertyOptional({
    description: 'Mensaje de contacto',
    example: '¿Necesitas ayuda? Contáctanos',
  })
  @IsOptional()
  @IsString()
  contact_message?: string;
}

export class BrandingSocialMediaDto {
  @ApiPropertyOptional({
    description: 'URL de Facebook',
    example: 'https://facebook.com/tienda',
  })
  @IsOptional()
  @IsUrl()
  facebook?: string;

  @ApiPropertyOptional({
    description: 'URL de Instagram',
    example: 'https://instagram.com/tienda',
  })
  @IsOptional()
  @IsUrl()
  instagram?: string;

  @ApiPropertyOptional({
    description: 'URL de Twitter/X',
    example: 'https://twitter.com/tienda',
  })
  @IsOptional()
  @IsUrl()
  twitter?: string;

  @ApiPropertyOptional({
    description: 'Número de WhatsApp',
    example: '+521234567890',
  })
  @IsOptional()
  @IsString()
  whatsapp?: string;
}

export class BrandingDto {
  @ApiPropertyOptional({
    description: 'URL del logo principal',
    example: 'https://example.com/logo.png',
  })
  @IsOptional()
  @IsUrl()
  logo_url?: string;

  @ApiPropertyOptional({
    description: 'URL del logo para fondos claros',
    example: 'https://example.com/logo-light.png',
  })
  @IsOptional()
  @IsUrl()
  logo_light_url?: string;

  @ApiPropertyOptional({
    description: 'URL del logo para fondos oscuros',
    example: 'https://example.com/logo-dark.png',
  })
  @IsOptional()
  @IsUrl()
  logo_dark_url?: string;

  @ApiPropertyOptional({
    description: 'URL del favicon',
    example: 'https://example.com/favicon.ico',
  })
  @IsOptional()
  @IsUrl()
  favicon_url?: string;

  @ApiPropertyOptional({
    description: 'Configuración de colores',
    type: BrandingColorsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingColorsDto)
  colors?: BrandingColorsDto;

  @ApiPropertyOptional({
    description: 'Configuración de fuentes',
    type: BrandingFontsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingFontsDto)
  fonts?: BrandingFontsDto;

  @ApiPropertyOptional({
    description: 'Textos personalizados',
    type: BrandingTextsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingTextsDto)
  texts?: BrandingTextsDto;

  @ApiPropertyOptional({
    description: 'Redes sociales',
    type: BrandingSocialMediaDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingSocialMediaDto)
  social_media?: BrandingSocialMediaDto;

  @ApiPropertyOptional({
    description: 'CSS personalizado (opcional)',
    example: '.custom-class { color: red; }',
  })
  @IsOptional()
  @IsString()
  custom_css?: string;

  @ApiPropertyOptional({
    description: 'JavaScript personalizado (opcional)',
  })
  @IsOptional()
  @IsString()
  custom_js?: string;
}

export class UpdateBrandingDto {
  @ApiProperty({
    description: 'Configuración de branding',
    type: BrandingDto,
  })
  @ValidateNested()
  @Type(() => BrandingDto)
  branding: BrandingDto;
}

