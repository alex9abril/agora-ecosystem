import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsEmail, IsArray, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBusinessDto {
  @ApiProperty({ description: 'Nombre del negocio', example: 'Restaurante La Roma' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Razón social', example: 'Restaurante La Roma S.A. de C.V.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  legal_name?: string;

  @ApiPropertyOptional({ description: 'Descripción del negocio', example: 'Restaurante de comida mexicana e internacional' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Categoría del negocio (nombre o ID)', example: 'Restaurante' })
  @IsString()
  @MaxLength(100)
  category: string;

  @ApiPropertyOptional({ description: 'ID de la categoría del catálogo (opcional, si se proporciona se usa en lugar de category)', example: '11111111-1111-1111-1111-111111111111' })
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

  @ApiProperty({ description: 'Longitud (coordenada X)', example: -99.1600 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude: number;

  @ApiProperty({ description: 'Latitud (coordenada Y)', example: 19.4220 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude: number;

  @ApiPropertyOptional({ description: 'Dirección completa (calle y número)', example: 'Avenida Álvaro Obregón 45' })
  @IsOptional()
  @IsString()
  address_line1?: string;

  @ApiPropertyOptional({ description: 'Colonia/Barrio', example: 'Roma Norte' })
  @IsOptional()
  @IsString()
  address_line2?: string;

  @ApiPropertyOptional({ description: 'Ciudad', example: 'Ciudad de México' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Estado/Provincia', example: 'CDMX' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Código postal', example: '06700' })
  @IsOptional()
  @IsString()
  postal_code?: string;

  @ApiPropertyOptional({ description: 'País', example: 'México', default: 'México' })
  @IsOptional()
  @IsString()
  country?: string = 'México';

  @ApiPropertyOptional({ description: 'Horarios de apertura (JSON)', example: { monday: { open: '09:00', close: '22:00' } } })
  @IsOptional()
  opening_hours?: any;

  @ApiPropertyOptional({ description: 'Usa empaques ecológicos', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  uses_eco_packaging?: boolean = false;
}

