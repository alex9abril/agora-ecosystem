import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const PRODUCT_ENRICH_FIELDS = [
  'photography',
  'name',
  'description',
  'category',
  'shipping',
  'compatibility',
] as const;

export type ProductEnrichField = (typeof PRODUCT_ENRICH_FIELDS)[number];

export class EnrichProductDto {
  @ApiProperty({ description: 'ID del producto a enriquecer' })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Campos complementarios a completar',
    example: ['name', 'description', 'category', 'shipping', 'compatibility', 'photography'],
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(PRODUCT_ENRICH_FIELDS, { each: true })
  fields: ProductEnrichField[];
}

export class EnrichedCompatibilityItemDto {
  @ApiProperty()
  @IsString()
  make: string;

  @ApiProperty()
  @IsString()
  model: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year_start?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year_end?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body_trim?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  engine_transmission?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  confidence?: number;
}

export class EnrichedShippingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weight_kg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  length_cm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  width_cm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  height_cm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  estimated?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rationale?: string;
}

export class ApplyEnrichedProductDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty({ isArray: true })
  @IsArray()
  @IsIn(PRODUCT_ENRICH_FIELDS, { each: true })
  fields: ProductEnrichField[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiPropertyOptional({ isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image_urls?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => EnrichedShippingDto)
  shipping?: EnrichedShippingDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  compatibility_is_universal?: boolean;

  @ApiPropertyOptional({ type: [EnrichedCompatibilityItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnrichedCompatibilityItemDto)
  compatibility_items?: EnrichedCompatibilityItemDto[];
}

export class ApplyEnrichedProductsDto {
  @ApiProperty({ type: [ApplyEnrichedProductDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ApplyEnrichedProductDto)
  products: ApplyEnrichedProductDto[];
}
