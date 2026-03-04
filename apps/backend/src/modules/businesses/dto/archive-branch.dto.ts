import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ArchiveBranchDto {
  @ApiProperty({
    description: 'Nombre de la sucursal para confirmar el archivado (debe coincidir con el nombre mostrado)',
    example: 'Toyota Coyoacan',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de confirmación es requerido' })
  @MaxLength(255)
  confirmName: string;
}
