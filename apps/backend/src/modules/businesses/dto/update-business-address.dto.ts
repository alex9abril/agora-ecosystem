import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBusinessAddressDto {
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
}

