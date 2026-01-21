import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ListProductCollectionsDto {
  @ApiProperty({
    description: 'ID de la sucursal/negocio',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID()
  businessId: string;

  @ApiPropertyOptional({ description: 'Texto de búsqueda opcional', required: false, example: 'bebida' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    description: "Filtrar por estado ('active' | 'inactive' | 'all')",
    example: 'active',
    default: 'active',
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'all'])
  status?: 'active' | 'inactive' | 'all';
}
