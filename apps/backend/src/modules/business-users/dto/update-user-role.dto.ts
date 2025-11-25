import { IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BusinessRole } from './assign-user.dto';

export class UpdateUserRoleDto {
  @ApiProperty({
    description: 'Nuevo rol del usuario',
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

