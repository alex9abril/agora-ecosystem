import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LogisticsService } from './logistics.service';

/**
 * Sincronización periódica de guías Skydropx no terminales.
 * Activar con SKYDROPPX_SYNC_ENABLED=true.
 * Cron por defecto cada 6 horas; override con SKYDROPPX_SYNC_CRON (syntax cron estándar).
 */
@Injectable()
export class SkydropxRefreshScheduler {
  private readonly logger = new Logger(SkydropxRefreshScheduler.name);

  constructor(private readonly logisticsService: LogisticsService) {}

  @Cron(process.env.SKYDROPPX_SYNC_CRON || '0 */6 * * *')
  async syncOpenSkydropxShipments(): Promise<void> {
    if (process.env.SKYDROPPX_SYNC_ENABLED !== 'true') {
      return;
    }
    try {
      await this.logisticsService.refreshSkydropxOpenShipmentsBatch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Skydropx cron sync: ${msg}`);
    }
  }
}
