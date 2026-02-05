import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBusinessKarbotSettingsDto {
  @ApiPropertyOptional({ description: 'Habilitar Karbot para la sucursal', example: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Ambiente activo para Karbot', example: 'dev' })
  @IsOptional()
  @IsIn(['dev', 'prod'])
  environment?: 'dev' | 'prod';

  @ApiPropertyOptional({ description: 'Habilitar chatbot en storefront', example: true })
  @IsOptional()
  @IsBoolean()
  chatbot_enabled?: boolean;

  @ApiPropertyOptional({ description: 'Habilitar notificaciones WhatsApp', example: true })
  @IsOptional()
  @IsBoolean()
  whatsapp_enabled?: boolean;

  @ApiPropertyOptional({ description: 'Credenciales Karbot (dev)', example: { username: 'user', password: 'secret', endpoint: 'https://api.karbot.mx' } })
  @IsOptional()
  @IsObject()
  dev?: {
    username?: string;
    password?: string;
    endpoint?: string;
    template_ids?: {
      user_registration?: string;
      order_confirmation?: string;
      order_status_change?: string;
    };
  };

  @ApiPropertyOptional({ description: 'Credenciales Karbot (prod)', example: { username: 'user', password: 'secret', endpoint: 'https://api.karbot.mx' } })
  @IsOptional()
  @IsObject()
  prod?: {
    username?: string;
    password?: string;
    endpoint?: string;
    template_ids?: {
      user_registration?: string;
      order_confirmation?: string;
      order_status_change?: string;
    };
  };
}
