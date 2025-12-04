import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsUUID, IsUrl, IsNumber, IsArray, Min, MaxLength, IsEnum, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductType } from './create-product.dto';

export class UpdateProductDto {
  @ApiPropertyOptional({ description: 'Nombre del producto', example: 'Hamburguesa Clásica' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'SKU (Stock Keeping Unit) - Código único de identificación del producto', example: 'HAMB-CLAS-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({ description: 'Descripción del producto', example: 'Carne, lechuga, tomate, cebolla, queso' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'URL de la imagen', example: 'https://example.com/product.jpg' })
  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiPropertyOptional({ description: 'Precio del producto', example: 120.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({ description: 'Tipo de producto', enum: ProductType })
  @IsOptional()
  @IsEnum(ProductType)
  product_type?: ProductType;

  @ApiPropertyOptional({ description: 'ID de la categoría', example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @IsString()
  category_id?: string;

  @ApiPropertyOptional({ description: 'Disponible', example: true })
  @IsOptional()
  @IsBoolean()
  is_available?: boolean;

  @ApiPropertyOptional({ description: 'Destacado', example: false })
  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @ApiPropertyOptional({ description: 'Grupos de variantes estructuradas', example: [] })
  @IsOptional()
  @IsArray()
  variant_groups?: any[];

  @ApiPropertyOptional({ description: 'Variantes (JSON) - Deprecated, usar variant_groups', example: { size: ['pequeño', 'mediano', 'grande'] } })
  @IsOptional()
  variants?: any;

  @ApiPropertyOptional({ description: 'Información nutricional (JSON)', example: { calories: 500, protein: 25 } })
  @IsOptional()
  @IsObject()
  nutritional_info?: any;

  @ApiPropertyOptional({ description: 'Alérgenos', example: ['gluten', 'lactosa'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @ApiPropertyOptional({ description: 'Orden de visualización', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;

  // Campos de farmacia
  @ApiPropertyOptional({ description: 'Requiere receta médica (solo para medicamentos)', example: false })
  @IsOptional()
  @IsBoolean()
  requires_prescription?: boolean;

  @ApiPropertyOptional({ description: 'Restricción de edad (solo para medicamentos)', example: 18 })
  @IsOptional()
  @IsInt()
  @Min(0)
  age_restriction?: number;

  @ApiPropertyOptional({ description: 'Cantidad máxima por pedido (solo para medicamentos)', example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  max_quantity_per_order?: number;

  @ApiPropertyOptional({ description: 'Requiere validación de farmacéutico (solo para medicamentos)', example: false })
  @IsOptional()
  @IsBoolean()
  requires_pharmacist_validation?: boolean;
}

