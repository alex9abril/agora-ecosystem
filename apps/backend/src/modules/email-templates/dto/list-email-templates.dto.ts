import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { EmailTemplateLevel } from './create-email-template.dto';

export class ListEmailTemplatesDto {
  @ApiPropertyOptional({
    description: 'Nivel del template',
    enum: EmailTemplateLevel,
    example: EmailTemplateLevel.GROUP,
  })
  @IsEnum(EmailTemplateLevel)
  @IsOptional()
  level?: EmailTemplateLevel;

  @ApiPropertyOptional({
    description: 'ID del grupo empresarial (para nivel group)',
  })
  @IsString()
  @IsOptional()
  business_group_id?: string;

  @ApiPropertyOptional({
    description: 'ID de la sucursal (para nivel business)',
  })
  @IsString()
  @IsOptional()
  business_id?: string;
}

