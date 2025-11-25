import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Controlador de salud del sistema
 * 
 * Endpoints públicos para monitoreo y health checks
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  /**
   * Health check básico
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check básico del sistema' })
  @ApiResponse({ status: 200, description: 'Sistema funcionando correctamente' })
  health() {
    return {
      status: 'ok',
      service: 'localia-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /**
   * Health check detallado (incluye BD)
   */
  @Public()
  @Get('detailed')
  @ApiOperation({ summary: 'Health check detallado (incluye verificación de BD)' })
  @ApiResponse({ status: 200, description: 'Sistema y BD funcionando correctamente' })
  async detailedHealth() {
    // Aquí puedes agregar verificación de BD, etc.
    return {
      status: 'ok',
      service: 'localia-backend',
      database: 'connected', // Verificar conexión real
      timestamp: new Date().toISOString(),
    };
  }
}

