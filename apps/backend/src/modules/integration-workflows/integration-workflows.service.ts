import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { dbPool } from '../../config/database.config';
import { User } from '@supabase/supabase-js';
import * as sql from 'mssql';
import { CreateConnectorDto } from './dto/create-connector.dto';
import { UpdateConnectorDto } from './dto/update-connector.dto';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { encryptSecret, decryptSecret } from './connector-crypto.util';
import { getLinearExecutionOrder, FlowDefinition, FlowNode } from './workflow-executor.util';

const MAX_RESULT_ROWS = 1000;
const MS_TIMEOUT_MS = 30000;

@Injectable()
export class IntegrationWorkflowsService {
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

  async getConnector(userId: string, businessId: string, id: string) {
    await this.assertUserHasBusinessAccess(userId, businessId);
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
    if (!wf.isEnabled) {
      throw new BadRequestException('El flujo está desactivado');
    }
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');

    const { rows: runInsert } = await dbPool.query(
      `INSERT INTO integration.workflow_runs (workflow_id, status, trigger_type, started_at)
       VALUES ($1, 'running', 'manual', CURRENT_TIMESTAMP)
       RETURNING id`,
      [workflowId],
    );
    const runId = (runInsert[0] as { id: string }).id;

    const steps: { nodeId: string; type: string; result?: unknown; error?: string }[] = [];
    let finalError: string | null = null;
    const hasInlineDef =
      options?.definition &&
      typeof options.definition === 'object' &&
      options.definition !== null &&
      'nodes' in options.definition;
    const def = (
      hasInlineDef ? (options?.definition as FlowDefinition) : (wf.definition || {})
    ) as FlowDefinition;
    const definitionSource = hasInlineDef ? 'inline' : 'stored';

    try {
      const order = getLinearExecutionOrder(def);
      for (const node of order) {
        const r = await this.executeNode(node, businessId, userId, steps[steps.length - 1]?.result);
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
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');
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
    userId: string,
    _previous: unknown,
  ): Promise<{ nodeId: string; type: string; result?: unknown; error?: string }> {
    const t = node.type;
    const data = (node.data || {}) as Record<string, unknown>;
    if (t === 'triggerManual' || t === 'triggerSchedule') {
      return { nodeId: node.id, type: t, result: { message: t === 'triggerSchedule' ? 'Disparo manual (programación interna aún no ejecuta cron)' : 'ok' } };
    }
    if (t === 'sinkLog') {
      return {
        nodeId: node.id,
        type: t,
        result: { previous: _previous, note: 'Salida interna; futura ingesta a staging' },
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
        return { nodeId: node.id, type: t, result: rows };
      } catch (e: any) {
        return { nodeId: node.id, type: t, error: e?.message || 'Error en consulta MSSQL' };
      }
    }
    if (t === 'code') {
      return { nodeId: node.id, type: t, result: { message: 'Code: implementación pendiente' } };
    }
    if (t === 'httpRequest' || t === 'httpPlaceholder') {
      return { nodeId: node.id, type: t, result: { message: 'HTTP request: implementación pendiente' } };
    }
    return { nodeId: node.id, type: t, error: `Tipo de nodo no soportado aún: ${t}` };
  }

  private async queryMssql(
    userId: string,
    businessId: string,
    connectorId: string,
    queryText: string,
  ) {
    const c = (await this.getConnector(userId, businessId, connectorId)) as any;
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
    if (crows.length === 0) throw new Error('Conector no encontrado');
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
      options?: { encrypt?: boolean; trustServerCertificate?: boolean };
    };
    if (!conf.server || !conf.database || !conf.user) {
      throw new Error('Config de MSSQL incompleta (server, database, user)');
    }

    const config: sql.config = {
      user: conf.user,
      password,
      server: conf.server,
      port: conf.port,
      database: conf.database,
      options: {
        encrypt: conf.options?.encrypt !== false,
        trustServerCertificate: conf.options?.trustServerCertificate === true,
        enableArithAbort: true,
        connectTimeout: MS_TIMEOUT_MS,
        requestTimeout: MS_TIMEOUT_MS,
      } as any,
    };

    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    try {
      const r = await pool.request().query(queryText);
      const data = (r.recordset as unknown[]) || [];
      if (data.length > MAX_RESULT_ROWS) {
        return { rows: data.slice(0, MAX_RESULT_ROWS), truncated: true, total: data.length };
      }
      return { rows: data, truncated: false };
    } finally {
      await pool.close();
    }
  }

  private buildMssqlPoolConfig(
    conf: {
      server: string;
      port?: number;
      database: string;
      user: string;
      options?: { encrypt?: boolean; trustServerCertificate?: boolean };
    },
    password: string,
  ): sql.config {
    return {
      user: conf.user,
      password,
      server: conf.server,
      port: conf.port,
      database: conf.database,
      options: {
        encrypt: conf.options?.encrypt !== false,
        trustServerCertificate: conf.options?.trustServerCertificate === true,
        enableArithAbort: true,
        connectTimeout: MS_TIMEOUT_MS,
        requestTimeout: MS_TIMEOUT_MS,
      } as any,
    };
  }

  /** SELECT 1 para validar host, credenciales y base. */
  async probeMssqlConnection(
    conf: {
      server: string;
      port?: number;
      database: string;
      user: string;
      options?: { encrypt?: boolean; trustServerCertificate?: boolean };
    },
    password: string,
  ): Promise<{ success: true } | { success: false; message: string }> {
    try {
      const config = this.buildMssqlPoolConfig(conf, password);
      const pool = new sql.ConnectionPool(config);
      await pool.connect();
      try {
        await pool.request().query('SELECT 1 AS ok');
      } finally {
        await pool.close();
      }
      return { success: true };
    } catch (e: any) {
      const msg =
        e?.message ||
        e?.originalError?.message ||
        (typeof e === 'string' ? e : 'Error de conexión a SQL Server');
      return { success: false, message: String(msg) };
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
      options?: { encrypt?: boolean; trustServerCertificate?: boolean };
    },
  ) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');
    if (!payload.password) {
      return { success: false, message: 'Indica la contraseña para probar la conexión' };
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
      options?: { encrypt?: boolean; trustServerCertificate?: boolean };
    },
  ) {
    await this.assertUserHasBusinessAccess(userId, businessId);
    if (!dbPool) throw new BadRequestException('Base de datos no configurada');
    const c = await this.getConnector(userId, businessId, connectorId);
    if (c.connectorTypeId !== 'mssql') {
      return { success: false, message: 'Solo se puede probar conexión MSSQL' };
    }
    const base = (c.config || {}) as {
      server?: string;
      port?: number;
      database?: string;
      user?: string;
      options?: { encrypt?: boolean; trustServerCertificate?: boolean };
    };
    const merged = {
      server: (override?.server !== undefined && override?.server !== null ? override.server : base.server) || '',
      port: override?.port !== undefined && override?.port !== null ? override.port : base.port,
      database:
        (override?.database !== undefined && override?.database !== null ? override.database : base.database) || '',
      user: (override?.user !== undefined && override?.user !== null ? override.user : base.user) || '',
      options: override?.options ?? base.options,
    };
    if (!merged.server || !merged.database || !merged.user) {
      return { success: false, message: 'Faltan campos: servidor, base de datos o usuario' };
    }
    let password: string;
    if (override?.password != null && override.password !== '') {
      password = override.password;
    } else {
      if (!c.hasPassword) {
        return { success: false, message: 'No hay contraseña guardada. Indica una en el formulario y prueba otra vez.' };
      }
      const { rows: crows } = await dbPool.query(
        `SELECT password_ciphertext FROM integration.connectors WHERE id = $1 AND business_id = $2`,
        [connectorId, businessId],
      );
      if (crows.length === 0) {
        return { success: false, message: 'Conector no encontrado' };
      }
      try {
        password = decryptSecret((crows[0] as { password_ciphertext: string }).password_ciphertext);
      } catch {
        return { success: false, message: 'No se pudo descifrar el secreto del conector.' };
      }
    }
    return this.probeMssqlConnection(merged, password);
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
    return this.queryMssql(userId, businessId, connectorId, q);
  }
}
