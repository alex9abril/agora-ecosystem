import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsUUID, IsUrl, Min, MaxLength } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Nombre de la categoría', example: 'Bebidas' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Descripción de la categoría', example: 'Bebidas frías y calientes' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'URL del icono', example: 'https://example.com/icon.png' })
  @IsOptional()
  @IsUrl()
  icon_url?: string;

  @ApiPropertyOptional({ description: 'ID de la categoría padre (para subcategorías)', example: '11111111-1111-1111-1111-111111111111' })
  @IsOptional()
  @IsUUID()
  parent_category_id?: string;

  @ApiPropertyOptional({ description: 'Orden de visualización', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;

  @ApiPropertyOptional({ description: 'Estado activo', example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

