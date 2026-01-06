import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';

export class CreateShipmentDto {
  @ApiProperty({ description: 'ID de la cotización obtenida previamente' })
  @IsNotEmpty()
  @IsString()
  quotation_id: string;

  @ApiProperty({ description: 'ID de la orden', required: false })
  @IsOptional()
  @IsString()
  order_id?: string;

  @ApiProperty({ description: 'Formato de etiqueta', enum: ['pdf', 'zpl'], default: 'pdf', required: false })
  @IsOptional()
  @IsIn(['pdf', 'zpl'])
  label_format?: 'pdf' | 'zpl';
}

