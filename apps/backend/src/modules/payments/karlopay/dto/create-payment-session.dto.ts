import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, ValidateNested, IsOptional, IsObject, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

class CustomerSessionDto {
  @ApiProperty({ description: 'ID del usuario/cliente' })
  @IsString()
  foreignId: string;

  @ApiProperty({ description: 'Nombre completo' })
  @IsString()
  fullName: string;

  @ApiProperty({ description: 'Teléfono' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ description: 'Email' })
  @IsString()
  email: string;
}

class OperationSessionDto {
  @ApiProperty({ description: 'Descripción del producto' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Cantidad' })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Precio unitario' })
  @IsNumber()
  price: number;
}

export class CreatePaymentSessionDto {
  @ApiProperty({ description: 'ID del grupo de órdenes' })
  @IsString()
  orderGroupId: string;

  @ApiProperty({ description: 'Número de orden único' })
  @IsString()
  numberOfOrder: string;

  @ApiProperty({ description: 'Total a cobrar' })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Información del cliente', type: CustomerSessionDto })
  @ValidateNested()
  @Type(() => CustomerSessionDto)
  customer: CustomerSessionDto;

  @ApiProperty({ description: 'Operaciones/productos', type: [OperationSessionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperationSessionDto)
  operations: OperationSessionDto[];

  @ApiPropertyOptional({ description: 'URL de redirección después del pago' })
  @IsOptional()
  @IsString()
  redirectUrl?: string;

  @ApiPropertyOptional({ description: 'Datos adicionales' })
  @IsOptional()
  @IsObject()
  additional?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'ID de sucursal para config branch' })
  @IsOptional()
  @IsString()
  businessId?: string;
}
