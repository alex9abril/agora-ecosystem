import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ListProductClassificationsDto {
  @ApiProperty({ description: 'ID de la sucursal/negocio', example: '11111111-1111-1111-1111-111111111111' })
  @IsUUID()
  businessId: string;

  @ApiProperty({ description: 'Texto de búsqueda opcional', required: false, example: 'bebida' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
