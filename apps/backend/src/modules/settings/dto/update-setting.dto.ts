import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsBoolean, IsObject, IsArray } from 'class-validator';

export class UpdateSettingDto {
  @ApiProperty({
    description: 'Nuevo valor de la configuración',
    example: true,
    oneOf: [
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
      { type: 'object' },
      { type: 'array' },
    ],
  })
  value: string | number | boolean | object | any[];

  @ApiProperty({
    description: 'Etiqueta de la configuración (opcional)',
    example: 'Impuestos Incluidos en Precio',
    required: false,
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({
    description: 'Descripción de la configuración (opcional)',
    example: 'Define si los impuestos ya están incluidos en el precio base',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Texto de ayuda adicional (opcional)',
    example: 'Si está activado, el precio mostrado ya incluye los impuestos',
    required: false,
  })
  @IsOptional()
  @IsString()
  help_text?: string;
}

export class BulkUpdateSettingsDto {
  @ApiProperty({
    description: 'Array de actualizaciones de configuraciones',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        value: { type: 'any' },
      },
    },
    example: [
      { key: 'taxes.included_in_price', value: true },
      { key: 'taxes.display_tax_breakdown', value: false },
    ],
  })
  updates: Array<{ key: string; value: any }>;
}

