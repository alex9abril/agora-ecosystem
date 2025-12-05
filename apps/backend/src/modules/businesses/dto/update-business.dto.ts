import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsArray, MaxLength, IsBoolean, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBusinessDto {
  @ApiPropertyOptional({ description: 'Nombre del negocio', example: 'Restaurante La Roma' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Razón social', example: 'Restaurante La Roma S.A. de C.V.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  legal_name?: string;

  @ApiPropertyOptional({ description: 'Descripción del negocio', example: 'Restaurante de comida mexicana e internacional' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Categoría del negocio (nombre o ID)', example: 'Restaurante' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: 'ID de la categoría del catálogo', example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @IsString()
  category_id?: string;

  @ApiPropertyOptional({ description: 'Tags del negocio', example: ['vegano', 'orgánico'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Teléfono de contacto', example: '+525555555555' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Email de contacto', example: 'contacto@restaurantelaroma.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'URL del sitio web', example: 'https://restaurantelaroma.com' })
  @IsOptional()
  @IsString()
  website_url?: string;

  @ApiPropertyOptional({ description: 'Slug amigable para el storefront', example: 'restaurante-la-roma' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @ApiPropertyOptional({ description: 'Si la sucursal acepta recolección de productos en la unidad física', example: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  accepts_pickup?: boolean;

  @ApiPropertyOptional({ description: 'Si la sucursal está activa y disponible para ventas', example: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'ID del grupo empresarial al que pertenece esta sucursal', example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @IsUUID()
  business_group_id?: string | null;
}

