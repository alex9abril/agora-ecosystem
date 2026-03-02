import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateBusinessKarlopaySettingsDto {
  @ApiPropertyOptional({ description: 'Habilitar Karlopay para la sucursal', example: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Ambiente activo para Karlopay', example: 'dev' })
  @IsOptional()
  @IsIn(['dev', 'prod'])
  environment?: 'dev' | 'prod';

  @ApiPropertyOptional({ 
    description: 'Credenciales Karlopay (dev)', 
    example: { 
      domain: 'https://dev.karlopay.com',
      login_endpoint: 'https://dev.karlopay.com/api/auth/login',
      orders_endpoint: 'https://dev.karlopay.com/api/orders/create-or-update',
      auth_email: 'user@example.com',
      auth_password: 'secret',
      redirect_url: 'https://example.com/payment/redirect'
    } 
  })
  @IsOptional()
  @IsObject()
  dev?: {
    domain?: string;
    login_endpoint?: string;
    orders_endpoint?: string;
    auth_email?: string;
    auth_password?: string;
    redirect_url?: string;
  };

  @ApiPropertyOptional({ 
    description: 'Credenciales Karlopay (prod)', 
    example: { 
      domain: 'https://karlopay.com',
      login_endpoint: 'https://karlopay.com/api/auth/login',
      orders_endpoint: 'https://karlopay.com/api/orders/create-or-update',
      auth_email: 'user@example.com',
      auth_password: 'secret',
      redirect_url: 'https://example.com/payment/redirect'
    } 
  })
  @IsOptional()
  @IsObject()
  prod?: {
    domain?: string;
    login_endpoint?: string;
    orders_endpoint?: string;
    auth_email?: string;
    auth_password?: string;
    redirect_url?: string;
  };
}

