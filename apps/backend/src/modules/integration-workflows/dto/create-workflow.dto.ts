import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateWorkflowDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiProperty({
    description: 'Definición JSON compatible con @xyflow/react: nodes, edges, viewport',
    example: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
  })
  @IsObject()
  definition: Record<string, unknown>;
}
