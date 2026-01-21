import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateProductCollectionDto {
  @ApiProperty({
    description: 'ID de la sucursal/negocio dueño de la colección',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID()
  business_id: string;

  @ApiProperty({ description: 'Nombre visible de la colección', example: 'Bebidas' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Slug único por sucursal', example: 'bebidas' })
  @IsString()
  @MaxLength(120)
  slug: string;

  @ApiPropertyOptional({
    description: "Estado de la colección ('active' | 'inactive')",
    example: 'active',
    default: 'active',
  })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @ApiPropertyOptional({
    description: 'URL pública de la imagen de la colección',
    example: 'https://example.com/collections/image.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_url?: string;
}
