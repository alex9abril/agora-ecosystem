import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  ValidateNested,
  IsObject,
  ValidateIf,
  IsIn,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
  ValidationArguments,
  IsEmail,
  MinLength,
  IsNotEmpty,
} from 'class-validator';
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

@ValidatorConstraint({ name: 'paymentInfoValid', async: false })
export class PaymentInfoValidConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const payment = value as PaymentInfoDto;
    if (!payment) return true;

    // Validar branchId: solo permitir si method es karlopay-branch o karlopay-kiosk
    if (payment.branchId !== undefined && payment.branchId !== null && payment.branchId !== '') {
      if (payment.method !== 'karlopay-branch' && payment.method !== 'karlopay-kiosk') {
        return false;
      }
    }

    // Validar secondary_branchId: solo permitir si secondary_method es karlopay-branch
    if (payment.secondary_branchId !== undefined && payment.secondary_branchId !== null && payment.secondary_branchId !== '') {
      if (payment.secondary_method !== 'karlopay-branch') {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const payment = args.value as PaymentInfoDto;
    if (payment.branchId && payment.method !== 'karlopay-branch' && payment.method !== 'karlopay-kiosk') {
      return `payment.branchId solo se permite cuando payment.method es 'karlopay-branch' o 'karlopay-kiosk'. Método actual: '${payment.method}'`;
    }
    if (payment.secondary_branchId && payment.secondary_method !== 'karlopay-branch') {
      return `payment.secondary_branchId solo se permite cuando payment.secondary_method es 'karlopay-branch'. Método secundario actual: '${payment.secondary_method || 'ninguno'}'`;
    }
    return 'payment contiene propiedades inválidas';
  }
}

class KioskContactDto {
  @ApiProperty({ description: 'Correo donde recibir instrucciones de pago en kiosco', example: 'cliente@correo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Teléfono (WhatsApp) para instrucciones', example: '+525512345678' })
  @IsString()
  @MinLength(10, { message: 'El teléfono debe tener al menos 10 caracteres' })
  phone: string;
}

class PaymentInfoDto {
  @ApiProperty({
    description: 'Método de pago principal',
    example: 'wallet',
    enum: ['card', 'cash', 'transfer', 'wallet', 'karlopay', 'karlopay-branch', 'karlopay-kiosk'],
  })
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

  @ApiPropertyOptional({ description: 'ID de la sucursal cuando se usa karlopay-branch o karlopay-kiosk', example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @ValidateIf((o) => o.method === 'karlopay-branch' || o.method === 'karlopay-kiosk')
  @IsUUID('4', { message: 'branchId debe ser un UUID válido' })
  branchId?: string;

  @ApiPropertyOptional({ description: 'Contacto confirmado para enviar instrucciones de pago en kiosco (requerido si method es karlopay-kiosk)', type: KioskContactDto })
  @ValidateIf((o) => o.method === 'karlopay-kiosk')
  @IsNotEmpty({ message: 'kiosk_contact es obligatorio para pago en kiosco KarloPay' })
  @ValidateNested()
  @Type(() => KioskContactDto)
  kiosk_contact?: KioskContactDto;

  @ApiPropertyOptional({ description: 'ID de la sucursal cuando se usa karlopay-branch como método secundario', example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @ValidateIf((o) => o.secondary_method === 'karlopay-branch')
  @IsUUID('4', { message: 'secondary_branchId debe ser un UUID válido' })
  secondary_branchId?: string;
}

export class CheckoutDto {
  @ApiPropertyOptional({ description: 'Tipo de entrega: shipping = envío a domicilio (requiere addressId), pickup = recoger en tienda (no se envía addressId)', example: 'shipping', enum: ['shipping', 'pickup'] })
  @IsOptional()
  @IsIn(['shipping', 'pickup'], { message: 'deliveryType debe ser "shipping" o "pickup"' })
  deliveryType?: 'shipping' | 'pickup' = 'shipping';

  @ApiPropertyOptional({ description: 'ID de la dirección de entrega. Requerido cuando deliveryType es "shipping". No se envía cuando deliveryType es "pickup".', example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @ValidateIf((o) => o.deliveryType !== 'pickup')
  @IsUUID('4', { message: 'El addressId debe ser un UUID válido' })
  addressId?: string;

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
  @Validate(PaymentInfoValidConstraint) // Validar que branchId solo esté presente cuando method es karlopay-branch
  @Type(() => PaymentInfoDto)
  payment?: PaymentInfoDto;

  @ApiPropertyOptional({ description: 'Ruta de contexto de tienda para URL de redirección (ej: /grupo/toyota-group o /sucursal/toyota-satelite)', example: '/grupo/toyota-group' })
  @IsOptional()
  @IsString()
  storeContext?: string;

  @ApiPropertyOptional({ description: 'URL base del frontend desde donde se realiza el pedido (ej: https://agoramp.mx). Se usa para generar links correctos en correos.', example: 'https://agoramp.mx' })
  @IsOptional()
  @IsString()
  appUrl?: string;

  @ApiPropertyOptional({ description: 'ID del canal de venta (core.stores). Si se envía, se guarda en orders.store_id; si no, se resuelve desde storeContext.', example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @IsUUID('4', { message: 'storeId debe ser un UUID válido' })
  storeId?: string;

  @ApiPropertyOptional({ description: 'Mapa de quotation_id por business_id (para Skydropx)', example: { "business-id-1": "quotation-id-123" } })
  @IsOptional()
  @IsObject()
  quotationIds?: Record<string, string>; // businessId -> quotation_id

  @ApiPropertyOptional({ description: 'Mapa de rate_id por business_id (para crear shipment en Skydropx)', example: { "business-id-1": "rate-id-789" } })
  @IsOptional()
  @IsObject()
  rateIds?: Record<string, string>; // businessId -> rate_id

  @ApiPropertyOptional({ description: 'Mapa de información de envío por business_id (carrier y service)', example: { "business-id-1": { "carrier": "FEDEX", "service": "Express Saver" } } })
  @IsOptional()
  @IsObject()
  shippingInfo?: Record<string, { carrier?: string; service?: string }>; // businessId -> { carrier, service }
}

