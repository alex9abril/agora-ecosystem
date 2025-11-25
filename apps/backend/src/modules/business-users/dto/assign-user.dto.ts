import { IsUUID, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BusinessRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  OPERATIONS_STAFF = 'operations_staff',
  KITCHEN_STAFF = 'kitchen_staff',
}

export class AssignUserDto {
  @ApiProperty({
    description: 'ID del usuario a asignar',
    example: 'a7877018-6a38-4166-8f11-335fae96b45d',
  })
  @IsUUID()
  user_id: string;

  @ApiProperty({
    description: 'Rol a asignar al usuario',
    enum: BusinessRole,
    example: BusinessRole.ADMIN,
  })
  @IsEnum(BusinessRole)
  role: BusinessRole;

  @ApiProperty({
    description: 'Permisos adicionales en formato JSON',
    required: false,
    example: { can_edit_prices: true },
  })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, any>;
}

