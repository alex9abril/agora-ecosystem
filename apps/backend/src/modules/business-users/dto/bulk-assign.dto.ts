import { IsUUID, IsEnum, IsOptional, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BusinessRole } from './assign-user.dto';

export class BulkAssignItemDto {
  @ApiProperty({ description: 'ID del negocio (sucursal)', example: 'a7877018-6a38-4166-8f11-335fae96b45d' })
  @IsUUID()
  business_id: string;

  @ApiProperty({ description: 'Rol en esta sucursal', enum: BusinessRole })
  @IsEnum(BusinessRole)
  role: BusinessRole;

  @ApiProperty({
    description: 'Permisos granulares para operador (modules/settings)',
    required: false,
    example: { modules: { orders: true }, settings: {} },
  })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, unknown>;
}

export class BulkAssignUserDto {
  @ApiProperty({ description: 'ID del usuario a asignar' })
  @IsUUID()
  user_id: string;

  @ApiProperty({
    description: 'Asignaciones por sucursal (una por business_id)',
    type: [BulkAssignItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkAssignItemDto)
  assignments: BulkAssignItemDto[];
}
