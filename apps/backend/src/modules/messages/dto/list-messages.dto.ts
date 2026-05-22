import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListMessagesDto {
  @ApiProperty({ description: 'ID de la sucursal (business)', example: 'uuid' })
  @IsString()
  @IsNotEmpty()
  business_id: string;

  @ApiPropertyOptional({ description: 'Filtrar por email destino', example: 'cliente@correo.com' })
  @IsString()
  @IsOptional()
  to_email?: string;

  @ApiPropertyOptional({ description: 'Filtrar por status', example: 'sent' })
  @IsString()
  @IsOptional()
  status?: string;

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

