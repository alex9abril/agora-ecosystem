import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsEnum } from 'class-validator';

export enum EmailTriggerType {
  USER_REGISTRATION = 'user_registration',
  ORDER_CONFIRMATION = 'order_confirmation',
  ORDER_STATUS_CHANGE = 'order_status_change',
}

export enum EmailTemplateLevel {
  GLOBAL = 'global',
  GROUP = 'group',
  BUSINESS = 'business',
}

export class CreateEmailTemplateDto {
  @ApiProperty({
    description: 'Tipo de evento que dispara el correo',
    enum: EmailTriggerType,
    example: EmailTriggerType.ORDER_CONFIRMATION,
  })
  @IsEnum(EmailTriggerType)
  @IsNotEmpty()
  trigger_type: EmailTriggerType;

  @ApiProperty({
    description: 'Nombre del template',
    example: 'Confirmación de Pedido',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción del template',
    example: 'Se envía cuando se confirma un pedido',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Asunto del correo',
    example: 'Confirmación de tu pedido #{{order_number}}',
  })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    description: 'Contenido HTML del template',
    example: '<html>...</html>',
  })
  @IsString()
  @IsNotEmpty()
  template_html: string;

  @ApiPropertyOptional({
    description: 'Contenido de texto plano del template',
  })
  @IsString()
  @IsOptional()
  template_text?: string;

  @ApiPropertyOptional({
    description: 'Variables disponibles en el template',
    example: ['user_name', 'order_number'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  available_variables?: string[];

  @ApiPropertyOptional({
    description: 'Si el template está activo',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  // Campos específicos para nivel group
  @ApiPropertyOptional({
    description: 'ID del grupo empresarial (requerido para nivel group)',
  })
  @IsString()
  @IsOptional()
  business_group_id?: string;

  @ApiPropertyOptional({
    description: 'Si hereda del template global (nivel group)',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  inherit_from_global?: boolean;

  // Campos específicos para nivel business
  @ApiPropertyOptional({
    description: 'ID de la sucursal (requerido para nivel business)',
  })
  @IsString()
  @IsOptional()
  business_id?: string;

  @ApiPropertyOptional({
    description: 'Si hereda del template del grupo (nivel business)',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  inherit_from_group?: boolean;

  @ApiPropertyOptional({
    description: 'URL del logo personalizado para este template',
  })
  @IsString()
  @IsOptional()
  logo_url?: string;
}

