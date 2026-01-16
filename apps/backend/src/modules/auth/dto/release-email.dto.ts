import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ReleaseEmailDto {
  @ApiProperty({
    description: 'Email a liberar para pruebas (desarrollo)',
    example: 'test@agoramp.mx',
  })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;
}

