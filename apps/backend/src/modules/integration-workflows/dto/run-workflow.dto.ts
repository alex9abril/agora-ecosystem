import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class RunWorkflowDto {
  @ApiPropertyOptional({
    description:
      'Definición del flujo a ejecutar (nodos, edges, viewport). Si se envía, se usa en lugar de la guardada en BD; así se puede probar el grafo actual del editor sin guardar antes.',
  })
  @IsOptional()
  @IsObject()
  definition?: Record<string, unknown>;
}
