import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { dbPool } from '../../config/database.config';
import { IntegrationWorkflowsService } from './integration-workflows.service';
import {
  isIntegrationWorkflowScheduleEnabled,
  isWorkflowScheduleLogVerbose,
} from './workflow-schedule-env.util';
import {
  extractScheduleCronFromDefinition,
  shouldFireScheduledCron,
} from './workflow-schedule-cron.util';

/**
 * Evalúa cada minuto los workflows activos con nodo programado y dispara los que coinciden con data.cron.
 * Activar con INTEGRATION_WORKFLOW_SCHEDULE_ENABLED=true (también 1 o yes). Zona horaria: WORKFLOW_SCHED_TZ (IANA).
 */
@Injectable()
export class IntegrationWorkflowsScheduler implements OnModuleInit {
  private readonly logger = new Logger(IntegrationWorkflowsScheduler.name);

  constructor(private readonly integrationWorkflowsService: IntegrationWorkflowsService) {}

  onModuleInit(): void {
    const tz = process.env.WORKFLOW_SCHED_TZ || 'UTC';
    if (isIntegrationWorkflowScheduleEnabled()) {
      this.logger.log(
        `Workflow cron: ACTIVO (cada minuto). TZ del cron="${tz}". ` +
          `Logs por minuto: INTEGRATION_WORKFLOW_SCHEDULE_LOG_VERBOSE=true. Reinicia el backend tras cambiar .env.`,
      );
    } else {
      this.logger.warn(
        'Workflow cron: INACTIVO. Para ejecutar flujos programados define INTEGRATION_WORKFLOW_SCHEDULE_ENABLED=true ' +
          '(valor exacto true, 1 o yes) y reinicia el proceso.',
      );
    }
  }

  @Cron('* * * * *')
  async tickWorkflowSchedules(): Promise<void> {
    if (!isIntegrationWorkflowScheduleEnabled()) {
      return;
    }
    if (!dbPool) {
      this.logger.warn('Workflow cron: dbPool no disponible; no se evalúan programaciones.');
      return;
    }
    const tz = process.env.WORKFLOW_SCHED_TZ || 'UTC';
    const verbose = isWorkflowScheduleLogVerbose();
    const now = new Date();
    try {
      const { rows } = await dbPool.query(
        `SELECT id, definition
         FROM integration.workflows
         WHERE is_enabled = true`,
      );
      let withCron = 0;
      let cronMatched = 0;
      let executed = 0;
      for (const row of rows as { id: string; definition: unknown }[]) {
        const cron = extractScheduleCronFromDefinition(row.definition);
        if (!cron) continue;
        withCron += 1;
        const match = shouldFireScheduledCron(cron, now, tz);
        if (verbose) {
          this.logger.log(
            `[workflow-cron] id=${row.id} cron="${cron}" tz=${tz} now=${now.toISOString()} match=${match}`,
          );
        }
        if (!match) continue;
        cronMatched += 1;
        try {
          const r = await this.integrationWorkflowsService.runWorkflowScheduledJob(row.id);
          if (r.executed) executed += 1;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(`Workflow schedule run failed id=${row.id}: ${msg}`);
        }
      }
      if (verbose) {
        this.logger.log(
          `[workflow-cron] tick: activos=${rows.length} con_cron=${withCron} coinciden_cron=${cronMatched} ejecutados=${executed} tz=${tz}`,
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Workflow schedule tick: ${msg}`);
    }
  }
}
