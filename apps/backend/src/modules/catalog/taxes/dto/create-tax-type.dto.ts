import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, Min, Max } from 'class-validator';

export enum RateType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export class CreateTaxTypeDto {
  @ApiProperty({ description: 'Nombre del impuesto (ej: "IVA", "Impuesto Local CDMX")' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Descripción del impuesto', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Código fiscal (ej: "IVA", "ISR", "IEPS")', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'Porcentaje del impuesto (0.16 = 16%)', example: 0.16 })
  @IsNumber()
  @Min(0)
  @Max(1)
  rate: number;

  @ApiProperty({ 
    description: 'Tipo de cálculo: percentage (porcentaje) o fixed (monto fijo)',
    enum: RateType,
    default: RateType.PERCENTAGE
  })
  @IsEnum(RateType)
  rate_type: RateType;

  @ApiProperty({ description: 'Monto fijo (solo si rate_type = fixed)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixed_amount?: number;

  @ApiProperty({ description: 'Si el impuesto se aplica al subtotal', default: true })
  @IsBoolean()
  applies_to_subtotal: boolean;

  @ApiProperty({ description: 'Si el impuesto se aplica al costo de envío', default: false })
  @IsBoolean()
  applies_to_delivery: boolean;

  @ApiProperty({ description: 'Si el impuesto se aplica a la propina', default: false })
  @IsBoolean()
  applies_to_tip: boolean;

  @ApiProperty({ description: 'Si este impuesto se asigna automáticamente a nuevos productos', default: false })
  @IsBoolean()
  is_default: boolean;

  @ApiProperty({ description: 'Si el impuesto está activo', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

