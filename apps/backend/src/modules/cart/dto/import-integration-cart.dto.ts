import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ImportIntegrationCartDto {
  @ApiProperty({
    description: 'Token `t` del enlace firmado (GET /integrations/cart/session)',
    example: 'eyJ2IjoxLCJjYXJ0SWQiOi...',
  })
  @IsString()
  @IsNotEmpty({ message: 'token es requerido' })
  token: string;
}
