import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para paginación
 */
export class PaginationDto {
  @ApiProperty({
    description: 'Número de página',
    example: 1,
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Cantidad de elementos por página',
    example: 10,
    required: false,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

/**
 * DTO para respuesta paginada
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Datos de la página actual' })
  data: T[];

  @ApiProperty({ description: 'Información de paginación' })
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

