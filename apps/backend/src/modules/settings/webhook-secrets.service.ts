import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { dbPool } from '../../config/database.config';
import { CreateWebhookSecretDto } from './dto/create-webhook-secret.dto';
import { PatchWebhookSecretDto } from './dto/patch-webhook-secret.dto';

export interface WebhookSecretRow {
  id: string;
  name: string;
  secret?: string;
  secret_prefix?: string | null;
  provider: string;
  expires_at: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface WebhookSecretListItem {
  id: string;
  name: string;
  secret_prefix: string | null;
  /** Clave completa; solo se envía en el listado para que el admin pueda ver/copiar (endpoint protegido). */
  secret: string | null;
  provider: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookSecretCreated {
  id: string;
  name: string;
  secret: string;
  expires_at: string | null;
  created_at: string;
}

@Injectable()
export class WebhookSecretsService {
  /**
   * Listar claves (incluye secret para que el admin pueda copiar).
   * Sin `provider`, devuelve todas las claves (karlopay, integration_cart, etc.).
   * Si la columna secret_prefix no existe (migración no ejecutada), se devuelve null para ese campo.
   */
  async list(provider?: string): Promise<WebhookSecretListItem[]> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    const withPrefix = provider
      ? `SELECT id, name, secret, secret_prefix, provider, expires_at, is_active, created_at, updated_at
       FROM core.webhook_secrets
       WHERE LOWER(TRIM(COALESCE(provider, ''))) = LOWER(TRIM(COALESCE($1::text, '')))
       ORDER BY created_at DESC`
      : `SELECT id, name, secret, secret_prefix, provider, expires_at, is_active, created_at, updated_at
       FROM core.webhook_secrets
       ORDER BY created_at DESC`;
    const withoutPrefix = provider
      ? `SELECT id, name, secret, provider, expires_at, is_active, created_at, updated_at
       FROM core.webhook_secrets
       WHERE LOWER(TRIM(COALESCE(provider, ''))) = LOWER(TRIM(COALESCE($1::text, '')))
       ORDER BY created_at DESC`
      : `SELECT id, name, secret, provider, expires_at, is_active, created_at, updated_at
       FROM core.webhook_secrets
       ORDER BY created_at DESC`;

    const params = provider ? [provider] : [];

    let result: { rows: (WebhookSecretRow & { secret?: string })[] };
    try {
      result = await dbPool.query<WebhookSecretRow & { secret?: string }>(withPrefix, params);
    } catch (err: any) {
      const isMissingColumn = err?.code === '42703' || /column.*secret_prefix|secret_prefix.*does not exist/i.test(err?.message || '');
      if (isMissingColumn) {
        result = await dbPool.query<WebhookSecretRow & { secret?: string }>(withoutPrefix, params);
        result.rows = result.rows.map((r) => ({ ...r, secret_prefix: null }));
      } else {
        throw err;
      }
    }
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      secret_prefix: row.secret_prefix ?? null,
      secret: row.secret ?? null,
      provider: row.provider,
      expires_at: row.expires_at ? row.expires_at.toISOString() : null,
      is_active: row.is_active,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    }));
  }

  /**
   * Crear una nueva clave. Genera el secret y lo devuelve solo en esta respuesta.
   */
  async create(dto: CreateWebhookSecretDto, provider: string = 'karlopay'): Promise<WebhookSecretCreated> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    const secret = 'ago_secret_' + crypto.randomBytes(32).toString('hex');
    const secretPrefix = secret.substring(0, 24);
    const expiresAt =
      dto.no_expira === true ? null : (dto.expires_at ?? null);

    let result: { rows: WebhookSecretRow[] };
    try {
      result = await dbPool.query<WebhookSecretRow>(
        `INSERT INTO core.webhook_secrets (name, secret, secret_prefix, provider, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, secret, expires_at, created_at`,
        [dto.name, secret, secretPrefix, provider, expiresAt],
      );
    } catch (err: any) {
      const isMissingColumn = err?.code === '42703' || /column.*secret_prefix|secret_prefix.*does not exist/i.test(err?.message || '');
      if (isMissingColumn) {
        result = await dbPool.query<WebhookSecretRow>(
          `INSERT INTO core.webhook_secrets (name, secret, provider, expires_at)
           VALUES ($1, $2, $3, $4)
           RETURNING id, name, secret, expires_at, created_at`,
          [dto.name, secret, provider, expiresAt],
        );
      } else {
        throw err;
      }
    }
    const row = result.rows[0];
    if (!row) {
      throw new ServiceUnavailableException('Error al crear la clave');
    }
    if (!secret.startsWith('ago_secret_')) {
      throw new InternalServerErrorException('El secret generado no tiene el prefijo esperado (ago_secret_)');
    }
    return {
      id: row.id,
      name: row.name,
      secret,
      expires_at: row.expires_at ? row.expires_at.toISOString() : null,
      created_at: row.created_at.toISOString(),
    };
  }

  /**
   * Actualizar (revocar o editar nombre/expires_at). Nunca devuelve secret.
   */
  async patch(id: string, dto: PatchWebhookSecretDto): Promise<WebhookSecretListItem> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    const updates: string[] = [];
    const values: (string | boolean | Date | null)[] = [];
    let pos = 1;
    if (dto.name !== undefined) {
      updates.push(`name = $${pos++}`);
      values.push(dto.name);
    }
    if (dto.is_active !== undefined) {
      updates.push(`is_active = $${pos++}`);
      values.push(dto.is_active);
    }
    if (dto.expires_at !== undefined) {
      updates.push(`expires_at = $${pos++}`);
      values.push(dto.expires_at == null ? null : new Date(dto.expires_at));
    }
    if (updates.length === 0) {
      const existing = await this.getOne(id);
      return existing;
    }
    values.push(id);
    const returningWithPrefix = `RETURNING id, name, secret_prefix, provider, expires_at, is_active, created_at, updated_at`;
    const returningWithoutPrefix = `RETURNING id, name, provider, expires_at, is_active, created_at, updated_at`;
    let row: WebhookSecretRow;
    try {
      const result = await dbPool.query<WebhookSecretRow>(
        `UPDATE core.webhook_secrets SET ${updates.join(', ')} WHERE id = $${pos} ${returningWithPrefix}`,
        values,
      );
      row = result.rows[0];
    } catch (err: any) {
      const isMissingColumn = err?.code === '42703' || /column.*secret_prefix|secret_prefix.*does not exist/i.test(err?.message || '');
      if (isMissingColumn) {
        const res = await dbPool.query<WebhookSecretRow>(
          `UPDATE core.webhook_secrets SET ${updates.join(', ')} WHERE id = $${pos} ${returningWithoutPrefix}`,
          values,
        );
        row = res.rows[0] ? { ...res.rows[0], secret_prefix: null } : undefined;
      } else {
        throw err;
      }
    }
    if (!row) {
      throw new NotFoundException('Clave de webhook no encontrada');
    }
    return {
      id: row.id,
      name: row.name,
      secret_prefix: row.secret_prefix ?? null,
      secret: null,
      provider: row.provider,
      expires_at: row.expires_at ? row.expires_at.toISOString() : null,
      is_active: row.is_active,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }

  /**
   * Obtener una clave por id (sin secret). Para uso interno o GET por id si se expone.
   */
  async getOne(id: string): Promise<WebhookSecretListItem> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    let row: WebhookSecretRow;
    try {
      const result = await dbPool.query<WebhookSecretRow>(
        `SELECT id, name, secret_prefix, provider, expires_at, is_active, created_at, updated_at
         FROM core.webhook_secrets WHERE id = $1`,
        [id],
      );
      row = result.rows[0];
    } catch (err: any) {
      const isMissingColumn = err?.code === '42703' || /column.*secret_prefix|secret_prefix.*does not exist/i.test(err?.message || '');
      if (isMissingColumn) {
        const result = await dbPool.query<WebhookSecretRow>(
          `SELECT id, name, provider, expires_at, is_active, created_at, updated_at
           FROM core.webhook_secrets WHERE id = $1`,
          [id],
        );
        row = result.rows[0] ? { ...result.rows[0], secret_prefix: null } : undefined;
      } else {
        throw err;
      }
    }
    if (!row) {
      throw new NotFoundException('Clave de webhook no encontrada');
    }
    return {
      id: row.id,
      name: row.name,
      secret_prefix: row.secret_prefix ?? null,
      secret: null,
      provider: row.provider,
      expires_at: row.expires_at ? row.expires_at.toISOString() : null,
      is_active: row.is_active,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }

  /**
   * Obtener el valor completo del secret por id (solo para admin, p. ej. al copiar).
   */
  async getSecretById(id: string): Promise<{ secret: string }> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }
    const result = await dbPool.query<{ secret: string }>(
      `SELECT secret FROM core.webhook_secrets WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    if (!row?.secret) {
      throw new NotFoundException('Clave de webhook no encontrada');
    }
    return { secret: row.secret };
  }

  /**
   * Obtener el secret activo más reciente para validar webhooks (uso interno del guard).
   * is_active = true y (expires_at IS NULL OR expires_at > NOW()), orden por created_at DESC, limit 1.
   */
  async getActiveSecret(provider: string = 'karlopay'): Promise<string | null> {
    if (!dbPool) {
      return null;
    }
    const result = await dbPool.query<{ secret: string }>(
      `SELECT secret
       FROM core.webhook_secrets
       WHERE LOWER(TRIM(COALESCE(provider, ''))) = LOWER(TRIM(COALESCE($1::text, '')))
         AND is_active = true
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC
       LIMIT 1`,
      [provider],
    );
    const row = result.rows[0];
    return row?.secret ?? null;
  }

  /**
   * Obtener todas las claves activas (no expiradas) de un proveedor.
   * Para validar que el webhook envíe una de estas claves (header o firma).
   */
  async getActiveSecrets(provider: string = 'karlopay'): Promise<string[]> {
    if (!dbPool) {
      return [];
    }
    const result = await dbPool.query<{ secret: string }>(
      `SELECT secret
       FROM core.webhook_secrets
       WHERE LOWER(TRIM(COALESCE(provider, ''))) = LOWER(TRIM(COALESCE($1::text, '')))
         AND is_active = true
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC`,
      [provider],
    );
    return result.rows.map((r) => r.secret).filter(Boolean);
  }
}
