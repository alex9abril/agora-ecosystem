import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class PreviewWorkflowCodeDto {
  @ApiProperty({ description: 'Código JavaScript; debe usar return. Expone $input / input (estilo n8n).' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200_000)
  code!: string;

  @ApiPropertyOptional({
    description: 'Entrada para $input (mismo rol que el resultado del nodo anterior en el flujo). Puede ser objeto o arreglo.',
  })
  @IsOptional()
  @Allow()
  input?: unknown;
}
