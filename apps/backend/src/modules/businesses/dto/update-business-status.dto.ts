import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateBusinessStatusDto {
  @ApiProperty({ description: 'Estado activo del negocio', example: true })
  @IsBoolean()
  isActive: boolean;
}

