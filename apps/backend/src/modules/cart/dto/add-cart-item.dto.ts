import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsInt, Min, IsOptional, IsString, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AddCartItemDto {
  @ApiProperty({
    description: 'ID del producto a agregar al carrito',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID('4', { message: 'El productId debe ser un UUID válido' })
  productId: string;

  @ApiProperty({
    description: 'Cantidad del producto',
    example: 1,
    minimum: 1,
  })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity: number;

  @ApiProperty({
    description: 'Variantes seleccionadas del producto (JSONB)',
    example: { 'variant_group_id_1': 'variant_id_1', 'variant_group_id_2': ['variant_id_2', 'variant_id_3'] },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'variantSelections debe ser un objeto' })
  variantSelections?: Record<string, string | string[]>;

  @ApiProperty({
    description: 'Notas especiales para este item',
    example: 'Sin cebolla, por favor',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'specialInstructions debe ser una cadena de texto' })
  specialInstructions?: string;
}

