import { ApiProperty } from '@nestjs/swagger';

export class UploadProductImageDto {
  @ApiProperty({ 
    description: 'Archivo de imagen a subir',
    type: 'string',
    format: 'binary'
  })
  file: Express.Multer.File;

  @ApiProperty({ 
    description: 'Texto alternativo para accesibilidad',
    required: false,
    example: 'Imagen del producto mostrando su apariencia',
    type: String,
  })
  alt_text?: string;

  @ApiProperty({ 
    description: 'Si esta imagen debe ser la principal del producto',
    required: false,
    default: false,
    example: 'true',
    type: String,
  })
  is_primary?: string;

  @ApiProperty({ 
    description: 'Orden de visualización (0 = primera, mayor número = más abajo)',
    required: false,
    default: '0',
    example: '0',
    type: String,
  })
  display_order?: string;
}

