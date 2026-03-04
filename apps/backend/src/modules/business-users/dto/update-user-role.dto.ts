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
    description:
      'Permisos en formato JSON. Puede incluir modules, settings y capabilities. ' +
      'capabilities: { can_fulfill?: boolean, can_assign_fulfillment?: boolean } para surtir/asignar pedidos.',
    required: false,
    example: {
      modules: { orders: true },
      settings: { store: true },
      capabilities: { can_fulfill: true, can_assign_fulfillment: false },
    },
  })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, any>;
}

