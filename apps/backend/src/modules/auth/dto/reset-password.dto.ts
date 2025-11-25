import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({
    description: 'Email del usuario que solicita el reset',
    example: 'usuario@example.com',
  })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;
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

