import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsBoolean, IsNumber, IsOptional, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductBranchAvailabilityDto {
  @ApiProperty({ description: 'ID de la sucursal', example: '11111111-1111-1111-1111-111111111111' })
  @IsUUID()
  branch_id: string;

  @ApiProperty({ description: 'Nombre de la sucursal', example: 'Sucursal Centro' })
  branch_name: string;

  @ApiProperty({ description: 'Si el producto está habilitado en esta sucursal', example: true })
  @IsBoolean()
  is_enabled: boolean;

  @ApiPropertyOptional({ description: 'Precio específico para esta sucursal (NULL = usar precio global)', example: 150.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price?: number | null;

  @ApiPropertyOptional({ description: 'Stock disponible en esta sucursal (NULL = sin límite)', example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock?: number | null;
}

export class UpdateProductBranchAvailabilityDto {
  @ApiProperty({ description: 'ID de la sucursal', example: '11111111-1111-1111-1111-111111111111' })
  @IsUUID()
  branch_id: string;

  @ApiProperty({ description: 'Si el producto está habilitado en esta sucursal', example: true })
  @IsBoolean()
  is_enabled: boolean;

  @ApiPropertyOptional({ description: 'Precio específico para esta sucursal (NULL = usar precio global)', example: 150.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price?: number | null;

  @ApiPropertyOptional({ description: 'Stock disponible en esta sucursal (NULL = sin límite)', example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock?: number | null;
}

export class BulkUpdateProductBranchAvailabilityDto {
  @ApiProperty({ 
    description: 'Array de disponibilidades por sucursal',
    type: [UpdateProductBranchAvailabilityDto],
    example: [
      {
        branch_id: '11111111-1111-1111-1111-111111111111',
        is_enabled: true,
        price: 150.00,
        stock: 50
      }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductBranchAvailabilityDto)
  availabilities: UpdateProductBranchAvailabilityDto[];
}

