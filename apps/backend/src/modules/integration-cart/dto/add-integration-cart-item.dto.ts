import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsInt, Min, IsOptional, IsString, IsObject, Matches } from 'class-validator';

export class AddIntegrationCartItemDto {
  @ApiProperty({ description: 'ID del producto', format: 'uuid' })
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'productId debe ser un UUID válido',
  })
  productId: string;

  @ApiProperty({ description: 'Cantidad', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Variantes seleccionadas (JSON). Mismo formato que /cart/items',
  })
  @IsOptional()
  @IsObject()
  variantSelections?: Record<string, string | string[]>;

  @ApiPropertyOptional({ description: 'Notas del ítem' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @ApiPropertyOptional({
    description: 'Sucursal (obligatoria para tiendas group, group_brand, global_brand; recomendada para branch)',
    format: 'uuid',
  })
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'branchId debe ser un UUID válido',
  })
  branchId?: string;
}
