import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class CreateShippingLabelDto {
  @ApiProperty({
    description: 'ID de la orden para la cual se genera la guía',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  orderId: string;

  @ApiProperty({
    description: 'Peso del paquete en kilogramos',
    example: 2.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  packageWeight?: number;

  @ApiProperty({
    description: 'Dimensiones del paquete (ej: "30x20x15 cm")',
    example: '30x20x15 cm',
    required: false,
  })
  @IsOptional()
  @IsString()
  packageDimensions?: string;

  @ApiProperty({
    description: 'Valor declarado del paquete',
    example: 1500.00,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declaredValue?: number;
}

