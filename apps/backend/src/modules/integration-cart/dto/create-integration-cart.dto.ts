import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateIntegrationCartDto {
  @ApiProperty({ description: 'ID del canal de venta (core.stores)', format: 'uuid' })
  @IsUUID('4', { message: 'storeId debe ser un UUID válido' })
  storeId: string;
}
