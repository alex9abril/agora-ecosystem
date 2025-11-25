import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsOptional, IsInt, Min, Max } from 'class-validator';

export class AssignTaxToProductDto {
  @ApiProperty({ description: 'ID del tipo de impuesto' })
  @IsUUID()
  tax_type_id: string;

  @ApiProperty({ description: 'Override opcional del porcentaje para este producto', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  override_rate?: number;

  @ApiProperty({ description: 'Override opcional del monto fijo para este producto', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  override_fixed_amount?: number;

  @ApiProperty({ description: 'Orden de visualización cuando hay múltiples impuestos', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;
}

