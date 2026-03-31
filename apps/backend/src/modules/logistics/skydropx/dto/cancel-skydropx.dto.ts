import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelSkydropxDto {
  @ApiProperty({ required: false, description: 'Motivo de cancelación (Skydropx)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
