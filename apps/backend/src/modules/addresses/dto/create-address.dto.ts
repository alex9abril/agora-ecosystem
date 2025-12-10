import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAddressDto {
  @ApiPropertyOptional({ description: 'Etiqueta de la dirección (Casa, Trabajo, etc.)', example: 'Casa' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiProperty({ description: 'Calle', example: 'Avenida Álvaro Obregón' })
  @IsString()
  @MaxLength(255)
  street: string;

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

  @ApiProperty({ description: 'Colonia/Barrio', example: 'Roma Norte' })
  @IsString()
  @MaxLength(100)
  neighborhood: string;

  @ApiPropertyOptional({ description: 'Ciudad', example: 'Ciudad de México', default: 'Ciudad de México' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string = 'Ciudad de México';

  @ApiPropertyOptional({ description: 'Estado', example: 'CDMX', default: 'CDMX' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string = 'CDMX';

  @ApiProperty({ description: 'Código postal', example: '06700' })
  @IsString()
  @MaxLength(10)
  postal_code: string;

  @ApiPropertyOptional({ description: 'País', example: 'México', default: 'México' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string = 'México';

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

  @ApiPropertyOptional({ description: 'Referencias adicionales', example: 'Entre calles X y Y, portón azul' })
  @IsOptional()
  @IsString()
  additional_references?: string;

  @ApiPropertyOptional({ description: 'Establecer como dirección predeterminada', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_default?: boolean = false;

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
}

