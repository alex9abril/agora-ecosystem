import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class EmbeddedInitDto {
  @ApiProperty({ description: 'ID del grupo de órdenes' })
  @IsString()
  orderGroupId: string;

  @ApiProperty({ description: 'numberOfOrder de Karlopay' })
  @IsString()
  numberOfOrder: string;

  @ApiPropertyOptional({ description: 'ID de sucursal' })
  @IsOptional()
  @IsString()
  businessId?: string;
}
