import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsString, ValidateNested } from 'class-validator';

export const BRANCH_NOTIFICATION_TYPES = [
  'user_registration',
  'order_confirmation',
  'order_status_change',
  'supervisor_notification',
] as const;

export type BranchNotificationType = typeof BRANCH_NOTIFICATION_TYPES[number];

export class BranchNotificationSettingDto {
  @ApiProperty({
    description: 'Tipo de notificación',
    example: 'order_confirmation',
  })
  @IsString()
  @IsIn(BRANCH_NOTIFICATION_TYPES)
  notification_type: BranchNotificationType;

  @ApiProperty({ description: 'Habilitar email', example: true })
  @IsBoolean()
  email_enabled: boolean;

  @ApiProperty({ description: 'Habilitar WhatsApp', example: false })
  @IsBoolean()
  whatsapp_enabled: boolean;
}

export class UpdateBusinessNotificationSettingsDto {
  @ApiProperty({
    description: 'Configuraciones de notificación por tipo',
    type: [BranchNotificationSettingDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BranchNotificationSettingDto)
  settings: BranchNotificationSettingDto[];
}
