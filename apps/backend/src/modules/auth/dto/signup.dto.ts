import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsBoolean, IsUUID } from 'class-validator';

export enum UserRole {
  CLIENT = 'client',
  REPARTIDOR = 'repartidor',
  LOCAL = 'local',
  ADMIN = 'admin',
}

export class SignUpDto {
  @ApiProperty({
    description: 'Email del usuario',
    example: 'usuario@example.com',
  })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({
    description: 'Contraseña (mínimo 6 caracteres)',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description: 'Apellido del usuario',
    example: 'Pérez',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    description: 'Teléfono del usuario',
    example: '+525512345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Rol del usuario en la plataforma',
    enum: UserRole,
    example: UserRole.CLIENT,
    required: false,
    default: UserRole.CLIENT,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Rol inválido' })
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Indica si se requiere confirmación de email al registrarse',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresEmailConfirmation?: boolean;

  @ApiPropertyOptional({
    description: 'URL de la tienda o contexto desde el que se registró',
    example: 'https://agoramp.mx/grupo/mi-grupo',
  })
  @IsOptional()
  @IsString()
  appUrl?: string;

  @ApiPropertyOptional({
    description: 'ID de la sucursal asociada al registro',
    example: '00000000-0000-0000-0000-000000000000',
  })
  @IsOptional()
  @IsUUID()
  businessId?: string;

  @ApiPropertyOptional({
    description: 'ID del grupo empresarial asociado al registro',
    example: '00000000-0000-0000-0000-000000000000',
  })
  @IsOptional()
  @IsUUID()
  businessGroupId?: string;
}

