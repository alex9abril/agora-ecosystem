/** Alineado con lo que devuelve el backend en `runWorkflow` / `log_summary.steps` */
export type WorkflowRunStep = {
  nodeId: string;
  type: string;
  result?: unknown;
  error?: string;
  logs?: string[];
};

export type NodeRunExecutionView = {
  input: unknown;
  output: unknown;
  error?: string;
  logs?: string[];
  stepIndex: number;
  stepCount: number;
};

/** `input` del paso i = `result` del paso i-1; el primer nodo no tiene entrada previa. */
export function buildStepInput(steps: WorkflowRunStep[], stepIndex: number): unknown {
  if (stepIndex <= 0) return null;
  return steps[stepIndex - 1]?.result;
}

export function parseLogSummarySteps(logSummary: unknown): WorkflowRunStep[] | null {
  if (!logSummary || typeof logSummary !== 'object') return null;
  const s = logSummary as { steps?: unknown };
  if (!Array.isArray(s.steps)) return null;
  return s.steps as WorkflowRunStep[];
}
