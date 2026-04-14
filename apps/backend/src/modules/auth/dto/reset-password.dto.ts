import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({
    description: 'Email del usuario que solicita el reset',
    example: 'usuario@example.com',
  })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({
    description: 'URL de redirección después de solicitar reset',
    example: 'https://admin.tu-dominio.com/auth/reset-password',
    required: false,
  })
  @IsOptional()
  @IsUrl(
    { require_tld: false, require_protocol: true },
    { message: 'redirectTo debe ser una URL válida' }
  )
  redirectTo?: string;

  @ApiProperty({
    description:
      'Slug de sucursal (ej. desde /sucursal/mi-tienda/...). Prioriza plantilla de correo y branding de esa tienda.',
    required: false,
    example: 'toyota-satelite',
  })
  @IsOptional()
  @IsString()
  branchSlug?: string;

  @ApiProperty({
    description:
      'Slug de grupo empresarial (ej. desde /grupo/mi-grupo/...). Usa plantillas a nivel grupo cuando no hay sucursal.',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupSlug?: string;
}

export class UpdatePasswordDto {
  @ApiProperty({
    description: 'Token de recuperación recibido por email',
    example: 'abc123def456...',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'Nueva contraseña (mínimo 6 caracteres)',
    example: 'newpassword123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  newPassword: string;
}

