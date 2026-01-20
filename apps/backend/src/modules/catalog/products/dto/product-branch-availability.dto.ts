import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsBoolean, IsNumber, IsOptional, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductBranchAvailabilityDto {
  @ApiProperty({ description: 'ID de la sucursal', example: '11111111-1111-1111-1111-111111111111' })
  @IsUUID()
  branch_id: string;

  @ApiProperty({ description: 'Nombre de la sucursal', example: 'Sucursal Centro' })
  branch_name: string;

  @ApiProperty({ description: 'Si el producto esta habilitado en esta sucursal', example: true })
  @IsBoolean()
  is_enabled: boolean;

  @ApiPropertyOptional({ description: 'Precio especifico para esta sucursal (NULL = usar precio global)', example: 150.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price?: number | null;

  @ApiPropertyOptional({ description: 'Stock disponible en esta sucursal (NULL = sin limite)', example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock?: number | null;

  @ApiPropertyOptional({ description: 'Clasificacion asignada en la sucursal (UUID)', example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @IsUUID()
  classification_id?: string | null;

  @ApiPropertyOptional({ description: 'Lista de clasificaciones asignadas en la sucursal', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  classification_ids?: string[] | null;
}

export class UpdateProductBranchAvailabilityDto {
  @ApiProperty({ description: 'ID de la sucursal', example: '11111111-1111-1111-1111-111111111111' })
  @IsUUID()
  branch_id: string;

  @ApiProperty({ description: 'Si el producto esta habilitado en esta sucursal', example: true })
  @IsBoolean()
  is_enabled: boolean;

  @ApiPropertyOptional({ description: 'Precio especifico para esta sucursal (NULL = usar precio global)', example: 150.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price?: number | null;

  @ApiPropertyOptional({ description: 'Stock disponible en esta sucursal (NULL = sin limite)', example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock?: number | null;

  @ApiPropertyOptional({ description: 'Clasificacion asignada en la sucursal (UUID)', example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @IsUUID()
  classification_id?: string | null;

  @ApiPropertyOptional({ description: 'Lista de clasificaciones asignadas en la sucursal', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  classification_ids?: string[] | null;
}

export class BulkUpdateProductBranchAvailabilityDto {
  @ApiProperty({
    description: 'Array de disponibilidades por sucursal',
    type: [UpdateProductBranchAvailabilityDto],
    example: [
      {
        branch_id: '11111111-1111-1111-1111-111111111111',
        is_enabled: true,
        price: 150.0,
        stock: 50,
        classification_id: '22222222-2222-2222-2222-222222222222',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductBranchAvailabilityDto)
  availabilities: UpdateProductBranchAvailabilityDto[];
}
