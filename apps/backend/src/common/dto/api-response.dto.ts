import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para respuestas estándar de la API
 */
export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Indica si la operación fue exitosa' })
  success: boolean;

  @ApiProperty({ description: 'Datos de la respuesta' })
  data: T;

  @ApiProperty({ description: 'Timestamp de la respuesta', example: '2024-11-13T10:00:00.000Z' })
  timestamp: string;
}

/**
 * DTO para respuestas de error
 */
export class ApiErrorDto {
  @ApiProperty({ description: 'Indica si la operación fue exitosa', example: false })
  success: boolean;

  @ApiProperty({ description: 'Código de estado HTTP', example: 401 })
  statusCode: number;

  @ApiProperty({ description: 'Mensaje de error' })
  message: string | string[];

  @ApiProperty({ description: 'Timestamp del error', example: '2024-11-13T10:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ description: 'Ruta del endpoint', example: '/api/orders' })
  path: string;

  @ApiProperty({ description: 'Método HTTP', example: 'GET' })
  method: string;
}

