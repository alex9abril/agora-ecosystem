import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsUUID, IsBoolean, IsInt, IsDateString, IsObject, ValidateIf } from 'class-validator';
import { RedirectType } from './create-landing-slider.dto';

export class UpdateLandingSliderDto {
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

  @ApiPropertyOptional({ 
    description: 'Contenido del slider en formato JSONB (compatible con SlideContent)',
    example: {
      imageUrl: 'https://example.com/image.jpg',
      overlay: {
        title: 'Título actualizado'
      }
    }
  })
  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @ApiPropertyOptional({ 
    description: 'Tipo de redirección',
    enum: RedirectType
  })
  @IsOptional()
  @IsEnum(RedirectType)
  redirect_type?: RedirectType;

  @ApiPropertyOptional({ 
    description: 'ID del objetivo de redirección (categoría, promoción, o sucursal)'
  })
  @IsOptional()
  @IsUUID()
  @ValidateIf((o) => o.redirect_type && o.redirect_type !== RedirectType.URL && o.redirect_type !== RedirectType.NONE)
  redirect_target_id?: string;

  @ApiPropertyOptional({ 
    description: 'URL externa o ruta personalizada (si redirect_type = url)'
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.redirect_type === RedirectType.URL)
  redirect_url?: string;

  @ApiPropertyOptional({ 
    description: 'Orden de visualización (menor número = aparece primero)'
  })
  @IsOptional()
  @IsInt()
  display_order?: number;

  @ApiPropertyOptional({ 
    description: 'Si el slider está activo'
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ 
    description: 'Fecha de inicio de validez (opcional)'
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ 
    description: 'Fecha de fin de validez (opcional)'
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;
}

