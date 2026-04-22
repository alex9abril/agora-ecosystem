import { apiRequest } from './api';

const base = (businessId: string) => `/businesses/${businessId}/integration`;

export type ConnectorTypeRow = {
  id: string;
  label: string;
  implementationStatus: string;
  metadata?: Record<string, unknown>;
  sortOrder?: number;
};

export type ConnectorRow = {
  id: string;
  businessId: string;
  connectorTypeId: string;
  name: string;
  isEnabled: boolean;
  config: Record<string, unknown>;
  hasPassword: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type WorkflowRow = {
  id: string;
  businessId: string;
  name: string;
  description?: string | null;
  isEnabled: boolean;
  definition: Record<string, unknown>;
  version: number;
  createdAt?: string;
  updatedAt?: string;
};

export type WorkflowRunRow = {
  id: string;
  workflowId: string;
  status: string;
  triggerType: string;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  logSummary: Record<string, unknown> | null;
};

export function fetchConnectorTypes(businessId: string) {
  return apiRequest<ConnectorTypeRow[]>(`${base(businessId)}/connector-types`);
}

export function fetchConnectors(businessId: string) {
  return apiRequest<ConnectorRow[]>(`${base(businessId)}/connectors`);
}

export function fetchConnector(businessId: string, connectorId: string) {
  return apiRequest<ConnectorRow>(`${base(businessId)}/connectors/${connectorId}`);
}

export function createConnector(
  businessId: string,
  body: {
    name: string;
    connectorTypeId: string;
    isEnabled?: boolean;
    config: Record<string, unknown>;
    password?: string;
  },
) {
  return apiRequest<ConnectorRow>(`${base(businessId)}/connectors`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateConnector(
  businessId: string,
  connectorId: string,
  body: { name?: string; isEnabled?: boolean; config?: Record<string, unknown>; password?: string },
) {
  return apiRequest<ConnectorRow>(`${base(businessId)}/connectors/${connectorId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteConnector(businessId: string, connectorId: string) {
  return apiRequest<void>(`${base(businessId)}/connectors/${connectorId}`, { method: 'DELETE' });
}

export type MssqlTestResult = { success: true } | { success: false; message: string };

export function testMssqlConnectionNew(
  businessId: string,
  body: {
    server: string;
    port?: number;
    database: string;
    user: string;
    password: string;
    options?: { encrypt?: boolean; trustServerCertificate?: boolean };
  },
) {
  return apiRequest<MssqlTestResult>(`${base(businessId)}/connectors/mssql/test`, {
    method: 'POST',
    body: JSON.stringify({
      server: body.server,
      port: body.port,
      database: body.database,
      user: body.user,
      password: body.password,
      options: body.options,
    }),
  });
}

export function testMssqlConnectionForConnector(
  businessId: string,
  connectorId: string,
  body?: {
    server?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    options?: { encrypt?: boolean; trustServerCertificate?: boolean };
  },
) {
  return apiRequest<MssqlTestResult>(`${base(businessId)}/connectors/${connectorId}/mssql/test`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}

export type MssqlPreviewResult = { rows: unknown[]; truncated?: boolean; total?: number };

export function previewMssqlQuery(businessId: string, connectorId: string, query: string) {
  return apiRequest<MssqlPreviewResult>(`${base(businessId)}/connectors/${connectorId}/mssql/preview`, {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
}

export function fetchWorkflows(businessId: string) {
  return apiRequest<WorkflowRow[]>(`${base(businessId)}/workflows`);
}

export function fetchWorkflow(businessId: string, workflowId: string) {
  return apiRequest<WorkflowRow>(`${base(businessId)}/workflows/${workflowId}`);
}

export function createWorkflow(
  businessId: string,
  body: { name: string; description?: string; isEnabled?: boolean; definition: Record<string, unknown> },
) {
  return apiRequest<WorkflowRow>(`${base(businessId)}/workflows`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateWorkflow(
  businessId: string,
  workflowId: string,
  body: { name?: string; description?: string; isEnabled?: boolean; definition?: Record<string, unknown> },
) {
  return apiRequest<WorkflowRow>(`${base(businessId)}/workflows/${workflowId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteWorkflow(businessId: string, workflowId: string) {
  return apiRequest<void>(`${base(businessId)}/workflows/${workflowId}`, { method: 'DELETE' });
}

export function runWorkflow(
  businessId: string,
  workflowId: string,
  options?: { definition?: Record<string, unknown> },
) {
  return apiRequest<{
    runId: string;
    status: string;
    error?: string;
    steps?: unknown[];
  }>(`${base(businessId)}/workflows/${workflowId}/run`, {
    method: 'POST',
    body: JSON.stringify(options && options.definition != null ? { definition: options.definition } : {}),
  });
}

export function fetchWorkflowRuns(businessId: string, workflowId: string, limit = 20) {
  return apiRequest<WorkflowRunRow[]>(
    `${base(businessId)}/workflows/${workflowId}/runs?limit=${limit}`,
  );
}

export const defaultWorkflowDefinition = (): Record<string, unknown> => ({
  nodes: [
    {
      id: 'n-trigger',
      type: 'triggerManual',
      position: { x: 0, y: 80 },
      data: { label: 'Inicio (manual)' },
    },
    {
      id: 'n-sink',
      type: 'sinkLog',
      position: { x: 400, y: 80 },
      data: { label: 'Resultado' },
    },
  ],
  edges: [
    {
      id: 'e1',
      source: 'n-trigger',
      target: 'n-sink',
      type: 'smoothstep',
    },
  ],
  viewport: { x: 0, y: 0, zoom: 1 },
});
