/** Acepta true / 1 / yes (mayúsculas y espacios). */
export function isIntegrationWorkflowScheduleEnabled(): boolean {
  const v = (process.env.INTEGRATION_WORKFLOW_SCHEDULE_ENABLED || '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/** Log detallado cada minuto: candidatos, cron y coincidencias (solo diagnóstico). */
export function isWorkflowScheduleLogVerbose(): boolean {
  const v = (process.env.INTEGRATION_WORKFLOW_SCHEDULE_LOG_VERBOSE || '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}
