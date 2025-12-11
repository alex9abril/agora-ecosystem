import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class DebitWalletDto {
  @ApiProperty({ description: 'Monto a debitar', example: 50.00 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: 'Razón específica del débito', example: 'Pago parcial de pedido (50.00 de 200.00)' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Descripción general', example: 'Pago con wallet' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'ID del pedido relacionado', example: '00000000-0000-0000-0000-000000000001' })
  @IsOptional()
  @IsUUID()
  order_id?: string;
}

