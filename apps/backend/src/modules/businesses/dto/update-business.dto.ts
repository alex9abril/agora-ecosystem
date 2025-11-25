import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsArray, MaxLength } from 'class-validator';

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
}

