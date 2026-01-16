import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class UpdateEmailTemplateDto {
  @ApiPropertyOptional({
    description: 'Nombre del template',
    example: 'Confirmación de Pedido',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Descripción del template',
    example: 'Se envía cuando se confirma un pedido',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Asunto del correo',
    example: 'Confirmación de tu pedido #{{order_number}}',
  })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional({
    description: 'Contenido HTML del template',
    example: '<html>...</html>',
  })
  @IsString()
  @IsOptional()
  template_html?: string;

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
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Si hereda del template global (nivel group)',
  })
  @IsBoolean()
  @IsOptional()
  inherit_from_global?: boolean;

  @ApiPropertyOptional({
    description: 'Si hereda del template del grupo (nivel business)',
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

