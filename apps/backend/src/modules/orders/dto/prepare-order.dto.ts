import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsString, IsInt, Min, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export enum StockShortageOptionType {
  REFUND = 'refund',
  OTHER_BRANCH = 'other_branch',
  WALLET = 'wallet',
}

export class PrepareOrderItemDto {
  @ApiProperty({ description: 'ID del item del pedido', example: '11111111-1111-1111-1111-111111111111' })
  @IsUUID()
  item_id: string;

  @ApiProperty({ description: 'Nueva cantidad del item', example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class StockShortageOptionDto {
  @ApiProperty({ description: 'ID del producto con escasez', example: '11111111-1111-1111-1111-111111111111' })
  @IsUUID()
  product_id: string;

  @ApiProperty({ 
    description: 'Tipo de opción para manejar la escasez',
    enum: StockShortageOptionType,
    example: StockShortageOptionType.WALLET
  })
  @IsEnum(StockShortageOptionType)
  option_type: StockShortageOptionType;

  @ApiPropertyOptional({ description: 'ID de la sucursal alternativa (solo para other_branch)', example: '22222222-2222-2222-2222-222222222222' })
  @IsOptional()
  @IsUUID()
  alternative_branch_id?: string;

  @ApiProperty({ description: 'Cantidad faltante', example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  shortage_quantity: number;
}

export class PrepareOrderDto {
  @ApiProperty({ 
    description: 'Items del pedido con cantidades ajustadas',
    type: [PrepareOrderItemDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrepareOrderItemDto)
  items: PrepareOrderItemDto[];

  @ApiPropertyOptional({ 
    description: 'Opciones para manejar productos con stock insuficiente',
    type: [StockShortageOptionDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockShortageOptionDto)
  shortage_options?: StockShortageOptionDto[];
}

