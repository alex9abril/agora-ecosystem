import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { dbPool } from '../../config/database.config';
import { IntegrationWorkflowsService } from './integration-workflows.service';
import {
  extractScheduleCronFromDefinition,
  shouldFireScheduledCron,
} from './workflow-schedule-cron.util';

/**
 * Evalúa cada minuto los workflows activos con nodo programado y dispara los que coinciden con data.cron.
 * Activar con INTEGRATION_WORKFLOW_SCHEDULE_ENABLED=true. Zona horaria del cron: WORKFLOW_SCHED_TZ (p. ej. UTC).
 */
@Injectable()
export class IntegrationWorkflowsScheduler {
  private readonly logger = new Logger(IntegrationWorkflowsScheduler.name);

  constructor(private readonly integrationWorkflowsService: IntegrationWorkflowsService) {}

  @Cron('* * * * *')
  async tickWorkflowSchedules(): Promise<void> {
    if (process.env.INTEGRATION_WORKFLOW_SCHEDULE_ENABLED !== 'true') {
      return;
    }
    if (!dbPool) {
      return;
    }
    const tz = process.env.WORKFLOW_SCHED_TZ || 'UTC';
    const now = new Date();
    try {
      const { rows } = await dbPool.query(
        `SELECT id, definition
         FROM integration.workflows
         WHERE is_enabled = true`,
      );
      for (const row of rows as { id: string; definition: unknown }[]) {
        const cron = extractScheduleCronFromDefinition(row.definition);
        if (!cron) continue;
        if (!shouldFireScheduledCron(cron, now, tz)) continue;
        try {
          await this.integrationWorkflowsService.runWorkflowScheduledJob(row.id);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(`Workflow schedule run failed id=${row.id}: ${msg}`);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Workflow schedule tick: ${msg}`);
    }
  }
}
