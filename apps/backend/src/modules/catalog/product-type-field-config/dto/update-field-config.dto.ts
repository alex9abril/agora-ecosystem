import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsInt, IsEnum, Min, MaxLength, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductType {
  FOOD = 'food',
  BEVERAGE = 'beverage',
  MEDICINE = 'medicine',
  GROCERY = 'grocery',
  NON_FOOD = 'non_food',
}

export class UpdateFieldConfigDto {
  @ApiProperty({ description: 'Nombre del campo', example: 'allergens' })
  @IsString()
  @MaxLength(100)
  field_name: string;

  @ApiProperty({ description: '¿Es visible este campo?', example: true })
  @IsBoolean()
  is_visible: boolean;

  @ApiProperty({ description: '¿Es requerido este campo?', example: false })
  @IsBoolean()
  is_required: boolean;

  @ApiProperty({ description: 'Orden de visualización', example: 11 })
  @IsInt()
  @Min(0)
  display_order: number;
}

export class BulkUpdateFieldConfigDto {
  @ApiProperty({ 
    description: 'Lista de configuraciones de campos a actualizar',
    type: [UpdateFieldConfigDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFieldConfigDto)
  field_configs: UpdateFieldConfigDto[];
}


