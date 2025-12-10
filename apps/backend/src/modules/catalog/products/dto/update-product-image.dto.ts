import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductImageDto {
  @ApiPropertyOptional({ 
    description: 'Texto alternativo para accesibilidad',
    example: 'Imagen del producto mostrando su apariencia'
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  alt_text?: string;

  @ApiPropertyOptional({ 
    description: 'Si esta imagen debe ser la principal del producto',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_primary?: boolean;

  @ApiPropertyOptional({ 
    description: 'Orden de visualización (0 = primera, mayor número = más abajo)',
    example: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  display_order?: number;

  @ApiPropertyOptional({ 
    description: 'Si la imagen está activa',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_active?: boolean;
}

