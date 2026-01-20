import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProductClassificationDto {
  @ApiPropertyOptional({ description: 'Nombre visible de la clasificación', example: 'Bebidas' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Slug único por sucursal', example: 'bebidas' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;
}
