import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsNumber, Min } from 'class-validator';

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
}

