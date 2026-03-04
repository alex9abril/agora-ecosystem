import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ArchiveStoreDto {
  @ApiProperty({
    description: 'Nombre de la tienda para confirmar el archivado (debe coincidir exactamente)',
    example: 'Toyota Satelite',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de confirmación es requerido' })
  @MaxLength(255)
  confirmName: string;
}
