import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateRepartidorStatusDto {
  @ApiProperty({ description: 'Estado activo del repartidor', example: true })
  @IsBoolean()
  isActive: boolean;
}

