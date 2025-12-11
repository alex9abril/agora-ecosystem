import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class CreditWalletDto {
  @ApiProperty({ description: 'Monto a acreditar', example: 100.00 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: 'Razón específica de la acreditación', example: 'Nota de crédito por falta de stock: 1 unidad de Producto X' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Descripción general', example: 'Acreditación automática por producto no surtido' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'ID del pedido relacionado', example: '00000000-0000-0000-0000-000000000001' })
  @IsOptional()
  @IsUUID()
  order_id?: string;

  @ApiPropertyOptional({ description: 'ID del item del pedido relacionado', example: '00000000-0000-0000-0000-000000000002' })
  @IsOptional()
  @IsUUID()
  order_item_id?: string;
}

