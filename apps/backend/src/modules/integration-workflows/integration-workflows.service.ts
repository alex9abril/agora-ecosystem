import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { dbPool } from '../../config/database.config';
import { User } from '@supabase/supabase-js';
import type { config as MssqlConfig } from 'mssql';
import { CreateConnectorDto } from './dto/create-connector.dto';
import { UpdateConnectorDto } from './dto/update-connector.dto';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { encryptSecret, decryptSecret } from './connector-crypto.util';
import { getLinearExecutionOrder, FlowDefinition, FlowNode, type LinearExecutionEntry } from './workflow-executor.util';
import { extractScheduleCronFromDefinition } from './workflow-schedule-cron.util';
import { isWorkflowScheduleLogVerbose } from './workflow-schedule-env.util';
import {
  executeWorkflowUserCode,
  toJsonSafeForWorkflow,
} from './workflow-code-executor.util';
import type { PreviewWorkflowCodeDto } from './dto/preview-workflow-code.dto';
import {
  MAX_DATA_BRIDGE_INSERT_ROWS,
  extractRowsFromPrevious,
  isValidDataBridgeWriteTableName,
  resolveFieldSpec,
} from './workflow-sink-data-bridge.util';
import { parseStoreSyncConfig, syncIngestedRowsToStore } from './workflow-store-sync.util';

const MAX_RESULT_ROWS = 1000;
const MS_TIMEOUT_MS = 30000;

/* Cargar mssql vía require: en runtime el default import (import x from 'mssql') a menudo queda
 * undefined; require es el interop fiable con el paquete commonjs en Nest/ts-node. */
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const mssql = require('mssql') as typeof import('mssql');

@Injectable()
export class IntegrationWorkflowsService {
  private readonly logger = new Logger(IntegrationWorkflowsService.name);

  private async assertUserHasBusinessAccess(userId: string, businessId: string): Promise<void> {
    if (!dbPool) {
      throw new BadRequestException('Base de datos no configurada');
    }
    const { rows } = await dbPool.query(
      `SELECT 1 AS ok
       FROM core.business_users
       WHERE user_id = $1 AND business_id = $2 AND is_active = TRUE
       LIMIT 1`,
      [userId, businessId],
    );
    if (rows.length === 0) {
      throw new ForbiddenException('No tienes acceso a esta sucursal');
    }
  }

  // --- Catalog ---
  async listConnectorTypes(userId: string, businessId: string) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');
    const { rows } = await dbPool.query(
      `SELECT id, label, implementation_status AS "implementationStatus", metadata, sort_order AS "sortOrder"
       FROM integration.connector_types
       ORDER BY sort_order, id`,
    );
    return rows;
  }

  // --- Connectors ---
  private mapConnectorRow(row: any) {
    return {
      id: row.id,
      businessId: row.business_id,
      connectorTypeId: row.connector_type_id,
      name: row.name,
      isEnabled: row.is_enabled,
      config: row.config,
      hasPassword: !!row.password_ciphertext,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listConnectors(userId: string, businessId: string) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');
    const { rows } = await dbPool.query(
      `SELECT id, business_id, connector_type_id, name, is_enabled, config, password_ciphertext, created_at, updated_at
       FROM integration.connectors
       WHERE business_id = $1
       ORDER BY name`,
      [businessId],
    );
    return rows.map((r) => this.mapConnectorRow(r));
  }

  /** Lectura de conector por sucursal sin comprobar membresía (solo jobs internos como el cron de workflows). */
  private async fetchConnectorRow(businessId: string, id: string) {
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');
    const { rows } = await dbPool.query(
      `SELECT id, business_id, connector_type_id, name, is_enabled, config, password_ciphertext, created_at, updated_at
       FROM integration.connectors
       WHERE id = $1 AND business_id = $2`,
      [id, businessId],
    );
    if (rows.length === 0) throw new NotFoundException('Conector no encontrado');
    return this.mapConnectorRow(rows[0]);
  }

  async getConnector(userId: string, businessId: string, id: string) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    return this.fetchConnectorRow(businessId, id);
  }

  async createConnector(userId: string, businessId: string, dto: CreateConnectorDto) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');

    const { rows: trows } = await dbPool.query(
      `SELECT implementation_status FROM integration.connector_types WHERE id = $1`,
      [dto.connectorTypeId],
    );
    if (trows.length === 0) {
      throw new BadRequestException('Tipo de conector desconocido');
    }
    if ((trows[0] as { implementation_status: string }).implementation_status !== 'active') {
      throw new BadRequestException('Este tipo de conector aún no está disponible (solo implementación MSSQL en v1)');
    }
    if (dto.connectorTypeId !== 'mssql') {
      throw new BadRequestException('Solo el conector mssql está implementado en el backend');
    }

    let enc: string | null = null;
    if (dto.password != null && dto.password !== '') {
      try {
        enc = encryptSecret(dto.password);
      } catch (e: any) {
        throw new BadRequestException(e?.message || 'No se pudo cifrar la contraseña. Configure WORKFLOW_CONNECTOR_ENCRYPTION_KEY.');
      }
    }

    const { rows } = await dbPool.query(
      `INSERT INTO integration.connectors (business_id, connector_type_id, name, is_enabled, config, password_ciphertext)
       VALUES ($1, $2, $3, COALESCE($4, true), $5::jsonb, $6)
       RETURNING id, business_id, connector_type_id, name, is_enabled, config, password_ciphertext, created_at, updated_at`,
      [
        businessId,
        dto.connectorTypeId,
        dto.name,
        dto.isEnabled,
        JSON.stringify(dto.config || {}),
        enc,
      ],
    );
    return this.mapConnectorRow(rows[0]);
  }

  async updateConnector(userId: string, businessId: string, id: string, dto: UpdateConnectorDto) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');
    await this.getConnector(userId, businessId, id);

    const sets: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: unknown[] = [id, businessId];
    let p = 3;
    if (dto.name != null) {
      sets.push(`name = $${p++}`);
      params.push(dto.name);
    }
    if (dto.isEnabled != null) {
      sets.push(`is_enabled = $${p++}`);
      params.push(dto.isEnabled);
    }
    if (dto.config != null) {
      sets.push(`config = $${p++}::jsonb`);
      params.push(JSON.stringify(dto.config));
    }
    if (dto.password !== undefined && dto.password !== '') {
      try {
        sets.push(`password_ciphertext = $${p++}`);
        params.push(encryptSecret(dto.password));
      } catch (e: any) {
        throw new BadRequestException(e?.message || 'No se pudo cifrar la contraseña');
      }
    }

    const { rows } = await dbPool.query(
      `UPDATE integration.connectors
       SET ${sets.join(', ')}
       WHERE id = $1 AND business_id = $2
       RETURNING id, business_id, connector_type_id, name, is_enabled, config, password_ciphertext, created_at, updated_at`,
      params,
    );
    if (rows.length === 0) throw new NotFoundException('Conector no encontrado');
    return this.mapConnectorRow(rows[0]);
  }

  async deleteConnector(userId: string, businessId: string, id: string) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');
    const { rowCount } = await dbPool.query(
      `DELETE FROM integration.connectors WHERE id = $1 AND business_id = $2`,
      [id, businessId],
    );
    if (!rowCount) throw new NotFoundException('Conector no encontrado');
    return { ok: true };
  }

  // --- Workflows ---

  private mapWorkflowRow(row: any) {
    return {
      id: row.id,
      businessId: row.business_id,
      name: row.name,
      description: row.description,
      isEnabled: row.is_enabled,
      definition: row.definition,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listWorkflows(userId: string, businessId: string) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');
    const { rows } = await dbPool.query(
      `SELECT * FROM integration.workflows WHERE business_id = $1 ORDER BY name`,
      [businessId],
    );
    return rows.map((r) => this.mapWorkflowRow(r));
  }

  async getWorkflow(userId: string, businessId: string, id: string) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');
    const { rows } = await dbPool.query(
      `SELECT * FROM integration.workflows WHERE id = $1 AND business_id = $2`,
      [id, businessId],
    );
    if (rows.length === 0) throw new NotFoundException('Flujo no encontrado');
    return this.mapWorkflowRow(rows[0]);
  }

  async createWorkflow(userId: string, businessId: string, dto: CreateWorkflowDto) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');
    const { rows } = await dbPool.query(
      `INSERT INTO integration.workflows (business_id, name, description, is_enabled, definition, version)
       VALUES ($1, $2, $3, COALESCE($4, true), $5::jsonb, 1)
       RETURNING *`,
      [businessId, dto.name, dto.description ?? null, dto.isEnabled, JSON.stringify(dto.definition || {})],
    );
    return this.mapWorkflowRow(rows[0]);
  }

  async updateWorkflow(userId: string, businessId: string, id: string, dto: UpdateWorkflowDto) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');
    const { rows } = await dbPool.query(
      `UPDATE integration.workflows
       SET
         name = COALESCE($3, name),
         description = COALESCE($4, description),
         is_enabled = COALESCE($5, is_enabled),
         definition = COALESCE($6::jsonb, definition),
         version = version + 1,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND business_id = $2
       RETURNING *`,
      [
        id,
        businessId,
        dto.name ?? null,
        dto.description !== undefined ? dto.description : null,
        dto.isEnabled ?? null,
        dto.definition != null ? JSON.stringify(dto.definition) : null,
      ],
    );
    if (rows.length === 0) throw new NotFoundException('Flujo no encontrado');
    return this.mapWorkflowRow(rows[0]);
  }

  async deleteWorkflow(userId: string, businessId: string, id: string) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');
    const { rowCount } = await dbPool.query(
      `DELETE FROM integration.workflows WHERE id = $1 AND business_id = $2`,
      [id, businessId],
    );
    if (!rowCount) throw new NotFoundException('Flujo no encontrado');
    return { ok: true };
  }

  // --- Runs ---

  async listWorkflowRuns(userId: string, businessId: string, workflowId: string, limit = 20) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');
    await this.getWorkflow(userId, businessId, workflowId);
    const { rows } = await dbPool.query(
      `SELECT r.id, r.workflow_id AS "workflowId", r.status, r.trigger_type AS "triggerType",
              r.started_at AS "startedAt", r.finished_at AS "finishedAt", r.error, r.log_summary AS "logSummary"
       FROM integration.workflow_runs r
       INNER JOIN integration.workflows w ON w.id = r.workflow_id
       WHERE w.id = $1 AND w.business_id = $2
       ORDER BY r.started_at DESC
       LIMIT $3`,
      [workflowId, businessId, Math.min(100, Math.max(1, limit))],
    );
    return rows;
  }

  async runWorkflow(
    user: User,
    businessId: string,
    workflowId: string,
    options?: { definition?: Record<string, unknown> },
  ) {
    const userId = user.id;
    const wf = await this.getWorkflow(userId, businessId, workflowId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');

    const { rows: runInsert } = await dbPool.query(
      `INSERT INTO integration.workflow_runs (workflow_id, status, trigger_type, started_at)
       VALUES ($1, 'running', 'manual', CURRENT_TIMESTAMP)
       RETURNING id`,
      [workflowId],
    );
    const runId = (runInsert[0] as { id: string }).id;

    const hasInlineDef =
      options?.definition &&
      typeof options.definition === 'object' &&
      options.definition !== null &&
      'nodes' in options.definition;
    // is_enabled no bloquea runWorkflow: la ejecución manual (Play / API) siempre está permitida.
    const def = (
      hasInlineDef ? (options?.definition as FlowDefinition) : (wf.definition || {})
    ) as FlowDefinition;
    const definitionSource = hasInlineDef ? 'inline' : 'stored';

    return this.finalizeWorkflowRun(runId, businessId, workflowId, userId, def, definitionSource, 'default', false);
  }

  /**
   * Ejecuta un flujo activo disparado por el scheduler interno (sin JWT).
   * No-op si el flujo no existe, está desactivado, no tiene cron de programación o ya hubo un run schedule en el mismo minuto.
   * @returns executed true solo si insertó run y ejecutó el grafo (no dedupe).
   */
  async runWorkflowScheduledJob(workflowId: string): Promise<{ executed: boolean }> {
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');
    const { rows } = await dbPool.query(
      `SELECT id, business_id, definition, is_enabled
       FROM integration.workflows
       WHERE id = $1
       LIMIT 1`,
      [workflowId],
    );
    if (rows.length === 0) return { executed: false };
    const row = rows[0] as {
      id: string;
      business_id: string;
      definition: Record<string, unknown>;
      is_enabled: boolean;
    };
    if (!row.is_enabled) return { executed: false };
    const cron = extractScheduleCronFromDefinition(row.definition);
    if (!cron) return { executed: false };

    const { rows: dup } = await dbPool.query(
      `SELECT 1 AS ok
       FROM integration.workflow_runs
       WHERE workflow_id = $1
         AND trigger_type = 'schedule'
         AND started_at >= date_trunc('minute', CURRENT_TIMESTAMP)
       LIMIT 1`,
      [workflowId],
    );
    if (dup.length > 0) {
      if (isWorkflowScheduleLogVerbose()) {
        this.logger.log(
          `[workflow-cron] Sin ejecutar: ya existe un run schedule en este minuto (workflowId=${workflowId}).`,
        );
      }
      return { executed: false };
    }

    const { rows: runInsert } = await dbPool.query(
      `INSERT INTO integration.workflow_runs (workflow_id, status, trigger_type, started_at)
       VALUES ($1, 'running', 'schedule', CURRENT_TIMESTAMP)
       RETURNING id`,
      [workflowId],
    );
    const runId = (runInsert[0] as { id: string }).id;
    const def = (row.definition || {}) as FlowDefinition;
    this.logger.log(`[workflow-cron] Inicio ejecución programada workflowId=${workflowId} runId=${runId}`);
    const result = await this.finalizeWorkflowRun(
      runId,
      row.business_id,
      workflowId,
      null,
      def,
      'stored',
      'schedule',
      true,
    );
    this.logger.log(
      `[workflow-cron] Fin ejecución programada workflowId=${workflowId} runId=${runId} status=${result.status}` +
        (result.error ? ` error=${result.error}` : ''),
    );
    return { executed: true };
  }

  private async finalizeWorkflowRun(
    runId: string,
    businessId: string,
    workflowId: string,
    userId: string | null,
    def: FlowDefinition,
    definitionSource: 'inline' | 'stored',
    linearEntry: LinearExecutionEntry,
    scheduledTriggerContext: boolean,
  ): Promise<{ runId: string; status: string; error?: string; steps: { nodeId: string; type: string; result?: unknown; error?: string; logs?: string[] }[] }> {
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');
    const steps: { nodeId: string; type: string; result?: unknown; error?: string; logs?: string[] }[] = [];
    let finalError: string | null = null;

    try {
      const order = getLinearExecutionOrder(def, { entry: linearEntry });
      for (const node of order) {
        const r = await this.executeNode(node, businessId, userId, steps[steps.length - 1]?.result, {
          workflowId,
          scheduled: scheduledTriggerContext,
        });
        steps.push(r);
        if (r.error) {
          finalError = r.error;
          break;
        }
      }
    } catch (e: any) {
      finalError = e?.message || 'Error desconocido al ejecutar el flujo';
    }

    const status = finalError ? 'failed' : 'success';
    await dbPool.query(
      `UPDATE integration.workflow_runs
       SET status = $2, finished_at = CURRENT_TIMESTAMP, error = $3, log_summary = $4::jsonb
       WHERE id = $1`,
      [runId, status, finalError, JSON.stringify({ steps, workflowId, businessId, definitionSource })],
    );

    if (finalError) {
      return { runId, status: 'failed', error: finalError, steps };
    }
    return { runId, status: 'success', steps };
  }

  private async executeNode(
    node: FlowNode,
    businessId: string,
    userId: string | null,
    _previous: unknown,
    ctx?: { workflowId?: string; scheduled?: boolean },
  ): Promise<{ nodeId: string; type: string; result?: unknown; error?: string; logs?: string[] }> {
    const t = node.type;
    const data = (node.data || {}) as Record<string, unknown>;
    if (t === 'triggerManual') {
      return { nodeId: node.id, type: t, result: { message: 'ok' } };
    }
    if (t === 'triggerSchedule') {
      const message = ctx?.scheduled
        ? 'Ejecución programada por cron del servidor'
        : 'Inicio programado (ejecución manual o API)';
      return { nodeId: node.id, type: t, result: { message } };
    }
    if (t === 'sinkLog') {
      // Estilo n8n (paso intermedio): reenvía el Último payload al siguiente nodo sin anidarlo, para
      // no obligar a $input.first().json.previous en el nodo Code tras MSSQL.
      return {
        nodeId: node.id,
        type: t,
        result: _previous,
        logs: [
          'Salida interna: dato reenviado (passthrough) al siguiente paso. Futura: ingesta a staging.',
        ],
      };
    }
    if (t === 'connectorMssql') {
      const connectorId = (data.connectorId as string) || (data['connectorId'] as string);
      const queryText = (data.query as string) || '';
      if (!connectorId || !queryText) {
        return { nodeId: node.id, type: t, error: 'Nodo MSSQL: faltan connectorId o query' };
      }
      try {
        const rows = await this.queryMssql(userId, businessId, connectorId, queryText);
        const { usedConnection: _u, ...result } = rows as { usedConnection?: unknown; rows: unknown; truncated?: boolean; total?: number };
        return { nodeId: node.id, type: t, result };
      } catch (e: unknown) {
        return { nodeId: node.id, type: t, error: this.nodeErrorMessage(e) };
      }
    }
    if (t === 'code') {
      const code = String(data.code ?? '');
      if (!code.trim()) {
        return { nodeId: node.id, type: t, error: 'Nodo Code: añade código JavaScript' };
      }
      const exec = executeWorkflowUserCode(_previous, code);
      if (exec.ok === false) {
        return { nodeId: node.id, type: t, error: `Code: ${exec.error}`, logs: exec.logs };
      }
      return {
        nodeId: node.id,
        type: t,
        result: toJsonSafeForWorkflow(exec.result),
        logs: exec.logs,
      };
    }
    if (t === 'sinkAutomation') {
      return this.executeSinkAutomationNode(node, businessId, _previous, ctx ?? {});
    }
    if (t === 'httpRequest' || t === 'httpPlaceholder') {
      return { nodeId: node.id, type: t, result: { message: 'HTTP request: implementación pendiente' } };
    }
    return { nodeId: node.id, type: t, error: `Tipo de nodo no soportado aún: ${t}` };
  }

  /** Tablas BASE en el esquema `data_bridge` (introspección para el editor de workflows). */
  async listDataBridgeWriteTables(userId: string, businessId: string) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');
    const { rows } = await dbPool.query(
      `SELECT table_name AS "tableName"
       FROM information_schema.tables
       WHERE table_schema = 'data_bridge' AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
    );
    return rows;
  }

  /** Columnas de una tabla BASE en `data_bridge` (mapeo en UI). */
  async getDataBridgeWriteTableColumns(userId: string, businessId: string, tableName: string) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');
    const n = tableName.trim().toLowerCase();
    if (!isValidDataBridgeWriteTableName(n)) {
      throw new BadRequestException('Nombre de tabla no válido');
    }
    const { rows: exists } = await dbPool.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'data_bridge' AND table_type = 'BASE TABLE' AND table_name = $1 LIMIT 1`,
      [n],
    );
    if (exists.length === 0) {
      throw new BadRequestException(`La tabla "${n}" no existe en el esquema data_bridge`);
    }
    const { rows } = await dbPool.query(
      `SELECT column_name AS "columnName",
              data_type AS "dataType",
              is_nullable AS "isNullable",
              (column_default IS NOT NULL AND column_default <> '') AS "hasDefault"
       FROM information_schema.columns
       WHERE table_schema = 'data_bridge' AND table_name = $1
       ORDER BY ordinal_position`,
      [n],
    );
    return rows;
  }

  private normalizeDataBridgeInsertValue(dataType: string | undefined, v: unknown): unknown {
    if (v === null || v === undefined) return null;
    const t = (dataType || '').toLowerCase();
    if (v instanceof Date) {
      if (t.includes('timestamp') || t === 'date' || t.includes('time')) return v;
      return v.toISOString();
    }
    if (t === 'jsonb' || t === 'json') {
      if (typeof v === 'object' && !Array.isArray(v)) return v;
      if (typeof v === 'string') {
        try {
          return JSON.parse(v) as unknown;
        } catch {
          return { raw: v };
        }
      }
      return v;
    }
    if (t === 'numeric' || t === 'double precision' || t === 'real' || t === 'integer' || t === 'bigint' || t === 'smallint') {
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    return v;
  }

  private async executeSinkAutomationNode(
    node: FlowNode,
    businessId: string,
    _previous: unknown,
    ctx: { workflowId?: string },
  ): Promise<{ nodeId: string; type: string; result?: unknown; error?: string; logs?: string[] }> {
    const t = 'sinkAutomation';
    const data = (node.data || {}) as Record<string, unknown>;
    const tableName = String(data.tableName || '').trim().toLowerCase();
    const clearPreviousRecords = data.clearPreviousRecords === true;
    if (!isValidDataBridgeWriteTableName(tableName)) {
      return { nodeId: node.id, type: t, error: 'Nodo data_bridge: nombre de tabla no válido (solo a-z, números y _).' };
    }
    const qualifiedTable = `data_bridge.${tableName}`;

    const arrayPath = String(data.arrayPath ?? '');
    const rawMappings = data.fieldMappings;
    if (!rawMappings || typeof rawMappings !== 'object' || Array.isArray(rawMappings)) {
      return {
        nodeId: node.id,
        type: t,
        error:
          'Nodo data_bridge: define fieldMappings (objeto columna → ruta, $row, $businessId, $workflowId o $now).',
      };
    }
    const fieldMappings: Record<string, string> = { ...(rawMappings as Record<string, string>) };
    delete fieldMappings.business_id;
    delete fieldMappings.workflow_id;

    const extracted = extractRowsFromPrevious(_previous, arrayPath);
    if (extracted.ok === false) {
      return { nodeId: node.id, type: t, error: extracted.error };
    }
    const rows = extracted.rows;
    if (rows.length === 0) {
      return {
        nodeId: node.id,
        type: t,
        result: { inserted: 0, failed: 0, table: tableName, sampleErrors: [] as string[] },
        logs: ['Sin filas en la entrada; no se ejecutó INSERT.'],
      };
    }
    if (rows.length > MAX_DATA_BRIDGE_INSERT_ROWS) {
      return {
        nodeId: node.id,
        type: t,
        error: `Demasiadas filas para insertar (máx. ${MAX_DATA_BRIDGE_INSERT_ROWS}).`,
      };
    }

    if (!dbPool) {
      return { nodeId: node.id, type: t, error: 'Base de datos no configurada' };
    }

    const { rows: existsRows } = await dbPool.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'data_bridge' AND table_type = 'BASE TABLE' AND table_name = $1 LIMIT 1`,
      [tableName],
    );
    if (existsRows.length === 0) {
      return {
        nodeId: node.id,
        type: t,
        error: `Nodo data_bridge: la tabla "${tableName}" no existe en el esquema data_bridge.`,
      };
    }

    const { rows: colRows } = await dbPool.query(
      `SELECT column_name, data_type, is_nullable,
              (column_default IS NOT NULL AND column_default <> '') AS has_default
       FROM information_schema.columns
       WHERE table_schema = 'data_bridge' AND table_name = $1
       ORDER BY ordinal_position`,
      [tableName],
    );
    const colMeta = new Map<string, { dataType: string; nullable: boolean; hasDefault: boolean }>();
    for (const c of colRows as {
      column_name: string;
      data_type: string;
      is_nullable: string;
      has_default: boolean;
    }[]) {
      colMeta.set(c.column_name, {
        dataType: c.data_type,
        nullable: c.is_nullable === 'YES',
        hasDefault: !!c.has_default,
      });
    }
    if (colMeta.size === 0) {
      return { nodeId: node.id, type: t, error: 'Nodo data_bridge: no se pudieron leer columnas de la tabla.' };
    }

    const skipInsert = new Set(['id', 'created_at']);
    const insertCols = new Set<string>();
    if (colMeta.has('business_id')) insertCols.add('business_id');
    if (colMeta.has('workflow_id')) insertCols.add('workflow_id');
    for (const k of Object.keys(fieldMappings)) {
      if (typeof fieldMappings[k] !== 'string' || !fieldMappings[k].trim()) continue;
      if (!colMeta.has(k)) {
        return { nodeId: node.id, type: t, error: `Columna desconocida en la tabla: ${k}` };
      }
      if (skipInsert.has(k)) continue;
      insertCols.add(k);
    }
    if (colMeta.has('row_payload') && !insertCols.has('row_payload')) {
      insertCols.add('row_payload');
      fieldMappings.row_payload = '$row';
    }

    const orderedCols = Array.from(insertCols).filter((c) => !skipInsert.has(c)).sort();
    if (orderedCols.length === 0) {
      return {
        nodeId: node.id,
        type: t,
        error: 'Nodo data_bridge: no hay columnas para insertar (revisa mapeos y columnas de la tabla).',
      };
    }
    const clientCtx = { businessId, workflowId: ctx.workflowId ?? null, executedAt: new Date() };

    let inserted = 0;
    const errors: string[] = [];
    const logs: string[] = [];

    if (clearPreviousRecords) {
      try {
        const clearResult = await dbPool.query(`DELETE FROM ${qualifiedTable}`);
        const cleared = clearResult.rowCount ?? 0;
        logs.push(`Limpieza previa activa: se eliminaron ${cleared} fila(s) en ${tableName} antes de insertar.`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
          nodeId: node.id,
          type: t,
          error: `No se pudo limpiar la tabla ${tableName} antes de insertar: ${msg}`,
          logs: ['Activa "Borrar los registros anteriores" requiere permiso DELETE sobre la tabla destino.'],
        };
      }
    } else {
      logs.push('Limpieza previa desactivada: se insertará sin borrar datos existentes (puede duplicar filas).');
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row == null || typeof row !== 'object' || Array.isArray(row)) {
        errors.push(`Fila ${i}: no es un objeto`);
        continue;
      }
      const ro = row as Record<string, unknown>;
      const vals: unknown[] = [];
      let rowOk = true;
      for (const col of orderedCols) {
        if (col === 'business_id' && colMeta.has('business_id')) {
          vals.push(businessId);
          continue;
        }
        if (col === 'workflow_id' && colMeta.has('workflow_id')) {
          vals.push(ctx.workflowId ?? null);
          continue;
        }
        const spec = fieldMappings[col];
        if (!spec || typeof spec !== 'string') {
          errors.push(`Fila ${i}: falta mapeo para la columna ${col}`);
          rowOk = false;
          break;
        }
        const rawVal = resolveFieldSpec(ro, spec, clientCtx);
        const meta = colMeta.get(col);
        if ((rawVal === undefined || rawVal === null) && meta && !meta.nullable && !meta.hasDefault) {
          errors.push(`Fila ${i}: valor vacío para columna obligatoria ${col}`);
          rowOk = false;
          break;
        }
        vals.push(this.normalizeDataBridgeInsertValue(meta?.dataType, rawVal));
      }
      if (!rowOk || vals.length !== orderedCols.length) continue;

      const placeholders = orderedCols.map((_, j) => `$${j + 1}`).join(', ');
      const sql = `INSERT INTO ${qualifiedTable} (${orderedCols.map((c) => `"${c.replace(/"/g, '')}"`).join(', ')}) VALUES (${placeholders}) RETURNING 1`;
      try {
        const q = await dbPool.query(sql, vals);
        if ((q.rowCount ?? 0) > 0) {
          inserted++;
        } else {
          errors.push(`Fila ${i}: no se insertó (posible trigger o regla de negocio en la tabla)`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Fila ${i}: ${msg}`);
      }
    }

    if (inserted === 0 && rows.length > 0) {
      const summary = {
        inserted: 0,
        failed: errors.length,
        table: tableName,
        sampleErrors: errors.slice(0, 10),
      };
      return {
        nodeId: node.id,
        type: t,
        result: summary,
        error: errors.slice(0, 3).join(' | ') || 'No se insertó ninguna fila',
        logs: [...logs, 'No se insertaron filas. Revisa sampleErrors para ver el detalle por fila.'],
      };
    }

    const syncConfig = parseStoreSyncConfig(data);
    let storeSync: Awaited<ReturnType<typeof syncIngestedRowsToStore>> | undefined;
    if (syncConfig.syncWithStore && inserted > 0) {
      const sourceRows = rows.filter(
        (r): r is Record<string, unknown> => r != null && typeof r === 'object' && !Array.isArray(r),
      );
      storeSync = await syncIngestedRowsToStore(dbPool, {
        branchId: businessId,
        tableName,
        workflowId: ctx.workflowId ?? null,
        config: syncConfig,
        sourceRows,
        fieldMappings,
        ctx: clientCtx,
      });
      logs.push(
        `Sincronización con tienda: ${storeSync.updated} actualizado(s), ${storeSync.inserted} producto(s) nuevo(s) en catálogo, ${storeSync.skipped} omitido(s).`,
      );
      if (storeSync.errors.length > 0) {
        logs.push(`Sincronización con tienda: ${storeSync.errors.length} aviso(s) (ver storeSync.sampleErrors).`);
      }
    }

    return {
      nodeId: node.id,
      type: t,
      result: {
        inserted,
        failed: errors.length,
        table: tableName,
        sampleErrors: errors.slice(0, 10),
        ...(storeSync
          ? {
              storeSync: {
                matched: storeSync.matched,
                updated: storeSync.updated,
                inserted: storeSync.inserted,
                skipped: storeSync.skipped,
                sampleErrors: storeSync.errors.slice(0, 10),
              },
            }
          : {}),
      },
      logs:
        errors.length > 0
          ? [...logs, `Insertadas ${inserted} fila(s); ${errors.length} error(es) (ver sampleErrors en el resultado).`]
          : [...logs, `Insertadas ${inserted} fila(s) en ${tableName}.`],
    };
  }

  /** Texto útil para logs de flujo (HttpException no expone solo .message). */
  private nodeErrorMessage(e: unknown): string {
    if (e instanceof HttpException) {
      const r = e.getResponse();
      if (typeof r === 'string') return r;
      if (r && typeof r === 'object' && 'message' in r) {
        const m = (r as { message: string | string[] }).message;
        return Array.isArray(m) ? String(m[0]) : String(m);
      }
    }
    if (e instanceof Error) return e.message;
    return 'Error en consulta MSSQL';
  }

  /**
   * Opciones de tedious/mssql. Por defecto se acepta cert. autofirmado (equivalente a "Confiar en certificado" en SSMS).
   * Verificación estricta del certificado (falla con autofirmado): `strictServerCertificate: true` en config.options.
   * El flag antiguo `trustServerCertificate: false` en JSON ya no se usa (era el valor por defecto erróneo del formulario).
   */
  private mssqlDriverOptions(
    opt?: { encrypt?: boolean; strictServerCertificate?: boolean },
  ): NonNullable<MssqlConfig['options']> {
    const strict = (opt as { strictServerCertificate?: boolean } | undefined)?.strictServerCertificate === true;
    return {
      encrypt: opt?.encrypt !== false,
      trustServerCertificate: !strict,
      enableArithAbort: true,
      connectTimeout: MS_TIMEOUT_MS,
      requestTimeout: MS_TIMEOUT_MS,
    } as any;
  }

  private mssqlErrorMessage(e: unknown): string {
    const ex = e as { message?: string; originalError?: { message?: string } };
    return (ex?.message || ex?.originalError?.message || (typeof e === 'string' ? e : 'Error al conectar o ejecutar en SQL Server')) as string;
  }

  /** Campos frecuentes de tedious/Node para inspección (no incluye pila). */
  private mssqlErrorMeta(e: unknown): { errorCode?: string; errorNumber?: number; sqlState?: string } {
    const ex = e as { code?: string; number?: number; state?: string | number; originalError?: { code?: string; number?: number; message?: string } };
    const out: { errorCode?: string; errorNumber?: number; sqlState?: string } = {};
    const code = ex?.code ?? ex?.originalError?.code;
    const num = typeof ex?.number === 'number' ? ex.number : (ex?.originalError as { number?: number })?.number;
    const state = ex?.state;
    if (code != null && String(code) !== '') out.errorCode = String(code);
    if (typeof num === 'number') out.errorNumber = num;
    if (state != null) out.sqlState = String(state);
    return out;
  }

  /**
   * Lo que realmente se pasa a tedious/mssql (sin contraseña), para cotejar con otra app.
   */
  private mssqlConnectionPublicView(args: {
    connectorId?: string;
    server: string;
    port?: number;
    database: string;
    user: string;
    options?: { encrypt?: boolean; strictServerCertificate?: boolean };
  }) {
    const o = this.mssqlDriverOptions(args.options) as { encrypt?: boolean; trustServerCertificate?: boolean };
    const fullOpt = args.options as { strictServerCertificate?: boolean } | undefined;
    return {
      ...(args.connectorId ? { connectorId: args.connectorId } : {}),
      server: args.server,
      port: args.port ?? null,
      database: args.database,
      user: args.user,
      options: {
        encrypt: o.encrypt,
        trustServerCertificate: o.trustServerCertificate,
        ...(fullOpt?.strictServerCertificate === true ? { strictServerCertificate: true as const } : {}),
      },
    };
  }

  private async queryMssql(
    userId: string | null,
    businessId: string,
    connectorId: string,
    queryText: string,
  ) {
    const c = (
      userId
        ? await this.getConnector(userId, businessId, connectorId)
        : await this.fetchConnectorRow(businessId, connectorId)
    ) as any;
    if (!c.isEnabled) {
      throw new Error('Conector desactivado; actívalo en Configuración');
    }
    if (c.connectorTypeId !== 'mssql') {
      throw new Error('Solo MSSQL');
    }
    if (!c.hasPassword) {
      throw new Error('Configura la contraseña del conector');
    }
    if (!dbPool) throw new Error('Base de datos no configurada');
    const { rows: crows } = await dbPool.query(
      `SELECT password_ciphertext, config, connector_type_id, is_enabled
       FROM integration.connectors WHERE id = $1 AND business_id = $2`,
      [connectorId, businessId],
    );
    if (crows.length === 0) throw new NotFoundException('Conector no encontrado');
    const row = crows[0] as {
      password_ciphertext: string;
      config: Record<string, unknown>;
      is_enabled: boolean;
    };
    if (!row.is_enabled) throw new Error('Conector desactivado');
    let password: string;
    try {
      password = decryptSecret(row.password_ciphertext);
    } catch {
      throw new Error('No se pudo descifrar el secreto del conector. Verifique WORKFLOW_CONNECTOR_ENCRYPTION_KEY.');
    }
    const conf = (row.config || {}) as {
      server?: string;
      port?: number;
      database?: string;
      user?: string;
      options?: { encrypt?: boolean; strictServerCertificate?: boolean };
    };
    if (!conf.server || !conf.database || !conf.user) {
      throw new Error('Config de MSSQL incompleta (server, database, user)');
    }

    const config: MssqlConfig = {
      user: conf.user,
      password,
      server: conf.server,
      port: conf.port,
      database: conf.database,
      options: this.mssqlDriverOptions(conf.options),
    };

    const usedConnection = this.mssqlConnectionPublicView({
      connectorId,
      server: conf.server!,
      port: conf.port,
      database: conf.database!,
      user: conf.user!,
      options: conf.options,
    });

    if (!mssql?.ConnectionPool) {
      throw new Error('El driver mssql no está disponible (instale la dependencia mssql en el servidor).');
    }

    const pool = new mssql.ConnectionPool(config);
    try {
      await pool.connect();
    } catch (e) {
      try {
        await pool.close();
      } catch {
        /* ignore */
      }
      throw new BadRequestException({
        message: this.mssqlErrorMessage(e),
        usedConnection,
        ...this.mssqlErrorMeta(e),
      });
    }
    try {
      const r = await pool.request().query(queryText);
      const data = (r.recordset as unknown[]) || [];
      if (data.length > MAX_RESULT_ROWS) {
        return {
          rows: data.slice(0, MAX_RESULT_ROWS),
          truncated: true,
          total: data.length,
          usedConnection,
        };
      }
      return { rows: data, truncated: false, usedConnection };
    } catch (e) {
      throw new BadRequestException({
        message: this.mssqlErrorMessage(e),
        usedConnection,
        ...this.mssqlErrorMeta(e),
      });
    } finally {
      try {
        await pool.close();
      } catch {
        /* ignore */
      }
    }
  }

  private buildMssqlPoolConfig(
    conf: {
      server: string;
      port?: number;
      database: string;
      user: string;
      options?: { encrypt?: boolean; strictServerCertificate?: boolean };
    },
    password: string,
  ): MssqlConfig {
    return {
      user: conf.user,
      password,
      server: conf.server,
      port: conf.port,
      database: conf.database,
      options: this.mssqlDriverOptions(conf.options),
    };
  }

  /** SELECT 1 para validar host, credenciales y base. */
  async probeMssqlConnection(
    conf: {
      server: string;
      port?: number;
      database: string;
      user: string;
      options?: { encrypt?: boolean; strictServerCertificate?: boolean };
    },
    password: string,
    meta?: { connectorId?: string },
  ): Promise<
    | { success: true; usedConnection: ReturnType<IntegrationWorkflowsService['mssqlConnectionPublicView']> }
    | {
        success: false;
        message: string;
        usedConnection: ReturnType<IntegrationWorkflowsService['mssqlConnectionPublicView']>;
        errorCode?: string;
        errorNumber?: number;
        sqlState?: string;
      }
  > {
    const usedConnection = this.mssqlConnectionPublicView({
      connectorId: meta?.connectorId,
      server: conf.server,
      port: conf.port,
      database: conf.database,
      user: conf.user,
      options: conf.options,
    });
    try {
      const config = this.buildMssqlPoolConfig(conf, password);
      if (!mssql?.ConnectionPool) {
        return { success: false, message: 'Driver mssql no disponible en el servidor', usedConnection };
      }
      const pool = new mssql.ConnectionPool(config);
      await pool.connect();
      try {
        await pool.request().query('SELECT 1 AS ok');
      } finally {
        await pool.close();
      }
      return { success: true, usedConnection };
    } catch (e: any) {
      const msg =
        e?.message ||
        e?.originalError?.message ||
        (typeof e === 'string' ? e : 'Error de conexión a SQL Server');
      return {
        success: false,
        message: String(msg),
        usedConnection,
        ...this.mssqlErrorMeta(e),
      };
    }
  }

  async testMssqlWithPayload(
    userId: string,
    businessId: string,
    payload: {
      server: string;
      port?: number;
      database: string;
      user: string;
      password: string;
      options?: { encrypt?: boolean; strictServerCertificate?: boolean };
    },
  ) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');
    if (!payload.password) {
      return {
        success: false as const,
        message: 'Indica la contraseña para probar la conexión',
        usedConnection: this.mssqlConnectionPublicView({
          server: payload.server,
          port: payload.port,
          database: payload.database,
          user: payload.user,
          options: payload.options,
        }),
      };
    }
    return this.probeMssqlConnection(
      {
        server: payload.server,
        port: payload.port,
        database: payload.database,
        user: payload.user,
        options: payload.options,
      },
      payload.password,
      undefined,
    );
  }

  async testMssqlForConnector(
    userId: string,
    businessId: string,
    connectorId: string,
    override?: {
      server?: string;
      port?: number;
      database?: string;
      user?: string;
      password?: string;
      options?: { encrypt?: boolean; strictServerCertificate?: boolean };
    },
  ) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');
    const c = await this.getConnector(userId, businessId, connectorId);
    const base = (c.config || {}) as {
      server?: string;
      port?: number;
      database?: string;
      user?: string;
      options?: { encrypt?: boolean; strictServerCertificate?: boolean };
    };
    if (c.connectorTypeId !== 'mssql') {
      return {
        success: false as const,
        message: 'Solo se puede probar conexión MSSQL',
        usedConnection: this.mssqlConnectionPublicView({
          connectorId,
          server: base.server || '',
          port: base.port,
          database: base.database || '',
          user: base.user || '',
          options: base.options,
        }),
      };
    }
    const merged = {
      server: (override?.server !== undefined && override?.server !== null ? override.server : base.server) || '',
      port: override?.port !== undefined && override?.port !== null ? override.port : base.port,
      database:
        (override?.database !== undefined && override?.database !== null ? override.database : base.database) || '',
      user: (override?.user !== undefined && override?.user !== null ? override.user : base.user) || '',
      options: override?.options ?? base.options,
    };
    const viewFromMerged = () =>
      this.mssqlConnectionPublicView({
        connectorId,
        server: merged.server,
        port: merged.port,
        database: merged.database,
        user: merged.user,
        options: merged.options,
      });
    if (!merged.server || !merged.database || !merged.user) {
      return { success: false as const, message: 'Faltan campos: servidor, base de datos o usuario', usedConnection: viewFromMerged() };
    }
    let password: string;
    if (override?.password != null && override.password !== '') {
      password = override.password;
    } else {
      if (!c.hasPassword) {
        return {
          success: false as const,
          message: 'No hay contraseña guardada. Indica una en el formulario y prueba otra vez.',
          usedConnection: viewFromMerged(),
        };
      }
      const { rows: crows } = await dbPool.query(
        `SELECT password_ciphertext FROM integration.connectors WHERE id = $1 AND business_id = $2`,
        [connectorId, businessId],
      );
      if (crows.length === 0) {
        return { success: false as const, message: 'Conector no encontrado', usedConnection: viewFromMerged() };
      }
      try {
        password = decryptSecret((crows[0] as { password_ciphertext: string }).password_ciphertext);
      } catch {
        return { success: false as const, message: 'No se pudo descifrar el secreto del conector.', usedConnection: viewFromMerged() };
      }
    }
    return this.probeMssqlConnection(merged, password, { connectorId });
  }

  /**
   * Ejecuta la consulta contra el conector (misma lógica que en el nodo de flujo) para la vista previa en el editor.
   */
  async previewMssqlQuery(userId: string, businessId: string, connectorId: string, query: string) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    const q = (query || '').trim();
    if (!q) {
      throw new BadRequestException('Indica la consulta SQL');
    }
    try {
      return await this.queryMssql(userId, businessId, connectorId, q);
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      if (e instanceof BadRequestException) {
        throw e;
      }
      const msg = e instanceof Error ? e.message : String(e);
      throw new BadRequestException({ message: msg });
    }
  }

  /**
   * Vista previa del nodo Code (misma sandbox y API $input que en runWorkflow).
   */
  async previewWorkflowCode(userId: string, businessId: string, dto: PreviewWorkflowCodeDto) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    const rawInput = dto.input !== undefined && dto.input !== null ? dto.input : { message: 'ok' };
    const exec = executeWorkflowUserCode(rawInput, dto.code);
    if (exec.ok === false) {
      return { success: false as const, error: exec.error, logs: exec.logs };
    }
    return {
      success: true as const,
      result: toJsonSafeForWorkflow(exec.result),
      logs: exec.logs,
    };
  }
}
