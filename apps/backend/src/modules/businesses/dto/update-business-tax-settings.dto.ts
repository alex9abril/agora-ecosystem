import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateBusinessTaxSettingsDto {
  @ApiPropertyOptional({
    description: 'Indica si los impuestos estan incluidos en el precio base de los productos',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  included_in_price?: boolean;

  @ApiPropertyOptional({
    description: 'Mostrar desglose de impuestos en el storefront',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  display_tax_breakdown?: boolean;

  @ApiPropertyOptional({
    description: 'Mostrar etiqueta de impuestos incluidos cuando aplique',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  show_tax_included_label?: boolean;
}
