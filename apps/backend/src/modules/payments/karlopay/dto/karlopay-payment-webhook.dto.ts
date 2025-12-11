import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsObject, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class TaxDataDto {
  @ApiPropertyOptional({ description: 'Razón social', example: '' })
  @IsOptional()
  @IsString()
  socialReason?: string;

  @ApiPropertyOptional({ description: 'Código postal fiscal', example: '45130' })
  @IsOptional()
  @IsString()
  postalCodeTax?: string;

  @ApiPropertyOptional({ description: 'RFC', example: 'XAXX010101000' })
  @IsOptional()
  @IsString()
  RFC?: string;

  @ApiPropertyOptional({ description: 'Régimen fiscal', example: '616' })
  @IsOptional()
  @IsString()
  taxRegime?: string;

  @ApiPropertyOptional({ description: 'CFDI', example: 'S01' })
  @IsOptional()
  @IsString()
  CFDI?: string;

  @ApiPropertyOptional({ description: 'Email', example: 'avila.dsg@gmail.com' })
  @IsOptional()
  @IsString()
  email?: string;
}

class CommissionsDto {
  @ApiPropertyOptional({ description: 'Comisión base', example: 16.97 })
  @IsOptional()
  @IsNumber()
  baseComission?: number;

  @ApiPropertyOptional({ description: 'IVA de comisión base', example: 2.72 })
  @IsOptional()
  @IsNumber()
  baseComissionIva?: number;

  @ApiPropertyOptional({ description: 'Total de comisión base', example: 19.69 })
  @IsOptional()
  @IsNumber()
  baseComissionTotal?: number;
}

class SurchargesDto {
  @ApiPropertyOptional({ description: 'Recargo base', example: 0 })
  @IsOptional()
  @IsNumber()
  baseSurcharge?: number;

  @ApiPropertyOptional({ description: 'IVA de recargo base', example: 0 })
  @IsOptional()
  @IsNumber()
  baseSurchargeIva?: number;

  @ApiPropertyOptional({ description: 'Total de recargo base', example: 0 })
  @IsOptional()
  @IsNumber()
  baseSurchargeTotal?: number;
}

class PaymentInformationDto {
  @ApiPropertyOptional({ description: 'Porcentaje de comisión base', example: 0.035 })
  @IsOptional()
  @IsNumber()
  percentageBaseComission?: number;

  @ApiPropertyOptional({ description: 'Porcentaje de recargo base', example: 0 })
  @IsOptional()
  @IsNumber()
  percentageBaseSurcharge?: number;

  @ApiPropertyOptional({ description: 'Comisiones', type: CommissionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CommissionsDto)
  commissions?: CommissionsDto;

  @ApiPropertyOptional({ description: 'Recargos', type: SurchargesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SurchargesDto)
  surcharges?: SurchargesDto;

  @ApiPropertyOptional({ description: 'Monto original', example: 484.86 })
  @IsOptional()
  @IsNumber()
  originalAmount?: number;

  @ApiPropertyOptional({ description: 'Comisión total por uso de terminal', example: 0 })
  @IsOptional()
  @IsNumber()
  totalCommissionForTerminalUse?: number;

  @ApiPropertyOptional({ description: 'Comisión total por diferir a meses', example: 0 })
  @IsOptional()
  @IsNumber()
  totalCommissionForDeferringToMonths?: number;

  @ApiPropertyOptional({ description: 'Comisión total al cliente', example: 0 })
  @IsOptional()
  @IsNumber()
  totalCommissionToCustomer?: number;

  @ApiPropertyOptional({ description: 'Comisión total al negocio', example: 19.69 })
  @IsOptional()
  @IsNumber()
  totalCommissionToBusiness?: number;

  @ApiPropertyOptional({ description: 'Total a depositar al negocio', example: 465.17 })
  @IsOptional()
  @IsNumber()
  totalToDepositBusiness?: number;

  @ApiPropertyOptional({ description: 'Pago total por mes', example: 484.86 })
  @IsOptional()
  @IsNumber()
  totalPaymentPerMonth?: number;

  @ApiPropertyOptional({ description: 'Pago total', example: 484.86 })
  @IsOptional()
  @IsNumber()
  totalPayment?: number;
}

export class KarlopayPaymentWebhookDto {
  @ApiProperty({ description: 'Número de orden', example: 'PAYSES_01JJDAGRA4BTP8SHV4ETGEVG9V' })
  @IsString()
  numberOfOrder: string;

  @ApiPropertyOptional({ description: 'Tipo de tarjeta', example: 'CREDIT VISA' })
  @IsOptional()
  @IsString()
  cardType?: string;

  @ApiPropertyOptional({ description: 'Fecha de pago', example: '2025-01-24T17:32:40' })
  @IsOptional()
  @IsString()
  paymentDate?: string;

  @ApiPropertyOptional({ description: 'Tipo de tarjeta DC', example: 'visa' })
  @IsOptional()
  @IsString()
  cardDC?: string;

  @ApiPropertyOptional({ description: 'Nombre del banco', example: 'n/a' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: 'Código del banco', example: '999' })
  @IsOptional()
  @IsString()
  bankCode?: string;

  @ApiPropertyOptional({ description: 'Número de referencia', example: '84607756130' })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({ description: 'Titular de la tarjeta', example: 'F f' })
  @IsOptional()
  @IsString()
  cardHolder?: string;

  @ApiPropertyOptional({ description: 'Código postal', example: '45130' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Meses', example: 0 })
  @IsOptional()
  @IsNumber()
  meses?: number;

  @ApiPropertyOptional({ description: 'Método de pago', example: 'PUE' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Forma de pago', example: '04' })
  @IsOptional()
  @IsString()
  paymentForm?: string;

  @ApiPropertyOptional({ description: 'Promoción', example: false })
  @IsOptional()
  @IsBoolean()
  promotion?: boolean;

  @ApiPropertyOptional({ description: 'Últimos 4 dígitos', example: '494133******5344' })
  @IsOptional()
  @IsString()
  lastFour?: string;

  @ApiPropertyOptional({ description: 'Información adicional', example: { session_id: 'payses_01JJDAGRA4BTP8SHV4ETGEVG9V' } })
  @IsOptional()
  @IsObject()
  additional?: any;

  @ApiPropertyOptional({ description: 'Datos fiscales', type: TaxDataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TaxDataDto)
  taxData?: TaxDataDto;

  @ApiPropertyOptional({ description: 'Información de pago', type: PaymentInformationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentInformationDto)
  paymentInformation?: PaymentInformationDto;
}

