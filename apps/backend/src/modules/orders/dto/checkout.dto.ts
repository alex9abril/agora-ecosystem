import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsNumber, Min, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class WalletPaymentDto {
  @ApiProperty({ description: 'Monto a usar del wallet', example: 50.00 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Si se usa todo el saldo disponible', example: false })
  @IsOptional()
  use_full_balance?: boolean;
}

class PaymentInfoDto {
  @ApiProperty({ description: 'Método de pago principal', example: 'wallet', enum: ['card', 'cash', 'transfer', 'wallet'] })
  @IsString()
  method: string;

  @ApiPropertyOptional({ description: 'Información del pago con wallet', type: WalletPaymentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WalletPaymentDto)
  wallet?: WalletPaymentDto;

  @ApiPropertyOptional({ description: 'Método de pago secundario (si el wallet no cubre todo)', example: 'card' })
  @IsOptional()
  @IsString()
  secondary_method?: string;

  @ApiPropertyOptional({ description: 'Monto a pagar con el método secundario', example: 150.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  secondary_amount?: number;
}

export class CheckoutDto {
  @ApiProperty({ description: 'ID de la dirección de entrega', example: '11111111-1111-1111-1111-111111111111' })
  @IsUUID('4', { message: 'El addressId debe ser un UUID válido' })
  addressId: string;

  @ApiPropertyOptional({ description: 'Notas especiales para la entrega', example: 'Llamar antes de llegar' })
  @IsOptional()
  @IsString()
  deliveryNotes?: string;

  @ApiPropertyOptional({ description: 'Propina', example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number = 0;

  @ApiPropertyOptional({ description: 'Costo de envío calculado', example: 48.00, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number = 0;

  @ApiPropertyOptional({ description: 'Información de pago (método, wallet, distribución)', type: PaymentInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentInfoDto)
  payment?: PaymentInfoDto;

  @ApiPropertyOptional({ description: 'Ruta de contexto de tienda para URL de redirección (ej: /grupo/toyota-group o /sucursal/toyota-satelite)', example: '/grupo/toyota-group' })
  @IsOptional()
  @IsString()
  storeContext?: string;
}

