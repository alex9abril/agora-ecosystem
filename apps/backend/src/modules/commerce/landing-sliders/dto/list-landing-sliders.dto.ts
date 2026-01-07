import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListLandingSlidersDto {
  @ApiPropertyOptional({ 
    description: 'Filtrar por grupo empresarial',
    example: '00000001-0000-0000-0000-000000000001'
  })
  @IsOptional()
  @IsUUID()
  business_group_id?: string;

  @ApiPropertyOptional({ 
    description: 'Filtrar por sucursal',
    example: '00000001-0000-0000-0000-000000000001'
  })
  @IsOptional()
  @IsUUID()
  business_id?: string;

  @ApiPropertyOptional({ 
    description: 'Solo mostrar sliders activos',
    example: true,
    default: true
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  only_active?: boolean;

  @ApiPropertyOptional({ 
    description: 'Número de página',
    example: 1,
    default: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ 
    description: 'Límite de resultados por página',
    example: 20,
    default: 20
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

