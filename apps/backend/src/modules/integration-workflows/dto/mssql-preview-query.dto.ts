import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class MssqlPreviewQueryDto {
  @ApiProperty({ example: 'SELECT TOP 5 * FROM dbo.algo' })
  @IsString()
  @MinLength(1, { message: 'Indica la consulta SQL' })
  @MaxLength(200_000)
  query!: string;
}
