import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListInboxDto {
  @ApiPropertyOptional({ description: 'Filtrar por sucursal (business_id)', example: 'uuid' })
  @IsString()
  @IsOptional()
  business_id?: string;

  @ApiPropertyOptional({ description: 'Límite de resultados', example: 20, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset para paginación', example: 0, default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number;
}

