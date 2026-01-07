import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEnum, IsUUID, IsBoolean, IsInt, IsDateString, IsObject, ValidateIf } from 'class-validator';

export enum RedirectType {
  CATEGORY = 'category',
  PROMOTION = 'promotion',
  BRANCH = 'branch',
  URL = 'url',
  NONE = 'none',
}

export class CreateLandingSliderDto {
  @ApiPropertyOptional({ 
    description: 'ID del grupo empresarial (si el slider es para un grupo)',
    example: '00000001-0000-0000-0000-000000000001'
  })
  @IsOptional()
  @IsUUID()
  business_group_id?: string;

  @ApiPropertyOptional({ 
    description: 'ID de la sucursal (si el slider es para una sucursal)',
    example: '00000001-0000-0000-0000-000000000001'
  })
  @IsOptional()
  @IsUUID()
  business_id?: string;

  @ApiProperty({ 
    description: 'Contenido del slider en formato JSONB (compatible con SlideContent)',
    example: {
      imageUrl: 'https://example.com/image.jpg',
      imageAlt: 'Texto alternativo',
      backgroundColor: '#FF5733',
      overlay: {
        position: 'left',
        title: 'Título principal',
        titleHighlight: 'Parte destacada',
        subtitle: 'Subtítulo',
        description: 'Descripción del slider',
        badge: 'YA DISPONIBLE',
        badgeColor: '#FF5733',
        ctaText: 'Ver más',
        ctaColor: '#FFFFFF'
      }
    }
  })
  @IsNotEmpty()
  @IsObject()
  content: Record<string, any>;

  @ApiPropertyOptional({ 
    description: 'Tipo de redirección',
    enum: RedirectType,
    example: RedirectType.CATEGORY
  })
  @IsOptional()
  @IsEnum(RedirectType)
  redirect_type?: RedirectType;

  @ApiPropertyOptional({ 
    description: 'ID del objetivo de redirección (categoría, promoción, o sucursal)',
    example: '00000001-0000-0000-0000-000000000001'
  })
  @IsOptional()
  @IsUUID()
  @ValidateIf((o) => o.redirect_type && o.redirect_type !== RedirectType.URL && o.redirect_type !== RedirectType.NONE)
  redirect_target_id?: string;

  @ApiPropertyOptional({ 
    description: 'URL externa o ruta personalizada (si redirect_type = url)',
    example: 'https://example.com/promo'
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.redirect_type === RedirectType.URL)
  redirect_url?: string;

  @ApiPropertyOptional({ 
    description: 'Orden de visualización (menor número = aparece primero)',
    example: 0,
    default: 0
  })
  @IsOptional()
  @IsInt()
  display_order?: number;

  @ApiPropertyOptional({ 
    description: 'Si el slider está activo',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ 
    description: 'Fecha de inicio de validez (opcional)',
    example: '2024-01-01T00:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ 
    description: 'Fecha de fin de validez (opcional)',
    example: '2024-12-31T23:59:59Z'
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;
}

