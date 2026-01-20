import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateProductClassificationDto {
  @ApiProperty({ description: 'ID de la sucursal/negocio dueño de la clasificación', example: '11111111-1111-1111-1111-111111111111' })
  @IsUUID()
  business_id: string;

  @ApiProperty({ description: 'Nombre visible de la clasificación', example: 'Bebidas' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Slug único por sucursal', example: 'bebidas' })
  @IsString()
  @MaxLength(120)
  slug: string;
}
