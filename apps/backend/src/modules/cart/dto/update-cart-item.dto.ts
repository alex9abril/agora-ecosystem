import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, IsOptional, IsString } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({
    description: 'Nueva cantidad del item',
    example: 2,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity?: number;

  @ApiProperty({
    description: 'Nuevas notas especiales para este item',
    example: 'Sin cebolla, por favor',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'specialInstructions debe ser una cadena de texto' })
  specialInstructions?: string;
}

