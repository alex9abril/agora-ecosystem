import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, ValidateNested, IsOptional, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

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
}

