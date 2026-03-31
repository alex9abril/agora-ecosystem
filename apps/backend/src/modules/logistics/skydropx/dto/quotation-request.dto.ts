import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  IsNumber,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Productos para cotización internacional (aranceles / aduanas en Skydropx). */
export class InternationalQuotationProductDto {
  @ApiProperty({ description: 'Código HS (se normaliza a 10 dígitos)' })
  @IsNotEmpty()
  @IsString()
  hs_code: string;

  @ApiProperty({ description: 'Descripción en inglés' })
  @IsNotEmpty()
  @IsString()
  description_en: string;

  @ApiProperty({ description: 'ISO 3166-1 alpha-2 país de origen', example: 'MX' })
  @IsNotEmpty()
  @IsString()
  country_code: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  price: number;
}

export class AddressDto {
  @ApiProperty({ description: 'Nombre del destinatario/origen' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Calle' })
  @IsNotEmpty()
  @IsString()
  street: string;

  @ApiProperty({ description: 'Número' })
  @IsNotEmpty()
  @IsString()
  number: string;

  @ApiProperty({ description: 'Colonia/Distrito', required: false })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({ description: 'Ciudad' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ description: 'Estado' })
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiProperty({ description: 'País', default: 'MX' })
  @IsNotEmpty()
  @IsString()
  country: string;

  @ApiProperty({ description: 'Código postal' })
  @IsNotEmpty()
  @IsString()
  postal_code: string;

  @ApiProperty({ description: 'Teléfono' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Email', required: false })
  @IsOptional()
  @IsString()
  email?: string;
}

export class ParcelDto {
  @ApiProperty({ description: 'Peso del paquete' })
  @IsNotEmpty()
  @IsNumber()
  weight: number;

  @ApiProperty({ description: 'Unidad de distancia', enum: ['CM', 'IN'], default: 'CM' })
  @IsOptional()
  @IsIn(['CM', 'IN'])
  distance_unit?: 'CM' | 'IN';

  @ApiProperty({ description: 'Unidad de masa', enum: ['KG', 'LB'], default: 'KG' })
  @IsOptional()
  @IsIn(['KG', 'LB'])
  mass_unit?: 'KG' | 'LB';

  @ApiProperty({ description: 'Altura en centímetros' })
  @IsNotEmpty()
  @IsNumber()
  height: number;

  @ApiProperty({ description: 'Ancho en centímetros' })
  @IsNotEmpty()
  @IsNumber()
  width: number;

  @ApiProperty({ description: 'Largo en centímetros' })
  @IsNotEmpty()
  @IsNumber()
  length: number;
}

export class QuotationRequestDto {
  @ApiProperty({ description: 'Dirección de origen', type: AddressDto })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => AddressDto)
  origin: AddressDto;

  @ApiProperty({ description: 'Dirección de destino', type: AddressDto })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => AddressDto)
  destination: AddressDto;

  @ApiProperty({ description: 'Paquetes a enviar', type: [ParcelDto] })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParcelDto)
  parcels: ParcelDto[];

  @ApiProperty({
    description:
      'Carriers a consultar (slugs Skydropx). Si se omite, se usan fedex, dhl, ups, estafeta.',
    required: false,
    type: [String],
    example: ['fedex', 'dhl'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requested_carriers?: string[];

  @ApiProperty({
    description: 'Solo envíos internacionales: líneas de producto para la cotización',
    required: false,
    type: [InternationalQuotationProductDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InternationalQuotationProductDto)
  international_products?: InternationalQuotationProductDto[];
}

