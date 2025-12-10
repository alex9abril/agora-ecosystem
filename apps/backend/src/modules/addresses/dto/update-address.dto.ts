import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAddressDto {
  @ApiPropertyOptional({ description: 'Etiqueta de la dirección', example: 'Casa' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional({ description: 'Calle', example: 'Avenida Álvaro Obregón' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  street?: string;

  @ApiPropertyOptional({ description: 'Número exterior', example: '45' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  street_number?: string;

  @ApiPropertyOptional({ description: 'Número interior', example: 'A' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  interior_number?: string;

  @ApiPropertyOptional({ description: 'Colonia/Barrio', example: 'Roma Norte' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  neighborhood?: string;

  @ApiPropertyOptional({ description: 'Ciudad', example: 'Ciudad de México' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Estado', example: 'CDMX' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ description: 'Código postal', example: '06700' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  postal_code?: string;

  @ApiPropertyOptional({ description: 'País', example: 'México' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'Longitud (coordenada X)', example: -99.1600 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({ description: 'Latitud (coordenada Y)', example: 19.4220 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Referencias adicionales', example: 'Entre calles X y Y' })
  @IsOptional()
  @IsString()
  additional_references?: string;

  @ApiPropertyOptional({ description: 'Establecer como dirección predeterminada', example: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_default?: boolean;

  @ApiPropertyOptional({ description: 'Nombre de la persona que recibirá el pedido en esta dirección', example: 'María González' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  receiver_name?: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto de la persona que recibirá el pedido', example: '5512345678' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  receiver_phone?: string;

  @ApiPropertyOptional({ description: 'Indica si la dirección está activa', example: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_active?: boolean;
}

