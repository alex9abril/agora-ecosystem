import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, ValidateNested, IsOptional, IsObject, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

class CustomerDto {
  @ApiProperty({ description: 'ID externo del cliente', example: 'cus_01JFTXQQ1PA3DQ9355DJDNHG6N' })
  @IsString()
  foreignId: string;

  @ApiProperty({ description: 'Nombre completo del cliente', example: 'Alonso Avila' })
  @IsString()
  fullName: string;

  @ApiProperty({ description: 'Teléfono del cliente', example: '1234567890' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ description: 'Email del cliente', example: 'avila.dsg@gmail.com' })
  @IsString()
  email: string;

  @ApiPropertyOptional({ description: 'Perfil de facturación', example: null })
  @IsOptional()
  @IsObject()
  invoiceProfile?: any;
}

class OperationDto {
  @ApiProperty({ description: 'Descripción del producto', example: 'Producto 1' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Cantidad', example: 1 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Precio unitario', example: 0.01 })
  @IsNumber()
  price: number;
}

export class CreateKarlopayOrderDto {
  @ApiProperty({ description: 'Área de negocio', example: 'ventas' })
  @IsString()
  businessArea: string;

  @ApiProperty({ description: 'Número de orden', example: 'payses_01JJD1VWT2ESR3101A9Q3TMN5V' })
  @IsString()
  numberOfOrder: string;

  @ApiProperty({ description: 'Estado de la orden', example: 'R' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Total de la orden', example: 502.48 })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Información del cliente', type: CustomerDto })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto;

  @ApiProperty({ description: 'Operaciones/productos de la orden', type: [OperationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperationDto)
  operations: OperationDto[];

  @ApiPropertyOptional({ description: 'Producto', example: null })
  @IsOptional()
  product?: any;

  @ApiPropertyOptional({ description: 'URL de redirección después del pago', example: 'http://localhost:8000#/karlopay-redirect?session_id=...' })
  @IsOptional()
  @IsString()
  redirectUrl?: string;

  @ApiPropertyOptional({ description: 'Información adicional', example: { session_id: 'payses_01JJD1VWT2ESR3101A9Q3TMN5V' } })
  @IsOptional()
  @IsObject()
  additional?: any;
}

