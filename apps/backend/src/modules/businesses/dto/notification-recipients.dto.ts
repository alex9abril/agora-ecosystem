import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateNotificationRecipientDto {
  @ApiProperty({
    description: 'Correo electrónico del destinatario',
    example: 'supervisor@empresa.com',
  })
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({
    description: 'Nombre o etiqueta del destinatario',
    example: 'Juan Pérez',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}
