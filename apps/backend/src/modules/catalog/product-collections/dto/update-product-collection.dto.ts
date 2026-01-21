import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProductCollectionDto {
  @ApiPropertyOptional({ description: 'Nombre visible de la colección', example: 'Bebidas' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Slug único por sucursal', example: 'bebidas' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @ApiPropertyOptional({
    description: "Estado de la colección ('active' | 'inactive')",
    example: 'inactive',
  })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}
