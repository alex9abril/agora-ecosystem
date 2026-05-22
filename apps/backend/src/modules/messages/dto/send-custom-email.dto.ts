import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendCustomEmailDto {
  @ApiProperty({ description: 'ID de la sucursal (business)', example: 'uuid' })
  @IsString()
  @IsNotEmpty()
  business_id: string;

  @ApiPropertyOptional({ description: 'ID del grupo empresarial (opcional; se resuelve desde business si no se envía)' })
  @IsString()
  @IsOptional()
  business_group_id?: string;

  @ApiPropertyOptional({ description: 'Email destino (si no se envía, debe enviarse to_user_id u order_id)' })
  @IsString()
  @IsOptional()
  to_email?: string;

  @ApiPropertyOptional({ description: 'User ID destino (se resolverá el email vía Supabase Auth)' })
  @IsString()
  @IsOptional()
  to_user_id?: string;

  @ApiPropertyOptional({ description: 'Order ID (se resolverá el cliente y su email)' })
  @IsString()
  @IsOptional()
  order_id?: string;

  @ApiProperty({ description: 'Asunto del correo', example: 'Seguimiento de tu pedido' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: 'Mensaje (texto plano). Se formatea a HTML preservando saltos de línea.' })
  @IsString()
  @IsNotEmpty()
  body: string;
}

