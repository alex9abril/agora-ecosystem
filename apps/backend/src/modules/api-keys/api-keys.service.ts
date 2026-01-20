import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { supabaseAdmin } from '../../config/supabase.config';

/**
 * Servicio para gestionar API Keys
 */
@Injectable()
export class ApiKeysService {
  /**
   * Genera una nueva API Key
   * Formato: locala_<random_32_chars>
   */
  private generateApiKey(): string {
    const randomPart = randomBytes(32).toString('hex');
    return `locala_${randomPart}`;
  }

  /**
   * Genera el hash SHA-256 de una API key
   */
  private hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Obtiene el prefijo de una API key (primeros caracteres)
   */
  private getKeyPrefix(apiKey: string): string {
    return apiKey.substring(0, 20); // locala_ + primeros 12 chars
  }

  /**
   * Crea una nueva aplicación
   */
  async createApplication(data: {
    name: string;
    description?: string;
    appType: string;
    platform?: string;
    version?: string;
    metadata?: Record<string, any>;
    createdBy?: string;
  }) {
    if (!supabaseAdmin) {
      throw new BadRequestException('Servicio de base de datos no configurado');
    }

    const { data: application, error } = await supabaseAdmin
      .from('api_applications')
      .insert({
        name: data.name,
        description: data.description,
        app_type: data.appType,
        platform: data.platform,
        version: data.version,
        metadata: data.metadata,
        created_by: data.createdBy,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Error creando aplicación: ${error.message}`);
    }

    return application;
  }

  /**
   * Crea una nueva API Key para una aplicación
   * ⚠️ IMPORTANTE: La key solo se muestra una vez al crearla
   */
  async createApiKey(data: {
    applicationId: string;
    name: string;
    description?: string;
    scopes?: string[];
    expiresAt?: Date;
    rateLimitPerMinute?: number;
    rateLimitPerHour?: number;
    rateLimitPerDay?: number;
    createdBy?: string;
  }): Promise<{ apiKey: string; keyData: any }> {
    if (!supabaseAdmin) {
      throw new BadRequestException('Servicio de base de datos no configurado');
    }

    // Generar la API key
    const apiKey = this.generateApiKey();
    const keyHash = this.hashApiKey(apiKey);
    const keyPrefix = this.getKeyPrefix(apiKey);

    // Insertar en la base de datos
    const { data: keyData, error } = await supabaseAdmin
      .from('api_keys')
      .insert({
        application_id: data.applicationId,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name: data.name,
        description: data.description,
        scopes: data.scopes || [],
        expires_at: data.expiresAt?.toISOString(),
        rate_limit_per_minute: data.rateLimitPerMinute || 100,
        rate_limit_per_hour: data.rateLimitPerHour || 1000,
        rate_limit_per_day: data.rateLimitPerDay || 10000,
        created_by: data.createdBy,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Error creando API key: ${error.message}`);
    }

    // ⚠️ IMPORTANTE: Retornar la key en texto plano solo esta vez
    return {
      apiKey, // Esta es la única vez que se muestra
      keyData,
    };
  }

  /**
   * Valida una API key y retorna la información asociada
   */
  async validateApiKey(apiKey: string): Promise<{
    keyId: string;
    applicationId: string;
    applicationName: string;
    appType: string;
    scopes: string[];
    isActive: boolean;
    isExpired: boolean;
  } | null> {
    if (!supabaseAdmin) {
      return null;
    }

    const keyHash = this.hashApiKey(apiKey);

    // Buscar la key en la base de datos
    const { data: keyData, error } = await supabaseAdmin
      .from('api_keys')
      .select(`
        id,
        application_id,
        is_active,
        expires_at,
        scopes,
        api_applications!inner (
          id,
          name,
          app_type,
          is_active
        )
      `)
      .eq('key_hash', keyHash)
      .single();

    if (error || !keyData) {
      return null;
    }

    // api_applications puede ser un array o un objeto dependiendo de la relación
    // En Supabase con !inner, debería ser un objeto único, pero TypeScript lo ve como array
    const application = Array.isArray(keyData.api_applications) 
      ? keyData.api_applications[0] 
      : keyData.api_applications;

    if (!application) {
      return null;
    }

    // Verificar si está activa
    if (!keyData.is_active || !application.is_active) {
      return null;
    }

    // Verificar si está expirada
    const isExpired = keyData.expires_at
      ? new Date(keyData.expires_at) < new Date()
      : false;

    if (isExpired) {
      return null;
    }

    return {
      keyId: keyData.id,
      applicationId: keyData.application_id,
      applicationName: application.name,
      appType: application.app_type,
      scopes: keyData.scopes || [],
      isActive: true,
      isExpired: false,
    };
  }

  /**
   * Revoca una API key
   */
  async revokeApiKey(keyId: string, reason?: string) {
    if (!supabaseAdmin) {
      throw new BadRequestException('Servicio de base de datos no configurado');
    }

    const { error } = await supabaseAdmin
      .from('api_keys')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
      })
      .eq('id', keyId);

    if (error) {
      throw new BadRequestException(`Error revocando API key: ${error.message}`);
    }
  }

  /**
   * Lista todas las aplicaciones
   */
  async listApplications() {
    if (!supabaseAdmin) {
      throw new BadRequestException('Servicio de base de datos no configurado');
    }

    const { data, error } = await supabaseAdmin
      .from('api_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Error listando aplicaciones: ${error.message}`);
    }

    return data;
  }

  /**
   * Lista todas las API keys de una aplicación
   */
  async listApiKeys(applicationId: string) {
    if (!supabaseAdmin) {
      throw new BadRequestException('Servicio de base de datos no configurado');
    }

    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Error listando API keys: ${error.message}`);
    }

    return data;
  }

  /**
   * Obtiene estadísticas de una aplicación
   */
  async getApplicationStats(applicationId: string) {
    if (!supabaseAdmin) {
      throw new BadRequestException('Servicio de base de datos no configurado');
    }

    const { data, error } = await supabaseAdmin
      .from('api_application_stats')
      .select('*')
      .eq('application_id', applicationId)
      .single();

    if (error) {
      throw new NotFoundException(`Aplicación no encontrada: ${error.message}`);
    }

    return data;
  }

  /**
   * Registra un request en el log
   */
  async logRequest(data: {
    apiKeyId?: string;
    applicationId?: string;
    method: string;
    endpoint: string;
    statusCode: number;
    responseTimeMs?: number;
    requestSizeBytes?: number;
    responseSizeBytes?: number;
    ipAddress?: string;
    userAgent?: string;
    requestBody?: any;
    responseBody?: any;
    errorMessage?: string;
  }) {
    if (!supabaseAdmin) {
      return; // Silenciosamente fallar si no hay BD configurada
    }

    // No bloquear el request si falla el logging
    try {
      await supabaseAdmin.from('api_request_logs').insert({
        api_key_id: data.apiKeyId,
        application_id: data.applicationId,
        method: data.method,
        endpoint: data.endpoint,
        status_code: data.statusCode,
        response_time_ms: data.responseTimeMs,
        request_size_bytes: data.requestSizeBytes,
        response_size_bytes: data.responseSizeBytes,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        request_body: data.requestBody,
        response_body: data.responseBody,
        error_message: data.errorMessage,
      });
    } catch (error) {
      // Log el error pero no lanzar excepción
      console.error('Error logging API request:', error);
    }
  }
}

