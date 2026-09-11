import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
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
import {
  applyHttpPaginationQueryParams,
  httpPaginationItemCount,
  httpPaginationShouldStop,
  httpPaginationTotal,
  parseHttpPaginationConfig,
  slimHttpResultForLog,
  slimUnknownForLog,
} from './workflow-http-pagination.util';
import {
  UploadDataBridgeTestExportDto,
  DataBridgeTestExportTableName,
} from './dto/upload-data-bridge-test-export.dto';
import { MergeDataBridgeTestExportsDto } from './dto/merge-data-bridge-test-exports.dto';

const MAX_RESULT_ROWS = 10_000;
const MS_TIMEOUT_MS = 30000;
const DATA_BRIDGE_TEST_EXPORT_BATCH_SIZE: Record<DataBridgeTestExportTableName, number> = {
  prueba_inventory_export: 100,
  prueba_mex_insurance_prices_export: 1000,
};
const DATA_BRIDGE_TEST_EXPORT_MERGE_BATCH_SIZE = 1000;
const ALDEN_SATELITE_STORE_PUBLISH_SCRIPT = '017_publish_integracion_alden_satelite_to_store.sql';

type HttpKvPairInput = { key?: string; value?: string; enabled?: boolean };
type HttpRestBodyMode = 'none' | 'urlencoded' | 'json';
type HttpRestNodeRequestOpts = {
  method?: string;
  path?: string;
  queryParams?: HttpKvPairInput[];
  headers?: HttpKvPairInput[];
  bodyMode?: HttpRestBodyMode;
  bodyParams?: HttpKvPairInput[];
  bodyJson?: unknown;
};

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
    // http_rest ya implementado: normalizar catálogo aunque el seed aún diga "planned"
    return rows.map((row: any) => {
      if (row.id === 'http_rest') {
        return {
          ...row,
          label: 'HTTP / REST',
          implementationStatus: 'active',
        };
      }
      return row;
    });
  }

  async listIntegrationBusinesses(userId: string) {
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');
    const { rows } = await dbPool.query(
      `SELECT
         b.id,
         b.name,
         b.slug,
         bu.role
       FROM core.business_users bu
       INNER JOIN core.businesses b ON b.id = bu.business_id
       WHERE bu.user_id = $1
         AND bu.is_active = TRUE
         AND COALESCE(b.archived_at IS NULL, TRUE)
       ORDER BY b.name`,
      [userId],
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
    const typeStatus = (trows[0] as { implementation_status: string }).implementation_status;
    const isHttpRest = dto.connectorTypeId === 'http_rest';
    const isMssql = dto.connectorTypeId === 'mssql';
    if (!isMssql && !isHttpRest) {
      throw new BadRequestException(`Tipo de conector no implementado: ${dto.connectorTypeId}`);
    }
    // http_rest puede seguir "planned" en BD hasta aplicar script 014; el backend ya lo soporta
    if (typeStatus !== 'active' && !isHttpRest) {
      throw new BadRequestException('Este tipo de conector aún no está disponible');
    }

    if (isHttpRest) {
      this.assertHttpRestConfig(dto.config || {});
      if (dto.password == null || dto.password === '') {
        throw new BadRequestException('Indica la API key (valor del header de autenticación)');
      }
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
      const existing = await this.fetchConnectorRow(businessId, id);
      if (existing.connectorTypeId === 'http_rest') {
        this.assertHttpRestConfig({ ...(existing.config || {}), ...dto.config });
      }
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
      let previous: unknown;
      for (let i = 0; i < order.length; i++) {
        const node = order[i];
        const pagination = parseHttpPaginationConfig((node.data || {}) as Record<string, unknown>);
        const isHttp = node.type === 'httpRequest' || node.type === 'httpPlaceholder';
        if (isHttp && pagination) {
          const rest = order.slice(i + 1);
          const loop = await this.executePaginatedHttpChain(
            node,
            rest,
            businessId,
            userId,
            previous,
            { workflowId, scheduled: scheduledTriggerContext },
          );
          steps.push(...loop.steps);
          if (loop.error) {
            finalError = loop.error;
          }
          break;
        }
        const r = await this.executeNode(node, businessId, userId, previous, {
          workflowId,
          scheduled: scheduledTriggerContext,
        });
        steps.push(r);
        if (r.error) {
          finalError = r.error;
          break;
        }
        previous = r.result;
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

  private async executePaginatedHttpChain(
    httpNode: FlowNode,
    rest: FlowNode[],
    businessId: string,
    userId: string | null,
    previousBeforeHttp: unknown,
    ctx: { workflowId?: string; scheduled?: boolean },
  ): Promise<{
    steps: { nodeId: string; type: string; result?: unknown; error?: string; logs?: string[] }[];
    error?: string;
  }> {
    const data = (httpNode.data || {}) as Record<string, unknown>;
    const cfg = parseHttpPaginationConfig(data);
    if (!cfg) {
      return { steps: [], error: 'Paginación HTTP: configuración inválida' };
    }
    const steps: { nodeId: string; type: string; result?: unknown; error?: string; logs?: string[] }[] = [];
    let pagesDone = 0;
    let itemsDone = 0;
    let page = cfg.startPage;

    while (pagesDone < cfg.maxPages) {
      const queryParams = applyHttpPaginationQueryParams(
        Array.isArray(data.queryParams) ? (data.queryParams as HttpKvPairInput[]) : [],
        cfg,
        page,
      );
      const oneShot: FlowNode = {
        ...httpNode,
        data: { ...data, queryParams, pagination: { enabled: false } },
      };
      const httpStep = await this.executeNode(oneShot, businessId, userId, previousBeforeHttp, ctx);
      const fullResult =
        httpStep.result && typeof httpStep.result === 'object' && !Array.isArray(httpStep.result)
          ? (httpStep.result as Record<string, unknown>)
          : {};
      const apiBody = fullResult.body;
      const itemCount = httpPaginationItemCount(apiBody, cfg.itemsPath);
      const total = httpPaginationTotal(apiBody, cfg.totalPath);
      const meta = { page, pageSize: cfg.pageSize, itemCount, total };

      if (httpStep.error) {
        steps.push({
          ...httpStep,
          logs: [...(httpStep.logs || []), `Paginación: error en página ${page}`],
        });
        return { steps, error: `Página ${page}: ${httpStep.error}` };
      }

      if (itemCount === 0) {
        steps.push({
          ...httpStep,
          result: slimHttpResultForLog(fullResult, meta),
          logs: [
            ...(httpStep.logs || []),
            pagesDone === 0
              ? `Paginación: página ${page} sin ítems. Nada que procesar.`
              : `Paginación terminada en página ${page} (sin ítems). Páginas escritas: ${pagesDone}. Ítems: ${itemsDone}.`,
          ],
        });
        return { steps };
      }

      const isLastPage = httpPaginationShouldStop({
        page,
        pageSize: cfg.pageSize,
        itemCount,
        total,
      });
      steps.push({
        ...httpStep,
        result: isLastPage ? fullResult : slimHttpResultForLog(fullResult, meta),
        logs: [
          ...(httpStep.logs || []),
          `Página ${page}: ${itemCount} ítem(s)` + (total != null ? ` / total ${total}` : ''),
        ],
      });

      let prev: unknown = fullResult;
      for (const restNode of rest) {
        const r = await this.executeNode(restNode, businessId, userId, prev, ctx);
        steps.push({
          ...r,
          result: isLastPage ? r.result : slimUnknownForLog(r.result),
        });
        if (r.error) {
          return { steps, error: `Página ${page}: ${r.error}` };
        }
        prev = r.result;
      }

      pagesDone += 1;
      itemsDone += itemCount;
      if (isLastPage) {
        steps.push({
          nodeId: httpNode.id,
          type: httpNode.type || 'httpRequest',
          result: { pagination: { done: true, pages: pagesDone, items: itemsDone, total, lastPage: page } },
          logs: [
            `Paginación completa: ${pagesDone} página(s), ${itemsDone} ítem(s). Code y data_bridge se ejecutaron por página.`,
          ],
        });
        return { steps };
      }
      page += 1;
    }

    return {
      steps,
      error: `Paginación: se alcanzó el máximo de ${cfg.maxPages} páginas (${itemsDone} ítems). Sube maxPages o revisa el corte.`,
    };
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
        const { usedConnection: _u, ...result } = rows as {
          usedConnection?: unknown;
          rows: unknown;
          truncated?: boolean;
          total?: number;
        };
        const logs: string[] = [];
        if (result.truncated && typeof result.total === 'number') {
          logs.push(
            `MSSQL devolvió ${result.total} fila(s); se procesaron ${(result.rows as unknown[]).length} (límite ${MAX_RESULT_ROWS}).`,
          );
        }
        return { nodeId: node.id, type: t, result, ...(logs.length > 0 ? { logs } : {}) };
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
      const connectorId = (data.connectorId as string) || '';
      if (!connectorId) {
        return { nodeId: node.id, type: t, error: 'Nodo HTTP: falta connectorId (elige un conector)' };
      }
      const method = String(data.method || 'GET').toUpperCase();
      const path = typeof data.path === 'string' ? data.path : '';
      try {
        const result = await this.executeHttpRestNodeRequest(userId, businessId, connectorId, {
          method,
          path,
          queryParams: Array.isArray(data.queryParams) ? (data.queryParams as HttpKvPairInput[]) : [],
          headers: Array.isArray(data.headers) ? (data.headers as HttpKvPairInput[]) : [],
          bodyMode: data.bodyMode as HttpRestBodyMode | undefined,
          bodyParams: Array.isArray(data.bodyParams) ? (data.bodyParams as HttpKvPairInput[]) : [],
          bodyJson: data.bodyJson,
        });
        return { nodeId: node.id, type: t, result };
      } catch (e: unknown) {
        return { nodeId: node.id, type: t, error: this.nodeErrorMessage(e) };
      }
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

  private asPlainObject(row: unknown): Record<string, unknown> | null {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
    return row as Record<string, unknown>;
  }

  private firstStringValue(row: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = row[key];
      if (value === null || value === undefined) continue;
      const s = String(value).trim();
      if (s !== '') return s;
    }
    return null;
  }

  private numericValue(row: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
      const value = row[key];
      if (value === null || value === undefined || value === '') continue;
      if (typeof value === 'number') return Number.isFinite(value) ? value : null;
      const normalized = String(value).replace(/[$,\s]/g, '').trim();
      if (!normalized) continue;
      const n = Number(normalized);
      if (Number.isFinite(n)) return n;
    }
    return null;
  }

  private sourceRowNumber(row: Record<string, unknown>, fallback: number): number {
    const n = Number(row.source_row_number ?? row.sourceRowNumber ?? fallback);
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : fallback;
  }

  private throwDataBridgeTestExportDbError(error: any): never {
    if (error?.code === '42P01') {
      throw new BadRequestException(
        'Faltan tablas de data_bridge para subir/merge. Ejecuta database/migrations/migration_data_bridge_prueba_export_tables.sql en la base conectada al backend.',
      );
    }
    if (error?.code === '42703') {
      throw new BadRequestException(
        `Las columnas de data_bridge no coinciden con el flujo esperado. Revisa la migracion de prueba. Detalle: ${error?.message || 'columna no encontrada'}`,
      );
    }
    if (error?.code === '28P01') {
      throw new BadRequestException(
        'La conexion PostgreSQL del backend fallo por autenticacion. Revisa DATABASE_URL/SUPABASE_DB_URL en el servidor API.',
      );
    }
    if (error?.code === '23503') {
      throw new BadRequestException(
        'La sucursal seleccionada no existe en core.businesses para insertar staging. Revisa el business_id seleccionado.',
      );
    }
    if (error?.code === '23502') {
      throw new BadRequestException(
        `Falta un valor requerido para guardar staging. Detalle: ${error?.message || 'valor requerido nulo'}`,
      );
    }
    if (error?.code === '22P02') {
      throw new BadRequestException(
        `Un valor no tiene el formato esperado para PostgreSQL. Detalle: ${error?.message || 'formato invalido'}`,
      );
    }
    if (error?.code === '42501') {
      throw new BadRequestException(
        'La conexion actual no tiene permisos sobre las tablas data_bridge. Revisa los GRANT de la migracion.',
      );
    }
    if (error?.code === '3F000') {
      throw new BadRequestException(
        'Falta el schema data_bridge en la base conectada al backend. Ejecuta la migracion de tablas de prueba.',
      );
    }
    if (error?.code === 'P0001') {
      throw new BadRequestException(error?.message || 'El script de publicacion a tienda fallo');
    }
    throw error;
  }

  private resolveAldenSateliteStorePublishScriptPath(): string {
    const candidates = [
      path.resolve(process.cwd(), 'scripts', ALDEN_SATELITE_STORE_PUBLISH_SCRIPT),
      path.resolve(process.cwd(), '..', '..', 'scripts', ALDEN_SATELITE_STORE_PUBLISH_SCRIPT),
      path.resolve(process.cwd(), '..', 'scripts', ALDEN_SATELITE_STORE_PUBLISH_SCRIPT),
      path.resolve(__dirname, '..', '..', '..', '..', '..', 'scripts', ALDEN_SATELITE_STORE_PUBLISH_SCRIPT),
    ];
    const found = candidates.find((candidate) => existsSync(candidate));
    if (!found) {
      throw new BadRequestException(
        `No se encontro el script ${ALDEN_SATELITE_STORE_PUBLISH_SCRIPT} para publicar en tienda.`,
      );
    }
    return found;
  }

  async uploadDataBridgeTestExportRows(
    userId: string,
    businessId: string,
    dto: UploadDataBridgeTestExportDto,
  ) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');

    const batchSize = DATA_BRIDGE_TEST_EXPORT_BATCH_SIZE[dto.tableName];
    if (!batchSize) throw new BadRequestException('Tabla staging no permitida');
    if (dto.rows.length > batchSize) {
      throw new BadRequestException(`Demasiadas filas para ${dto.tableName}; maximo ${batchSize} por lote`);
    }

    const importBatchId = dto.importBatchId || randomUUID();
    let cleared = 0;
    if (dto.clearExisting === true) {
      try {
        const deleted = await dbPool.query(`DELETE FROM data_bridge.${dto.tableName} WHERE business_id = $1`, [businessId]);
        cleared = deleted.rowCount ?? 0;
      } catch (e: any) {
        this.throwDataBridgeTestExportDbError(e);
      }
    }

    const sampleErrors: string[] = [];
    const values: unknown[] = [];
    const placeholders: string[] = [];
    let failed = 0;

    const addError = (message: string) => {
      failed += 1;
      if (sampleErrors.length < 10) sampleErrors.push(message);
    };

    dto.rows.forEach((rawRow, index) => {
      const row = this.asPlainObject(rawRow);
      if (!row) {
        addError(`Fila ${index + 1}: no es un objeto valido`);
        return;
      }

      if (dto.tableName === 'prueba_inventory_export') {
        const noParte = this.firstStringValue(row, ['no_parte', 'No. Parte', 'No Parte', 'NoParte']);
        if (!noParte) {
          addError(`Fila ${this.sourceRowNumber(row, index + 1)}: falta No. Parte`);
          return;
        }
        const descripcion = this.firstStringValue(row, ['descripcion', 'DescripciÃ³n', 'Descripcion', 'Descripción']);
        const ubica = this.firstStringValue(row, ['ubica', 'Ubica']);
        const exist = this.numericValue(row, ['exist', 'Exist']);
        const p = values.length;
        placeholders.push(`($${p + 1}, $${p + 2}, $${p + 3}, $${p + 4}, $${p + 5}, $${p + 6}, $${p + 7}, $${p + 8})`);
        values.push(
          businessId,
          noParte,
          descripcion,
          ubica,
          exist,
          dto.sourceFileName,
          this.sourceRowNumber(row, index + 1),
          importBatchId,
        );
        return;
      }

      const adjstclaim = this.firstStringValue(row, ['ADJSTCLAIM', 'adjstclaim']);
      if (!adjstclaim) {
        addError(`Fila ${this.sourceRowNumber(row, index + 1)}: falta ADJSTCLAIM`);
        return;
      }
      const adjstmnt = this.firstStringValue(row, ['ADJSTMNT', 'adjstmnt']);
      const warr = this.firstStringValue(row, ['WARR.', 'warr', 'WARR']);
      const claim = this.numericValue(row, ['CLAIM', 'claim']);
      const p = values.length;
      placeholders.push(`($${p + 1}, $${p + 2}, $${p + 3}, $${p + 4}, $${p + 5}, $${p + 6}, $${p + 7}, $${p + 8})`);
      values.push(
        businessId,
        adjstclaim,
        adjstmnt,
        warr,
        claim,
        dto.sourceFileName,
        this.sourceRowNumber(row, index + 1),
        importBatchId,
      );
    });

    if (placeholders.length === 0) {
      return {
        tableName: dto.tableName,
        importBatchId,
        inserted: 0,
        failed,
        cleared,
        sampleErrors,
      };
    }

    const sql =
      dto.tableName === 'prueba_inventory_export'
        ? `INSERT INTO data_bridge.prueba_inventory_export
             (business_id, "No. Parte", "Descripción", "Ubica", "Exist", source_file_name, source_row_number, import_batch_id)
           VALUES ${placeholders.join(', ')}`
        : `INSERT INTO data_bridge.prueba_mex_insurance_prices_export
             (business_id, "ADJSTCLAIM", "ADJSTMNT", "WARR.", "CLAIM", source_file_name, source_row_number, import_batch_id)
           VALUES ${placeholders.join(', ')}`;

    let inserted;
    try {
      inserted = await dbPool.query(sql, values);
    } catch (e: any) {
      this.throwDataBridgeTestExportDbError(e);
    }
    return {
      tableName: dto.tableName,
      importBatchId,
      inserted: inserted?.rowCount ?? 0,
      failed,
      cleared,
      sampleErrors,
    };
  }

  async mergeDataBridgeTestExports(userId: string, businessId: string, dto: MergeDataBridgeTestExportsDto) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');

    const mergeBatchId = dto.mergeBatchId || randomUUID();
    let expected;
    try {
      expected = await dbPool.query(
        `WITH inv AS (
         SELECT DISTINCT NULLIF(REGEXP_REPLACE(UPPER(BTRIM("No. Parte")), '[^A-Z0-9]+', '', 'g'), '') AS sku
         FROM data_bridge.prueba_inventory_export
         WHERE business_id = $1 AND COALESCE("Exist", 0) > 0
       ),
       prices AS (
         SELECT DISTINCT NULLIF(REGEXP_REPLACE(UPPER(BTRIM("ADJSTCLAIM")), '[^A-Z0-9]+', '', 'g'), '') AS sku
         FROM data_bridge.prueba_mex_insurance_prices_export
         WHERE business_id = $1 AND COALESCE("CLAIM", 0) > 0
       )
       SELECT COUNT(*)::int AS count
       FROM inv
       INNER JOIN prices USING (sku)
       WHERE inv.sku IS NOT NULL`,
        [businessId],
      );
    } catch (e: any) {
      this.throwDataBridgeTestExportDbError(e);
    }
    const expectedRows = Number(expected.rows[0]?.count ?? 0);

    let cleared = 0;
    if (dto.clearExisting !== false) {
      try {
        const deleted = await dbPool.query(
          `DELETE FROM data_bridge.prueba_inventory_prices_merged_export WHERE business_id = $1`,
          [businessId],
        );
        cleared = deleted.rowCount ?? 0;
      } catch (e: any) {
        this.throwDataBridgeTestExportDbError(e);
      }
    }

    let inserted = 0;
    let failedBatches = 0;
    const sampleErrors: string[] = [];
    const batches = expectedRows === 0 ? 0 : Math.ceil(expectedRows / DATA_BRIDGE_TEST_EXPORT_MERGE_BATCH_SIZE);

    for (let batch = 0; batch < batches; batch += 1) {
      const start = batch * DATA_BRIDGE_TEST_EXPORT_MERGE_BATCH_SIZE + 1;
      const end = (batch + 1) * DATA_BRIDGE_TEST_EXPORT_MERGE_BATCH_SIZE;
      try {
        const result = await dbPool.query(
          `WITH inv_raw AS (
             SELECT
               NULLIF(REGEXP_REPLACE(UPPER(BTRIM("No. Parte")), '[^A-Z0-9]+', '', 'g'), '') AS sku,
               "Descripción" AS descripcion,
               NULLIF(REGEXP_REPLACE(BTRIM(COALESCE("Ubica", '')), '^[^[:alnum:]]+', ''), '') AS ubicacion,
               "Exist" AS existencias,
               source_row_number
             FROM data_bridge.prueba_inventory_export
             WHERE business_id = $1 AND COALESCE("Exist", 0) > 0
           ),
           inv AS (
             SELECT DISTINCT ON (sku) sku, descripcion, ubicacion, existencias
             FROM inv_raw
             WHERE sku IS NOT NULL
             ORDER BY sku, source_row_number
           ),
           prices_raw AS (
             SELECT
               NULLIF(REGEXP_REPLACE(UPPER(BTRIM("ADJSTCLAIM")), '[^A-Z0-9]+', '', 'g'), '') AS sku,
               NULLIF(BTRIM(CONCAT_WS(' ', NULLIF("ADJSTMNT", ''), NULLIF("WARR.", ''))), '') AS nombres,
               "CLAIM" AS price,
               source_row_number
             FROM data_bridge.prueba_mex_insurance_prices_export
             WHERE business_id = $1 AND COALESCE("CLAIM", 0) > 0
           ),
           prices AS (
             SELECT DISTINCT ON (sku) sku, nombres, price
             FROM prices_raw
             WHERE sku IS NOT NULL
             ORDER BY sku, source_row_number
           ),
           matched AS (
             SELECT
               inv.sku,
               inv.descripcion,
               inv.ubicacion,
               inv.existencias,
               prices.nombres,
               prices.price,
               ROW_NUMBER() OVER (ORDER BY inv.sku) AS rn
             FROM inv
             INNER JOIN prices USING (sku)
           )
           INSERT INTO data_bridge.prueba_inventory_prices_merged_export
             (business_id, sku, descripcion, ubicacion, existencias, nombres, price, merge_batch_id)
           SELECT $1, sku, descripcion, ubicacion, existencias, nombres, price, $2
           FROM matched
           WHERE rn BETWEEN $3 AND $4
           ON CONFLICT (business_id, sku) DO UPDATE SET
             descripcion = EXCLUDED.descripcion,
             ubicacion = EXCLUDED.ubicacion,
             existencias = EXCLUDED.existencias,
             nombres = EXCLUDED.nombres,
             price = EXCLUDED.price,
             merge_batch_id = EXCLUDED.merge_batch_id,
             updated_at = CURRENT_TIMESTAMP`,
          [businessId, mergeBatchId, start, end],
        );
        inserted += result.rowCount ?? 0;
      } catch (e: any) {
        if (['42P01', '42703', '28P01', '23503'].includes(String(e?.code || ''))) {
          this.throwDataBridgeTestExportDbError(e);
        }
        failedBatches += 1;
        if (sampleErrors.length < 10) sampleErrors.push(e?.message || `Lote ${batch + 1} fallido`);
      }
    }

    return {
      tableName: 'prueba_inventory_prices_merged_export',
      mergeBatchId,
      inserted,
      expectedRows,
      batches,
      batchSize: DATA_BRIDGE_TEST_EXPORT_MERGE_BATCH_SIZE,
      cleared,
      failedBatches,
      sampleErrors,
    };
  }

  async publishDataBridgeTestExports(userId: string, businessId: string) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');

    let source;
    try {
      source = await dbPool.query(
        `SELECT COUNT(*)::int AS count
       FROM data_bridge.prueba_inventory_prices_merged_export
       WHERE business_id = $1
         AND COALESCE(existencias, 0) > 0
         AND COALESCE(price, 0) > 0`,
        [businessId],
      );
    } catch (e: any) {
      this.throwDataBridgeTestExportDbError(e);
    }
    const sourceRows = Number(source.rows[0]?.count ?? 0);

    let updateResult;
    try {
      updateResult = await dbPool.query(
        `WITH source_raw AS (
         SELECT
           NULLIF(REGEXP_REPLACE(UPPER(BTRIM(sku)), '[^A-Z0-9]+', '', 'g'), '') AS normalized_sku,
           sku,
           descripcion,
           ubicacion,
           existencias,
           price,
           updated_at
         FROM data_bridge.prueba_inventory_prices_merged_export
         WHERE business_id = $1
           AND COALESCE(existencias, 0) > 0
           AND COALESCE(price, 0) > 0
       ),
       source_deduped AS (
         SELECT DISTINCT ON (normalized_sku)
           normalized_sku,
           sku,
           descripcion,
           ubicacion,
           existencias,
           price
         FROM source_raw
         WHERE normalized_sku IS NOT NULL
         ORDER BY normalized_sku, updated_at DESC
       )
       UPDATE data_bridge.integration_alden_satelite target
       SET
         localizacion = source_deduped.ubicacion,
         descripcion = source_deduped.descripcion,
         price = source_deduped.price,
         inventario = GREATEST(0, ROUND(source_deduped.existencias)::int)
       FROM source_deduped
       WHERE NULLIF(REGEXP_REPLACE(UPPER(BTRIM(target.product)), '[^A-Z0-9]+', '', 'g'), '') = source_deduped.normalized_sku`,
        [businessId],
      );
    } catch (e: any) {
      this.throwDataBridgeTestExportDbError(e);
    }

    let insertResult;
    try {
      insertResult = await dbPool.query(
        `WITH source_raw AS (
         SELECT
           NULLIF(REGEXP_REPLACE(UPPER(BTRIM(sku)), '[^A-Z0-9]+', '', 'g'), '') AS normalized_sku,
           sku,
           descripcion,
           ubicacion,
           existencias,
           price,
           updated_at
         FROM data_bridge.prueba_inventory_prices_merged_export
         WHERE business_id = $1
           AND COALESCE(existencias, 0) > 0
           AND COALESCE(price, 0) > 0
       ),
       source_deduped AS (
         SELECT DISTINCT ON (normalized_sku)
           normalized_sku,
           sku,
           descripcion,
           ubicacion,
           existencias,
           price
         FROM source_raw
         WHERE normalized_sku IS NOT NULL
         ORDER BY normalized_sku, updated_at DESC
       )
       INSERT INTO data_bridge.integration_alden_satelite
         (product, localizacion, descripcion, price, inventario)
       SELECT
         source_deduped.sku,
         source_deduped.ubicacion,
         source_deduped.descripcion,
         source_deduped.price,
         GREATEST(0, ROUND(source_deduped.existencias)::int)
       FROM source_deduped
       WHERE NOT EXISTS (
         SELECT 1
         FROM data_bridge.integration_alden_satelite target
         WHERE NULLIF(REGEXP_REPLACE(UPPER(BTRIM(target.product)), '[^A-Z0-9]+', '', 'g'), '') = source_deduped.normalized_sku
       )`,
        [businessId],
      );
    } catch (e: any) {
      this.throwDataBridgeTestExportDbError(e);
    }

    const updated = updateResult?.rowCount ?? 0;
    const inserted = insertResult?.rowCount ?? 0;
    return {
      tableName: 'integration_alden_satelite',
      sourceRows,
      updated,
      inserted,
      published: updated + inserted,
    };
  }

  async publishAldenSateliteToStore(userId: string, businessId: string) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');

    const scriptPath = this.resolveAldenSateliteStorePublishScriptPath();
    const sql = readFileSync(scriptPath, 'utf8');
    const client = await dbPool.connect();
    try {
      const result = await client.query(sql);
      const results = Array.isArray(result) ? result : [result];
      const summary = results
        .flatMap((r: any) => (Array.isArray(r?.rows) ? r.rows : []))
        .find((row: Record<string, unknown>) => row && 'source_skus' in row && 'visible_in_store_candidates' in row);

      if (!summary) {
        throw new BadRequestException('El script de publicacion a tienda no devolvio resumen de verificacion.');
      }

      return {
        script: `scripts/${ALDEN_SATELITE_STORE_PUBLISH_SCRIPT}`,
        storeId: summary.store_id,
        storeName: summary.store_name,
        branchId: summary.branch_id,
        branchName: summary.branch_name,
        sourceSkus: Number(summary.source_skus ?? 0),
        matchedExistingProducts: Number(summary.matched_existing_products ?? 0),
        insertedProducts: Number(summary.inserted_products ?? 0),
        visibleInStoreCandidates: Number(summary.visible_in_store_candidates ?? 0),
        stillHiddenDueToZeroPrice: Number(summary.still_hidden_due_to_zero_price ?? 0),
      };
    } catch (e: any) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // The script may already have committed or rolled back.
      }
      this.throwDataBridgeTestExportDbError(e);
    } finally {
      client.release();
    }
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
    const unknownMappingCols: string[] = [];
    if (colMeta.has('business_id')) insertCols.add('business_id');
    if (colMeta.has('workflow_id')) insertCols.add('workflow_id');
    for (const k of Object.keys(fieldMappings)) {
      if (typeof fieldMappings[k] !== 'string' || !fieldMappings[k].trim()) continue;
      if (!colMeta.has(k)) {
        unknownMappingCols.push(k);
        delete fieldMappings[k];
        continue;
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
    if (unknownMappingCols.length > 0) {
      logs.push(
        `Se omitieron mapeos a columnas que no existen en ${tableName}: ${unknownMappingCols.join(', ')}.`,
      );
    }

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

  // --- HTTP / REST connectors ---

  private assertHttpRestConfig(config: Record<string, unknown>) {
    const baseUrl = String(config.baseUrl || '').trim();
    const authHeaderName = String(config.authHeaderName || '').trim();
    if (!baseUrl) {
      throw new BadRequestException('Indica la URL base del API (baseUrl)');
    }
    try {
      const u = new URL(baseUrl);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        throw new Error('protocol');
      }
    } catch {
      throw new BadRequestException('baseUrl debe ser una URL http(s) válida');
    }
    if (!authHeaderName) {
      throw new BadRequestException('Indica el nombre del header de autenticación (authHeaderName)');
    }
    const method = String(config.healthMethod || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      throw new BadRequestException('healthMethod debe ser GET o HEAD');
    }
  }

  private buildHttpHealthUrl(baseUrl: string, healthPath?: string | null): string {
    const base = baseUrl.trim().replace(/\/+$/, '');
    const path = (healthPath || '').trim();
    if (!path) return base;
    if (/^https?:\/\//i.test(path)) return path;
    return `${base}/${path.replace(/^\/+/, '')}`;
  }

  private httpRestPublicView(args: {
    connectorId?: string;
    baseUrl: string;
    authHeaderName: string;
    healthPath?: string;
    healthMethod?: string;
    healthUrl?: string;
  }) {
    return {
      connectorId: args.connectorId,
      baseUrl: args.baseUrl,
      authHeaderName: args.authHeaderName,
      healthPath: args.healthPath || '',
      healthMethod: (args.healthMethod || 'GET').toUpperCase(),
      healthUrl: args.healthUrl || this.buildHttpHealthUrl(args.baseUrl, args.healthPath),
    };
  }

  /**
   * Health check: GET/HEAD a baseUrl[+healthPath] con el header de API key.
   * Éxito: 2xx o 404 (API alcanzada; 404 suele ser path sin recurso).
   * Fallo: 401/403 (auth), 5xx o error de red.
   */
  async probeHttpRestConnection(
    conf: {
      baseUrl: string;
      authHeaderName: string;
      healthPath?: string;
      healthMethod?: 'GET' | 'HEAD';
    },
    apiKey: string,
    meta?: { connectorId?: string },
  ): Promise<
    | {
        success: true;
        statusCode: number;
        usedConnection: ReturnType<IntegrationWorkflowsService['httpRestPublicView']>;
      }
    | {
        success: false;
        message: string;
        statusCode?: number;
        usedConnection: ReturnType<IntegrationWorkflowsService['httpRestPublicView']>;
      }
  > {
    const baseUrl = String(conf.baseUrl || '').trim();
    const authHeaderName = String(conf.authHeaderName || '').trim();
    const healthPath = conf.healthPath != null ? String(conf.healthPath) : '';
    const healthMethod = (conf.healthMethod || 'GET').toUpperCase() as 'GET' | 'HEAD';
    const healthUrl = this.buildHttpHealthUrl(baseUrl, healthPath);
    const usedConnection = this.httpRestPublicView({
      connectorId: meta?.connectorId,
      baseUrl,
      authHeaderName,
      healthPath,
      healthMethod,
      healthUrl,
    });

    if (!apiKey) {
      return { success: false, message: 'Indica la API key para probar la conexión', usedConnection };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(healthUrl, {
        method: healthMethod,
        headers: {
          [authHeaderName]: apiKey,
          Accept: 'application/json, text/plain, */*',
        },
        signal: controller.signal,
        redirect: 'follow',
      });
      const statusCode = res.status;
      if (statusCode === 401 || statusCode === 403) {
        return {
          success: false,
          message: `Autenticación rechazada (HTTP ${statusCode}). Revisa el header y la API key.`,
          statusCode,
          usedConnection,
        };
      }
      if (statusCode >= 500) {
        return {
          success: false,
          message: `El API respondió con error de servidor (HTTP ${statusCode}).`,
          statusCode,
          usedConnection,
        };
      }
      // 2xx, 3xx, 404 → conexión + auth OK para health
      if (statusCode >= 200 && statusCode < 500) {
        return { success: true, statusCode, usedConnection };
      }
      return {
        success: false,
        message: `Respuesta inesperada (HTTP ${statusCode}).`,
        statusCode,
        usedConnection,
      };
    } catch (e: any) {
      const aborted = e?.name === 'AbortError';
      return {
        success: false,
        message: aborted
          ? 'Tiempo de espera agotado al contactar el API (15s).'
          : e?.message || 'No se pudo alcanzar el API (red / DNS / TLS).',
        usedConnection,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async testHttpRestWithPayload(
    userId: string,
    businessId: string,
    payload: {
      baseUrl: string;
      authHeaderName: string;
      apiKey: string;
      healthPath?: string;
      healthMethod?: 'GET' | 'HEAD';
    },
  ) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    this.assertHttpRestConfig({
      baseUrl: payload.baseUrl,
      authHeaderName: payload.authHeaderName,
      healthPath: payload.healthPath || '',
      healthMethod: payload.healthMethod || 'GET',
    });
    return this.probeHttpRestConnection(
      {
        baseUrl: payload.baseUrl,
        authHeaderName: payload.authHeaderName,
        healthPath: payload.healthPath,
        healthMethod: payload.healthMethod,
      },
      payload.apiKey,
    );
  }

  async testHttpRestForConnector(
    userId: string,
    businessId: string,
    connectorId: string,
    override: {
      baseUrl?: string;
      authHeaderName?: string;
      apiKey?: string;
      healthPath?: string;
      healthMethod?: 'GET' | 'HEAD';
    } = {},
  ) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');

    const { rows } = await dbPool.query(
      `SELECT password_ciphertext, config, connector_type_id, is_enabled
       FROM integration.connectors
       WHERE id = $1 AND business_id = $2`,
      [connectorId, businessId],
    );
    if (rows.length === 0) throw new NotFoundException('Conector no encontrado');
    const row = rows[0] as {
      password_ciphertext: string | null;
      config: Record<string, unknown>;
      connector_type_id: string;
      is_enabled: boolean;
    };
    if (row.connector_type_id !== 'http_rest') {
      throw new BadRequestException('Este endpoint solo aplica a conectores HTTP / REST');
    }

    const conf = { ...(row.config || {}) };
    if (override.baseUrl != null) conf.baseUrl = override.baseUrl;
    if (override.authHeaderName != null) conf.authHeaderName = override.authHeaderName;
    if (override.healthPath != null) conf.healthPath = override.healthPath;
    if (override.healthMethod != null) conf.healthMethod = override.healthMethod;

    this.assertHttpRestConfig(conf);

    let apiKey = override.apiKey || '';
    if (!apiKey) {
      if (!row.password_ciphertext) {
        return {
          success: false as const,
          message: 'No hay API key guardada; indícala en el formulario para probar.',
          usedConnection: this.httpRestPublicView({
            connectorId,
            baseUrl: String(conf.baseUrl || ''),
            authHeaderName: String(conf.authHeaderName || ''),
            healthPath: String(conf.healthPath || ''),
            healthMethod: String(conf.healthMethod || 'GET'),
          }),
        };
      }
      try {
        apiKey = decryptSecret(row.password_ciphertext);
      } catch {
        return {
          success: false as const,
          message: 'No se pudo descifrar el secreto del conector. Verifique WORKFLOW_CONNECTOR_ENCRYPTION_KEY.',
          usedConnection: this.httpRestPublicView({
            connectorId,
            baseUrl: String(conf.baseUrl || ''),
            authHeaderName: String(conf.authHeaderName || ''),
            healthPath: String(conf.healthPath || ''),
            healthMethod: String(conf.healthMethod || 'GET'),
          }),
        };
      }
    }

    return this.probeHttpRestConnection(
      {
        baseUrl: String(conf.baseUrl || ''),
        authHeaderName: String(conf.authHeaderName || ''),
        healthPath: conf.healthPath != null ? String(conf.healthPath) : '',
        healthMethod: (String(conf.healthMethod || 'GET').toUpperCase() as 'GET' | 'HEAD') || 'GET',
      },
      apiKey,
      { connectorId },
    );
  }

  /**
   * Ejecuta una petición HTTP usando un conector http_rest (nodo de workflow).
   * Inyecta el header de API key; path relativo se concatena a baseUrl.
   * Query params, headers extra y body (POST) se toman del nodo / preview.
   */
  async executeHttpRestNodeRequest(
    userId: string | null,
    businessId: string,
    connectorId: string,
    opts: HttpRestNodeRequestOpts,
  ) {
    if (userId) {
      await this.assertUserHasBusinessAccess(userId, businessId);
    }
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');

    const { rows } = await dbPool.query(
      `SELECT password_ciphertext, config, connector_type_id, is_enabled, name
       FROM integration.connectors
       WHERE id = $1 AND business_id = $2`,
      [connectorId, businessId],
    );
    if (rows.length === 0) throw new NotFoundException('Conector no encontrado');
    const row = rows[0] as {
      password_ciphertext: string | null;
      config: Record<string, unknown>;
      connector_type_id: string;
      is_enabled: boolean;
      name: string;
    };
    if (row.connector_type_id !== 'http_rest') {
      throw new BadRequestException('El nodo HTTP requiere un conector http_rest');
    }
    if (!row.is_enabled) throw new BadRequestException('Conector desactivado');
    if (!row.password_ciphertext) {
      throw new BadRequestException('El conector no tiene API key configurada');
    }

    this.assertHttpRestConfig(row.config || {});
    let apiKey: string;
    try {
      apiKey = decryptSecret(row.password_ciphertext);
    } catch {
      throw new BadRequestException('No se pudo descifrar el secreto del conector');
    }

    const baseUrl = String(row.config.baseUrl || '').trim();
    const authHeaderName = String(row.config.authHeaderName || '').trim();
    const method = String(opts.method || 'GET').toUpperCase();
    const allowed = new Set(['GET', 'POST']);
    if (!allowed.has(method)) {
      throw new BadRequestException('Método HTTP no permitido. Usa GET o POST.');
    }
    const url = this.buildHttpRequestUrl(baseUrl, opts.path || '', opts.queryParams);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const headers: Record<string, string> = {
        Accept: 'application/json, text/plain, */*',
      };
      this.mergeHttpExtraHeaders(headers, opts.headers, authHeaderName);
      headers[authHeaderName] = apiKey;

      const init: RequestInit = {
        method,
        headers,
        signal: controller.signal,
        redirect: 'follow',
      };

      if (method === 'POST') {
        const body = this.buildHttpRequestBody(opts);
        if (body) {
          if (body.contentType && !this.hasHeader(headers, 'content-type')) {
            headers['Content-Type'] = body.contentType;
          }
          init.body = body.payload;
        }
      }

      const res = await fetch(url, init);
      const statusCode = res.status;
      const contentType = res.headers.get('content-type') || '';
      const text = await res.text();
      let body: unknown = text;
      if (contentType.includes('application/json') && text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }

      if (statusCode === 401 || statusCode === 403) {
        throw new BadRequestException(
          `HTTP ${statusCode}: autenticación rechazada. Revisa la API key del conector.`,
        );
      }
      if (statusCode >= 400) {
        const snippet =
          typeof body === 'string'
            ? body.slice(0, 300)
            : JSON.stringify(body).slice(0, 300);
        throw new BadRequestException(`HTTP ${statusCode} en ${url}: ${snippet || res.statusText}`);
      }

      return {
        statusCode,
        url,
        method,
        connectorName: row.name,
        body,
      };
    } catch (e: any) {
      if (e instanceof BadRequestException || e instanceof NotFoundException) throw e;
      if (e?.name === 'AbortError') {
        throw new BadRequestException('Tiempo de espera agotado al llamar el API (30s)');
      }
      throw new BadRequestException(e?.message || 'Error de red al llamar el API');
    } finally {
      clearTimeout(timeout);
    }
  }

  private enabledHttpKvPairs(rows?: HttpKvPairInput[] | null): Array<{ key: string; value: string }> {
    if (!Array.isArray(rows)) return [];
    if (rows.length > 50) {
      throw new BadRequestException('Máximo 50 pares clave/valor');
    }
    const out: Array<{ key: string; value: string }> = [];
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      if (row.enabled === false) continue;
      const key = String(row.key ?? '').trim();
      if (!key) continue;
      if (key.length > 256) {
        throw new BadRequestException(`Clave demasiado larga: ${key.slice(0, 40)}…`);
      }
      out.push({ key, value: String(row.value ?? '') });
    }
    return out;
  }

  private buildHttpRequestUrl(
    baseUrl: string,
    path: string,
    queryParams?: HttpKvPairInput[] | null,
  ): string {
    const joined = this.buildHttpHealthUrl(baseUrl, path);
    let parsed: URL;
    try {
      parsed = new URL(joined);
    } catch {
      throw new BadRequestException('URL de la petición no es válida');
    }
    const table = this.enabledHttpKvPairs(queryParams);
    if (table.length > 0) {
      parsed.search = '';
      for (const { key, value } of table) {
        parsed.searchParams.append(key, value);
      }
    }
    return parsed.toString();
  }

  private hasHeader(headers: Record<string, string>, name: string): boolean {
    const n = name.toLowerCase();
    return Object.keys(headers).some((k) => k.toLowerCase() === n);
  }

  private mergeHttpExtraHeaders(
    headers: Record<string, string>,
    extra?: HttpKvPairInput[] | null,
    authHeaderName?: string,
  ) {
    const blocked = new Set([
      'host',
      'content-length',
      'transfer-encoding',
      'connection',
      'cookie',
    ]);
    const auth = (authHeaderName || '').trim().toLowerCase();
    for (const { key, value } of this.enabledHttpKvPairs(extra)) {
      const lower = key.toLowerCase();
      if (blocked.has(lower)) continue;
      if (auth && lower === auth) continue;
      headers[key] = value;
    }
  }

  private buildHttpRequestBody(
    opts: HttpRestNodeRequestOpts,
  ): { payload: string; contentType: string } | null {
    const mode = opts.bodyMode || 'none';
    if (mode === 'none' || !mode) return null;
    if (mode === 'urlencoded') {
      const params = new URLSearchParams();
      for (const { key, value } of this.enabledHttpKvPairs(opts.bodyParams)) {
        params.append(key, value);
      }
      return {
        payload: params.toString(),
        contentType: 'application/x-www-form-urlencoded',
      };
    }
    if (mode === 'json') {
      const raw = opts.bodyJson;
      if (raw == null || raw === '') return null;
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) return null;
        if (trimmed.length > 262144) {
          throw new BadRequestException('El JSON del body supera el límite (256 KB)');
        }
        try {
          JSON.parse(trimmed);
        } catch {
          throw new BadRequestException('El body JSON no es válido');
        }
        return { payload: trimmed, contentType: 'application/json' };
      }
      if (typeof raw === 'object') {
        return { payload: JSON.stringify(raw), contentType: 'application/json' };
      }
      throw new BadRequestException('bodyJson debe ser un objeto o un string JSON');
    }
    throw new BadRequestException('bodyMode debe ser none, urlencoded o json');
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
