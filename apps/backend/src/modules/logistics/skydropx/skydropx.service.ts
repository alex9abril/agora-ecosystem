/**
 * Servicio para integración con Skydropx
 * Maneja cotizaciones y creación de envíos.
 *
 * Recolecciones (pickups: coverage, POST /pickups, reschedule) y API V2 no están
 * implementadas; ver https://pro.skydropx.com/es-MX/api-docs si el negocio las requiere.
 */

import {
  Injectable,
  ServiceUnavailableException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { IntegrationsService } from '../../settings/integrations.service';
import axios from 'axios';
import * as crypto from 'crypto';

export interface SkydropxAddress {
  country_code: string; // ISO 3166-1 alpha-2 (ej: "MX")
  postal_code: string;
  area_level1: string; // Estado, provincia o departamento
  area_level2: string; // Ciudad o municipio
  area_level3: string; // Barrio o colonia
  street1: string; // Calle y número principal
  internal_number: string; // Número interior, departamento, etc. (puede ser vacío)
  reference: string; // Referencia del lugar (máximo 30 caracteres)
  name: string; // Nombre completo del contacto
  company: string; // Nombre de la empresa (puede ser vacío)
  phone: string; // Teléfono de contacto
  email: string; // Email de contacto
}

export interface SkydropxParcel {
  length: number; // Longitud del paquete en centímetros (entero)
  width: number; // Ancho del paquete en centímetros (entero)
  height: number; // Altura del paquete en centímetros (entero)
  weight: number; // Peso del paquete en kilogramos (float)
}

export interface SkydropxQuotationRequest {
  quotation: {
    address_from: SkydropxAddress;
    address_to: SkydropxAddress;
    parcels: SkydropxParcel[];
    requested_carriers: string[]; // Array de carriers a consultar (ej: ["fedex", "dhl"])
    products?: Array<{ // Solo para envíos internacionales
      hs_code: string; // Código HS (10 dígitos, padding con ceros)
      description_en: string; // Descripción en inglés
      country_code: string; // Código ISO del país de origen
      quantity: number; // Cantidad de unidades
      price: number; // Precio unitario
    }>;
  };
}

export interface SkydropxQuotation {
  id: string;
  carrier: string;
  service: string;
  price: number;
  currency: string;
  estimated_delivery?: string;
  estimated_days?: number;
}

export interface SkydropxQuotationResponse {
  quotations: SkydropxQuotation[];
}

export interface SkydropxShipmentProduct {
  name: string;
  description_en: string;
  quantity: number;
  price: number;
  sku: string;
  hs_code: string; // 10 dígitos, padding con ceros
  hs_code_description: string;
  product_type_code: string; // Ej: "P" para Producto
  product_type_name: string; // Ej: "Producto"
  country_code: string; // ISO 3166-1 alpha-2 (ej: "MX")
}

export interface SkydropxShipmentPackage {
  package_number: string;
  package_protected: boolean;
  declared_value: number;
  consignment_note: string;
  package_type: string; // Ej: "4G"
  products: SkydropxShipmentProduct[];
  content?: string; // Descripción del contenido del paquete (opcional)
  content_description?: string; // Descripción alternativa del contenido (opcional)
}

export interface SkydropxShipmentRequest {
  rate_id: string; // ID del rate seleccionado (obtenido de quotations)
  printing_format: 'thermal' | 'standard';
  address_from: SkydropxAddress;
  address_to: SkydropxAddress;
  packages: SkydropxShipmentPackage[];
}

export interface SkydropxShipment {
  id: string;
  tracking_number: string | null;
  label_url?: string | null;
  workflow_status: string; // 'in_progress', 'success', 'failed', 'cancelled'
  carrier?: string;
  service?: string;
  metadata?: any; // Respuesta completa de Skydropx
}

export interface SkydropxTrackingEvent {
  id?: string;
  status: string;
  description: string;
  location?: string;
  timestamp: string;
  date?: string; // Fecha alternativa del evento
}

export interface SkydropxTracking {
  shipment_id: string;
  tracking_number: string | null;
  status: string; // 'created', 'picked_up', 'in_transit', 'delivered', 'exception', 'cancelled'
  carrier: string | null;
  service: string | null;
  estimated_delivery?: string | null;
  current_location?: string | null;
  tracking_events: SkydropxTrackingEvent[];
  tracking_url?: string | null;
  metadata?: any; // Respuesta completa de Skydropx
}

interface CachedToken {
  access_token: string;
  expires_at: number; // Timestamp en milisegundos
  token_type: string;
}

@Injectable()
export class SkydropxService {
  private readonly logger = new Logger(SkydropxService.name);
  private tokenCache: CachedToken | null = null; // Cache del token OAuth
  /** Caché en memoria para catálogos GET (carrier_services, consignment_notes, packagings). */
  private readonly catalogCache = new Map<string, { at: number; data: unknown }>();
  private readonly catalogTtlMs = 5 * 60 * 1000;

  constructor(private readonly integrationsService: IntegrationsService) {}

  /**
   * Obtener credenciales de Skydropx desde variables de entorno y configuración
   */
  private async getCredentials(): Promise<{
    clientId: string;
    clientSecret: string;
    endpoint: string;
    quotationsEndpoint: string;
  }> {
    try {
      const credentials = await this.integrationsService.getSkydropxCredentials();
      return {
        clientId: credentials.apiKey, // Mantener compatibilidad con nombre anterior
        clientSecret: credentials.apiSecret, // Mantener compatibilidad con nombre anterior
        endpoint: credentials.endpoint,
        quotationsEndpoint: credentials.quotationsEndpoint,
      };
    } catch (error: any) {
      // Si no está habilitado o hay error, lanzar excepción
      throw new ServiceUnavailableException(
        `Error obteniendo credenciales de Skydropx: ${error.message}`
      );
    }
  }

  /**
   * Obtener token de acceso OAuth2 de Skydropx
   * El token expira en 2 horas según la documentación
   */
  private async getAccessToken(): Promise<string> {
    // Verificar si tenemos un token válido en cache
    if (this.tokenCache && this.tokenCache.expires_at > Date.now()) {
      this.logger.debug('🔑 Usando token OAuth cacheado');
      return this.tokenCache.access_token;
    }

    try {
      const { clientId, clientSecret, endpoint } = await this.getCredentials();

      if (!clientId || !clientSecret) {
        throw new ServiceUnavailableException('Credenciales de Skydropx no configuradas');
      }

      this.logger.log('🔐 Obteniendo nuevo token OAuth de Skydropx...');

      // Obtener token usando OAuth2 client_credentials
      const response = await axios.post(
        `${endpoint}/oauth/token`,
        {
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const tokenData = response.data;
      const expiresIn = tokenData.expires_in || 7200; // 2 horas por defecto
      
      // Cachear el token (renovar 5 minutos antes de que expire)
      this.tokenCache = {
        access_token: tokenData.access_token,
        expires_at: Date.now() + (expiresIn - 300) * 1000, // 5 minutos de margen
        token_type: tokenData.token_type || 'Bearer',
      };

      this.logger.log('✅ Token OAuth obtenido exitosamente');
      return this.tokenCache.access_token;
    } catch (error: any) {
      this.logger.error('❌ Error obteniendo token OAuth de Skydropx:', error);
      
      if (error.response) {
        this.logger.error('Respuesta de error:', {
          status: error.response.status,
          data: error.response.data,
        });
        throw new ServiceUnavailableException(
          `Error obteniendo token OAuth: ${error.response.data?.error_description || error.message}`
        );
      }
      
      throw new ServiceUnavailableException(
        `Error obteniendo token OAuth: ${error.message}`
      );
    }
  }

  /**
   * Verificar si Skydropx está habilitado
   */
  async isEnabled(): Promise<boolean> {
    try {
      await this.integrationsService.getSkydropxCredentials();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Crear headers de autenticación para Skydropx
   * Skydropx usa OAuth2 Bearer Token según la documentación oficial
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    // Obtener token OAuth2 (se cachea automáticamente)
    const accessToken = await this.getAccessToken();
    
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Obtener cotizaciones de envío
   * 
   * NOTA: En el futuro, este método puede procesar las cotizaciones
   * en un sistema propio antes de llamar a Skydropx
   */
  async getQuotations(
    request: SkydropxQuotationRequest
  ): Promise<SkydropxQuotationResponse> {
    const enabled = await this.isEnabled();
    if (!enabled) {
      throw new ServiceUnavailableException('Skydropx no está habilitado');
    }

    try {
      const { quotationsEndpoint } = await this.getCredentials();
      const headers = await this.getAuthHeaders();

      this.logger.log(`📦 Solicitando cotizaciones: ${quotationsEndpoint}/quotations`);
      
      // Log del request completo para debugging
      this.logger.debug('📋 Request completo a Skydropx:', JSON.stringify(request, null, 2));
      this.logger.debug('📋 Headers enviados:', {
        'Content-Type': headers['Content-Type'],
        'Authorization': headers['Authorization'] ? `${headers['Authorization'].substring(0, 20)}...` : 'NO DISPONIBLE',
      });

      const response = await axios.post(
        `${quotationsEndpoint}/quotations`,
        request,
        { 
          headers,
          validateStatus: (status) => status < 500, // No lanzar error para 4xx, solo para 5xx
        }
      );
      
      // Si hay un error 4xx, loguear y lanzar excepción antes de intentar transformar
      if (response.status >= 400) {
        const errorData = response.data;
        const errorMessage = errorData?.message || 
                            errorData?.error_description || 
                            errorData?.error || 
                            `Error ${response.status}: ${response.statusText}`;
        
        this.logger.error('❌ Respuesta de error de Skydropx (status >= 400):', {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
          requestPayload: JSON.stringify(request, null, 2),
          errorMessage,
        });

        throw new ServiceUnavailableException(
          `Error de Skydropx (${response.status}): ${errorMessage}`
        );
      }

      this.logger.debug('📥 Respuesta exitosa de Skydropx:', JSON.stringify(response.data, null, 2));

      // Transformar respuesta de Skydropx al formato esperado
      // Según la documentación, Skydropx devuelve:
      // {
      //   "id": "quotation_123456",
      //   "is_completed": true,
      //   "rates": [
      //     {
      //       "id": "rate_789",
      //       "provider_name": "fedex",
      //       "provider_service_name": "FedEx Express",
      //       "currency_code": "MXN",
      //       "total": "250.50",
      //       "days": 2,
      //       ...
      //     }
      //   ]
      // }
      
      let quotations: SkydropxQuotation[] = [];
      const responseData = response.data;

      // Verificar si la cotización está completa
      if (responseData.is_completed === false) {
        this.logger.log(`⏳ La cotización de Skydropx no está completa (id: ${responseData.id}). Iniciando polling...`);
        
        // Implementar polling con backoff exponencial
        const quotationId = responseData.id;
        const maxAttempts = 5;
        const initialDelay = 1000; // 1 segundo
        let delay = initialDelay;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          await new Promise(resolve => setTimeout(resolve, delay));
          
          try {
            const { quotationsEndpoint } = await this.getCredentials();
            const headers = await this.getAuthHeaders();
            
            this.logger.debug(`🔄 Polling intento ${attempt}/${maxAttempts} para cotización ${quotationId}`);
            
            const pollResponse = await axios.get(
              `${quotationsEndpoint}/quotations/${quotationId}`,
              { headers, validateStatus: (status) => status < 500 }
            );
            
            if (pollResponse.status >= 400) {
              this.logger.error(`❌ Error en polling (intento ${attempt}):`, pollResponse.data);
              break;
            }
            
            const pollData = pollResponse.data;
            
            if (pollData.is_completed === true) {
              this.logger.log(`✅ Cotización completada después de ${attempt} intento(s)`);
              // Usar los datos del polling
              responseData.is_completed = true;
              responseData.rates = pollData.rates || [];
              break;
            } else {
              this.logger.debug(`⏳ Cotización aún no completa (intento ${attempt}/${maxAttempts})`);
              // Incrementar delay exponencialmente: 1s, 2s, 4s, 8s, 16s
              delay = Math.min(initialDelay * Math.pow(2, attempt), 16000);
            }
          } catch (error: any) {
            this.logger.error(`❌ Error en polling (intento ${attempt}):`, error.message);
            break;
          }
        }
        
        // Si después de todos los intentos aún no está completa, loguear warning
        if (responseData.is_completed === false) {
          this.logger.warn(`⚠️ La cotización ${quotationId} no se completó después de ${maxAttempts} intentos. Retornando rates disponibles (pueden estar pendientes).`);
        }
      }

      // Extraer rates del response
      if (responseData.rates && Array.isArray(responseData.rates)) {
        // Usar un Set para eliminar duplicados basados en el ID del rate
        const seenRateIds = new Set<string>();
        
        quotations = responseData.rates
          .filter((rate: any) => {
            // Eliminar duplicados basados en el ID
            const rateId = rate.id?.toString() || '';
            if (seenRateIds.has(rateId)) {
              this.logger.debug(`⏭️ Rate duplicado filtrado: ${rateId} - ${rate.provider_name} - ${rate.provider_service_name}`);
              return false;
            }
            seenRateIds.add(rateId);
            
            // Filtrar rates válidos según la documentación:
            // - success debe ser true (o no estar presente, en cuyo caso asumimos true)
            // - total debe ser mayor a 0 y no null
            // - status debe ser 'price_found_internal' o 'price_found_external' (o no estar presente)
            // - days debe ser mayor a 0 y no null
            const total = rate.total !== null && rate.total !== undefined 
              ? parseFloat(rate.total || rate.cost || rate.amount || 0) 
              : 0;
            const days = rate.days !== null && rate.days !== undefined ? (rate.days || 0) : 0;
            const success = rate.success === true || (rate.success === undefined && rate.status !== 'pending');
            const status = rate.status || '';
            
            // Solo incluir rates que tengan precio y días válidos
            // Excluir rates con status "pending" o que tengan success: false explícitamente
            const isValid = success && 
                          total > 0 && 
                          days > 0 && 
                          status !== 'pending' &&
                          (status.includes('price_found') || status === '' || !status);
            
            if (!isValid) {
              this.logger.debug(`⏭️ Rate filtrado: ${rate.provider_name} - ${rate.provider_service_name} (success: ${rate.success}, total: ${total}, days: ${days}, status: ${status})`);
            }
            
            return isValid;
          })
          .map((rate: any) => {
            const total = parseFloat(rate.total || rate.cost || rate.amount || 0);
            const days = rate.days || 0;
            
            return {
              id: rate.id?.toString() || '',
              carrier: rate.provider_name || rate.carrier || '',
              service: rate.provider_service_name || rate.service || rate.provider_service_code || '',
              price: total,
              currency: rate.currency_code || rate.currency || 'MXN',
              days,
            };
          });
      } else {
        this.logger.warn('⚠️ Formato de respuesta de Skydropx no reconocido o sin rates:', JSON.stringify(responseData, null, 2));
      }

      this.logger.log(`✅ Cotizaciones obtenidas: ${quotations.length} opciones válidas (de ${responseData.rates?.length || 0} rates totales)`);

      if (quotations.length === 0) {
        this.logger.warn('⚠️ No se obtuvieron cotizaciones válidas de Skydropx después del polling. Esto puede indicar que:');
        this.logger.warn('   1. La cotización aún está procesándose (intenta de nuevo en unos segundos)');
        this.logger.warn('   2. No hay carriers disponibles para la ruta especificada');
        this.logger.warn('   3. Hay un problema con los datos de la cotización');
      }

      return { quotations };
    } catch (error: any) {
      this.logger.error('❌ Error obteniendo cotizaciones de Skydropx:', error);
      
      if (error.response) {
        this.logger.error('Respuesta de error de Skydropx:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        });

        // Si es un error 401, puede ser problema de credenciales
        if (error.response.status === 401) {
          this.logger.error('⚠️ Error 401: Verifica que las credenciales (SKYDROPPX_API_KEY y SKYDROPPX_API_SECRET) estén correctamente configuradas en el .env');
        }

        // Log detallado del error para debugging
        const errorMessage = error.response.data?.error_description || 
                            error.response.data?.message || 
                            error.response.data?.error || 
                            error.message;
        
        this.logger.error('📋 Detalles del error de Skydropx:', {
          status: error.response.status,
          error: error.response.data?.error,
          error_description: error.response.data?.error_description,
          message: error.response.data?.message,
          full_response: JSON.stringify(error.response.data, null, 2),
        });

        throw new ServiceUnavailableException(
          `Error de Skydropx (${error.response.status}): ${errorMessage}`
        );
      }
      
      throw new ServiceUnavailableException(
        `Error al obtener cotizaciones: ${error.message}`
      );
    }
  }

  /**
   * Crear un envío usando un rate_id previamente obtenido de una cotización
   */
  async createShipment(
    request: SkydropxShipmentRequest
  ): Promise<SkydropxShipment> {
    const enabled = await this.isEnabled();
    if (!enabled) {
      throw new ServiceUnavailableException('Skydropx no está habilitado');
    }

    if (!request.rate_id) {
      throw new BadRequestException('rate_id es requerido');
    }

    try {
      const { endpoint } = await this.getCredentials();
      const headers = await this.getAuthHeaders();

      this.logger.log(`🚚 Creando envío en Skydropx con rate_id: ${request.rate_id}`);

      // Construir payload según la especificación de Skydropx
      const payload = {
        shipment: {
          rate_id: request.rate_id,
          printing_format: request.printing_format || 'thermal',
          address_from: request.address_from,
          address_to: request.address_to,
          packages: request.packages,
        },
      };

      this.logger.debug('📋 Payload de shipment:', JSON.stringify(payload, null, 2));

      const response = await axios.post(
        `${endpoint}/shipments`,
        payload,
        { 
          headers,
          validateStatus: (status) => status < 500,
        }
      );

      if (response.status >= 400) {
        const errorData = response.data;
        const errorMessage = errorData?.message || 
                            errorData?.error_description || 
                            errorData?.error || 
                            `Error ${response.status}: ${response.statusText}`;
        
        this.logger.error('❌ Error de Skydropx al crear shipment:', {
          status: response.status,
          error: errorMessage,
          data: errorData,
        });

        throw new ServiceUnavailableException(
          `Error de Skydropx (${response.status}): ${errorMessage}`
        );
      }

      const shipmentData = response.data.data || response.data;
      const attributes = shipmentData.attributes || shipmentData;

      // Log detallado para debugging
      this.logger.debug('📋 Respuesta de Skydropx al crear shipment:', {
        hasData: !!response.data.data,
        hasAttributes: !!attributes,
        trackingNumber: attributes.tracking_number || shipmentData.tracking_number || 'NO ENCONTRADO',
        labelUrl: attributes.label_url || shipmentData.label_url || 'NO ENCONTRADO',
        workflowStatus: attributes.workflow_status || shipmentData.workflow_status || 'NO ENCONTRADO',
      });

      let shipment: SkydropxShipment = {
        id: shipmentData.id || attributes.id,
        tracking_number: attributes.tracking_number || shipmentData.tracking_number || null,
        label_url: attributes.label_url || shipmentData.label_url || null,
        workflow_status: attributes.workflow_status || shipmentData.workflow_status || 'in_progress',
        carrier: attributes.carrier || shipmentData.carrier || null,
        service: attributes.service || shipmentData.service || null,
        metadata: response.data, // Guardar respuesta completa como metadata
      };

      this.logger.log(`✅ Shipment creado: ${shipment.id} (workflow_status: ${shipment.workflow_status}, tracking_number: ${shipment.tracking_number || 'NO DISPONIBLE'})`);

      // Si el workflow_status es "in_progress", hacer polling hasta que esté listo
      if (shipment.workflow_status === 'in_progress') {
        this.logger.log(`⏳ Shipment en progreso, iniciando polling...`);
        shipment = await this.pollShipmentStatus(shipment.id);
      }

      return shipment;
    } catch (error: any) {
      this.logger.error('❌ Error creando envío en Skydropx:', error);
      
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      
      if (error.response) {
        this.logger.error('Respuesta de error:', error.response.data);
        throw new ServiceUnavailableException(
          `Error de Skydropx: ${error.response.data?.message || error.message}`
        );
      }
      
      throw new ServiceUnavailableException(
        `Error al crear envío: ${error.message}`
      );
    }
  }

  /**
   * Hacer polling del estado de un shipment hasta que esté listo
   */
  private async pollShipmentStatus(shipmentId: string): Promise<SkydropxShipment> {
    const { endpoint } = await this.getCredentials();
    const headers = await this.getAuthHeaders();
    
    const MAX_ATTEMPTS = 10;
    const INITIAL_DELAY = 1000; // 1 segundo
    let delay = INITIAL_DELAY;
    
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        this.logger.debug(`🔄 Polling intento ${attempt}/${MAX_ATTEMPTS} para shipment ${shipmentId}`);
        
        const pollResponse = await axios.get(
          `${endpoint}/shipments/${shipmentId}`,
          { 
            headers,
            validateStatus: (status) => status < 500,
          }
        );
        
        if (pollResponse.status >= 400) {
          this.logger.error(`❌ Error en polling (intento ${attempt}):`, pollResponse.data);
          break;
        }
        
        const pollData = pollResponse.data.data || pollResponse.data;
        const attributes = pollData.attributes || pollData;
        const workflowStatus = attributes.workflow_status || pollData.workflow_status;
        
        if (workflowStatus === 'success') {
          // Obtener included primero para buscar tracking_number ahí también
          const included = pollResponse.data.included || pollData.included || [];
          
          // Buscar tracking_number en las ubicaciones correctas (orden de prioridad)
          // 1. master_tracking_number en attributes (ubicación principal según estructura de Skydropx)
          // 2. tracking_number en included[0].attributes (muy común en Skydropx)
          // 3. tracking_number en attributes (fallback)
          const trackingNumber = 
            attributes.master_tracking_number ||
            (included.length > 0 && included[0]?.attributes?.tracking_number) ||
            attributes.tracking_number || 
            pollData.tracking_number || 
            null;
          
          // Buscar label_url en las ubicaciones correctas
          // 1. En included[0].attributes.label_url (ubicación principal según estructura de Skydropx)
          // 2. En attributes.label_url (fallback)
          const labelUrl = 
            (included.length > 0 && included[0]?.attributes?.label_url) ||
            attributes.label_url || 
            pollData.label_url || 
            null;
          
          this.logger.log(`✅ Shipment completado después de ${attempt} intento(s)`);
          this.logger.log(`📦 Tracking number obtenido: ${trackingNumber || 'NO DISPONIBLE'}`);
          this.logger.log(`📄 Label URL obtenido: ${labelUrl || 'NO DISPONIBLE'}`);
          
          return {
            id: pollData.id || attributes.id,
            tracking_number: trackingNumber,
            label_url: labelUrl,
            workflow_status: 'success',
            carrier: attributes.carrier || pollData.carrier || null,
            service: attributes.service || pollData.service || null,
            metadata: pollResponse.data, // Guardar respuesta completa como metadata
          };
        } else if (workflowStatus === 'failed' || workflowStatus === 'cancelled') {
          this.logger.error(`❌ Shipment ${workflowStatus} después de ${attempt} intento(s)`);
          
          return {
            id: pollData.id || attributes.id,
            tracking_number: null,
            label_url: null,
            workflow_status: workflowStatus,
            carrier: attributes.carrier || null,
            service: attributes.service || null,
            metadata: pollResponse.data,
          };
        } else {
          this.logger.debug(`⏳ Shipment aún en progreso (intento ${attempt}/${MAX_ATTEMPTS})`);
          // Incrementar delay exponencialmente: 1s, 2s, 4s, 8s, 16s
          delay = Math.min(INITIAL_DELAY * Math.pow(2, attempt), 16000);
        }
      } catch (error: any) {
        this.logger.error(`❌ Error en polling (intento ${attempt}):`, error.message);
        break;
      }
    }
    
    // Si después de todos los intentos aún no está listo, retornar el estado actual
    this.logger.warn(`⚠️ Shipment ${shipmentId} no se completó después de ${MAX_ATTEMPTS} intentos`);
    
    // Hacer una última consulta para obtener el estado actual
    try {
      const { endpoint } = await this.getCredentials();
      const headers = await this.getAuthHeaders();
      const finalResponse = await axios.get(
        `${endpoint}/shipments/${shipmentId}`,
        { headers, validateStatus: (status) => status < 500 }
      );
      
      const finalData = finalResponse.data.data || finalResponse.data;
      const finalAttributes = finalData.attributes || finalData;
      const finalIncluded = finalResponse.data.included || finalData.included || [];
      
      // Buscar tracking_number en todas las ubicaciones posibles
      const finalTrackingNumber = 
        finalAttributes.master_tracking_number ||
        (finalIncluded.length > 0 && finalIncluded[0]?.attributes?.tracking_number) ||
        finalAttributes.tracking_number || 
        null;
      
      // Buscar label_url en todas las ubicaciones posibles
      const finalLabelUrl = 
        (finalIncluded.length > 0 && finalIncluded[0]?.attributes?.label_url) ||
        finalAttributes.label_url || 
        null;
      
      return {
        id: finalData.id || finalAttributes.id,
        tracking_number: finalTrackingNumber,
        label_url: finalLabelUrl,
        workflow_status: finalAttributes.workflow_status || 'in_progress',
        carrier: finalAttributes.carrier || null,
        service: finalAttributes.service || null,
        metadata: finalResponse.data,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error en consulta final del shipment:`, error.message);
      throw new ServiceUnavailableException(
        `No se pudo obtener el estado final del shipment después de ${MAX_ATTEMPTS} intentos`
      );
    }
  }

  /**
   * Obtener el estado de seguimiento de un envío
   * Consulta el endpoint /shipments/:id de Skydropx (el tracking viene en la respuesta del shipment)
   */
  async getShipmentTracking(shipmentId: string): Promise<SkydropxTracking> {
    const enabled = await this.isEnabled();
    if (!enabled) {
      throw new ServiceUnavailableException('Skydropx no está habilitado');
    }

    if (!shipmentId) {
      throw new BadRequestException('shipmentId es requerido');
    }

    try {
      const { endpoint } = await this.getCredentials();
      const headers = await this.getAuthHeaders();

      this.logger.log(`📦 Consultando tracking de shipment: ${shipmentId}`);

      // Skydropx no tiene un endpoint separado /tracking, el tracking viene en /shipments/:id
      const response = await axios.get(
        `${endpoint}/shipments/${shipmentId}`,
        { 
          headers,
          validateStatus: (status) => status < 500,
        }
      );

      if (response.status >= 400) {
        const errorData = response.data;
        const errorMessage = errorData?.message || 
                            errorData?.error_description || 
                            errorData?.error || 
                            `Error ${response.status}: ${response.statusText}`;
        
        this.logger.error('❌ Error obteniendo tracking de Skydropx:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          shipmentId,
        });

        if (response.status === 401) {
          // Token expirado, limpiar cache y reintentar
          this.logger.warn('🔄 Token expirado, limpiando cache...');
          this.tokenCache = null;
          throw new ServiceUnavailableException('Error de autenticación con Skydropx. Por favor, intenta nuevamente.');
        }

        throw new ServiceUnavailableException(
          `Error de Skydropx (${response.status}): ${errorMessage}`
        );
      }

      const data = response.data.data || response.data;
      const attributes = data.attributes || data;
      const included = response.data.included || [];

      // Extraer tracking events si están disponibles
      const trackingEvents: SkydropxTrackingEvent[] = [];
      if (attributes.tracking_events && Array.isArray(attributes.tracking_events)) {
        trackingEvents.push(...attributes.tracking_events.map((event: any) => ({
          status: event.status || event.event_type || 'unknown',
          description: event.description || event.message || '',
          location: event.location || event.city || null,
          timestamp: event.timestamp || event.created_at || new Date().toISOString(),
        })));
      }

      // Mapear el status de Skydropx a nuestro formato
      // Skydropx puede usar: 'created', 'picked_up', 'in_transit', 'delivered', 'exception', 'cancelled'
      // También puede usar workflow_status: 'in_progress', 'success', 'failed', 'cancelled'
      // Y tracking_status en packages: 'created', 'picked_up', 'in_transit', 'delivered', 'canceled'
      // Nuestro sistema usa: 'generated', 'picked_up', 'in_transit', 'delivered', 'cancelled'
      
      // Prioridad: tracking_status del package > workflow_status > status general
      let mappedStatus = 'created';
      
      // Primero intentar obtener el tracking_status del package (más preciso)
      if (included.length > 0) {
        const packageTrackingStatus = included[0]?.attributes?.tracking_status;
        if (packageTrackingStatus) {
          mappedStatus = packageTrackingStatus;
        }
      }
      
      // Si no hay tracking_status del package, usar workflow_status o status general
      if (mappedStatus === 'created') {
        mappedStatus = attributes.workflow_status || attributes.status || attributes.tracking_status || 'created';
      }
      
      // Normalizar variantes de "cancelled"
      if (mappedStatus === 'canceled' || mappedStatus === 'cancelled') {
        mappedStatus = 'cancelled';
      }
      
      // Mapear estados de workflow a estados de tracking
      if (mappedStatus === 'success' || mappedStatus === 'in_progress') {
        // Si workflow está en progreso o exitoso pero no hay tracking_status específico,
        // mantener como 'generated' (recién creado, esperando recolección)
        mappedStatus = 'generated';
      }
      
      // Mapear 'created' a 'generated'
      if (mappedStatus === 'created') {
        mappedStatus = 'generated';
      }

      // Extraer tracking_number de diferentes ubicaciones posibles
      const trackingNumber = 
        attributes.master_tracking_number ||
        attributes.tracking_number ||
        (included.length > 0 && included[0]?.attributes?.tracking_number) ||
        null;

      // Extraer tracking_url del carrier
      const trackingUrl = 
        attributes.tracking_url_provider ||
        attributes.tracking_url ||
        null;

      const tracking: SkydropxTracking = {
        shipment_id: data.id || attributes.id || shipmentId,
        tracking_number: trackingNumber,
        status: mappedStatus,
        carrier: attributes.carrier_name || attributes.carrier || null,
        service: attributes.service_name || attributes.service || null,
        estimated_delivery: attributes.estimated_delivery || attributes.estimated_delivery_date || null,
        current_location: attributes.current_location || attributes.location || null,
        tracking_events: trackingEvents,
        tracking_url: trackingUrl,
        metadata: response.data, // Guardar respuesta completa
      };

      this.logger.log(`✅ Tracking obtenido: ${tracking.status} (${tracking.tracking_number || 'SIN TRACKING'})`);

      return tracking;
    } catch (error: any) {
      this.logger.error('❌ Error obteniendo tracking de Skydropx:', error);

      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      if (error.response) {
        const errorMessage = error.response.data?.message || 
                            error.response.data?.error_description || 
                            error.response.data?.error || 
                            `Error ${error.response.status}: ${error.response.statusText}`;
        
        throw new ServiceUnavailableException(
          `Error de Skydropx (${error.response.status}): ${errorMessage}`
        );
      }

      throw new ServiceUnavailableException(
        `Error obteniendo tracking: ${error.message}`
      );
    }
  }

  /**
   * Obtener eventos de tracking detallados desde el endpoint de tracking de Skydropx
   * GET /shipments/tracking?tracking_number={tracking_number}&carrier_name={carrier_name}
   */
  async getTrackingEvents(trackingNumber: string, carrierName: string): Promise<SkydropxTrackingEvent[]> {
    const enabled = await this.isEnabled();
    if (!enabled) {
      throw new ServiceUnavailableException('Skydropx no está habilitado');
    }

    if (!trackingNumber || !carrierName) {
      throw new BadRequestException('trackingNumber y carrierName son requeridos');
    }

    try {
      const { endpoint } = await this.getCredentials();
      const headers = await this.getAuthHeaders();

      this.logger.log(`📦 Consultando eventos de tracking: ${trackingNumber} (${carrierName})`);

      const response = await axios.get(
        `${endpoint}/shipments/tracking`,
        {
          params: {
            tracking_number: trackingNumber,
            carrier_name: carrierName,
          },
          headers,
          validateStatus: (status) => status < 500,
        }
      );

      if (response.status >= 400) {
        const errorData = response.data;
        const errorMessage = errorData?.message || 
                            errorData?.error_description || 
                            errorData?.error || 
                            `Error ${response.status}: ${response.statusText}`;
        
        this.logger.error('❌ Error obteniendo eventos de tracking de Skydropx:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          trackingNumber,
          carrierName,
        });

        if (response.status === 401) {
          this.logger.warn('🔄 Token expirado, limpiando cache...');
          this.tokenCache = null;
          throw new ServiceUnavailableException('Error de autenticación con Skydropx. Por favor, intenta nuevamente.');
        }

        // Si es 404, puede que el tracking aún no esté disponible, retornar array vacío
        if (response.status === 404) {
          this.logger.warn(`⚠️ No se encontraron eventos de tracking para ${trackingNumber}. Puede que aún no estén disponibles.`);
          return [];
        }

        throw new ServiceUnavailableException(
          `Error de Skydropx (${response.status}): ${errorMessage}`
        );
      }

      // La respuesta de Skydropx viene como un array en data
      const eventsData = response.data.data || response.data || [];
      
      if (!Array.isArray(eventsData)) {
        this.logger.warn('⚠️ Respuesta de tracking events no es un array:', eventsData);
        return [];
      }

      // Transformar eventos de Skydropx a nuestro formato
      const events: SkydropxTrackingEvent[] = eventsData.map((event: any) => {
        const attributes = event.attributes || event;
        
        return {
          id: event.id || attributes.id,
          status: attributes.status || attributes.code || 'unknown',
          description: attributes.description || attributes.message || 'Evento de seguimiento',
          location: attributes.location || attributes.city || null,
          timestamp: attributes.date || attributes.timestamp || attributes.created_at || new Date().toISOString(),
        };
      });

      // Ordenar eventos: más recientes primero
      events.sort((a, b) => {
        const dateA = new Date(a.timestamp || a.date || 0).getTime();
        const dateB = new Date(b.timestamp || b.date || 0).getTime();
        return dateB - dateA; // Más reciente primero
      });

      this.logger.log(`✅ ${events.length} evento(s) de tracking obtenido(s)`);

      return events;
    } catch (error: any) {
      this.logger.error('❌ Error obteniendo eventos de tracking de Skydropx:', error);

      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      if (error.response) {
        const errorMessage = error.response.data?.message || 
                            error.response.data?.error_description || 
                            error.response.data?.error || 
                            `Error ${error.response.status}: ${error.response.statusText}`;
        
        throw new ServiceUnavailableException(
          `Error de Skydropx (${error.response.status}): ${errorMessage}`
        );
      }

      throw new ServiceUnavailableException(
        `Error obteniendo eventos de tracking: ${error.message}`
      );
    }
  }

  /**
   * Valida el encabezado Authorization del webhook Skydropx.
   * HMAC: SHA-512 sobre el cuerpo crudo (hex minúsculas). Bearer: token fijo en env.
   * @see https://pro.skydropx.com/es-MX/api-docs#webhooks
   */
  verifyWebhookAuthorization(
    authorization: string | undefined,
    rawBody: Buffer | undefined
  ): void {
    const hmacSecret =
      process.env.SKYDROPPX_WEBHOOK_HMAC_SECRET ||
      process.env.SKYDROPPX_WEBHOOK_SECRET;
    const bearerToken = process.env.SKYDROPPX_WEBHOOK_BEARER;

    if (!hmacSecret && !bearerToken) {
      throw new ServiceUnavailableException(
        'Webhook Skydropx no configurado: defina SKYDROPPX_WEBHOOK_HMAC_SECRET o SKYDROPPX_WEBHOOK_BEARER'
      );
    }

    const auth = (authorization || '').trim();
    if (auth.toUpperCase().startsWith('HMAC ')) {
      if (!hmacSecret) {
        throw new UnauthorizedException('HMAC no habilitado en el servidor');
      }
      if (!rawBody || rawBody.length === 0) {
        throw new UnauthorizedException('Cuerpo vacío; se requiere body crudo para HMAC');
      }
      const sig = auth.slice(5).trim().toLowerCase();
      const expected = crypto
        .createHmac('sha512', hmacSecret)
        .update(rawBody)
        .digest('hex');
      const a = Buffer.from(sig, 'utf8');
      const b = Buffer.from(expected, 'utf8');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        throw new UnauthorizedException('Firma HMAC inválida');
      }
      return;
    }

    if (auth.toLowerCase().startsWith('bearer ')) {
      if (!bearerToken) {
        throw new UnauthorizedException('Bearer no habilitado en el servidor');
      }
      const token = auth.slice(7).trim();
      const tb = Buffer.from(token, 'utf8');
      const bb = Buffer.from(bearerToken, 'utf8');
      if (tb.length !== bb.length || !crypto.timingSafeEqual(tb, bb)) {
        throw new UnauthorizedException('Token Bearer inválido');
      }
      return;
    }

    throw new UnauthorizedException(
      'Authorization inválido: use "HMAC <hex>" o "Bearer <token>"'
    );
  }

  /**
   * Construye un SkydropxTracking mínimo desde el payload webhook (type packages).
   */
  trackingFromPackageWebhook(payload: unknown): SkydropxTracking | null {
    if (!payload || typeof payload !== 'object') return null;
    const root = payload as { data?: any };
    const data = root.data;
    if (!data || data.type !== 'packages') return null;
    const attrs = data.attributes || {};
    const shipmentRel = data.relationships?.shipment?.data;
    const shipmentId = shipmentRel?.id;
    if (!shipmentId || typeof shipmentId !== 'string') return null;

    const raw = String(attrs.status || '')
      .toLowerCase()
      .replace(/\s+/g, '_');
    let mapped = 'generated' as SkydropxTracking['status'];
    if (raw === 'delivered') mapped = 'delivered';
    else if (raw === 'in_transit' || raw === 'in-transit') mapped = 'in_transit';
    else if (raw === 'picked_up' || raw === 'picked-up') mapped = 'picked_up';
    else if (raw === 'cancelled' || raw === 'canceled') mapped = 'cancelled';
    else if (raw === 'exception') mapped = 'exception';
    else if (raw === 'created' || raw === 'generated') mapped = 'generated';

    const trackingNumber =
      attrs.tracking_number != null ? String(attrs.tracking_number) : null;

    return {
      shipment_id: shipmentId,
      tracking_number: trackingNumber,
      status: mapped,
      carrier: attrs.carrier_name || attrs.carrier || null,
      service: attrs.service_name || attrs.service || null,
      estimated_delivery: attrs.estimated_delivery || null,
      current_location: attrs.current_location || attrs.location || null,
      tracking_events: [],
      tracking_url: attrs.tracking_url_provider || attrs.tracking_url || null,
      metadata: { data: root.data, source: 'skydropx_webhook' },
    };
  }

  /**
   * Cancelar envío en Skydropx.
   * POST /shipments/{id}/cancellations
   */
  async cancelShipment(shipmentId: string, reason?: string): Promise<void> {
    const enabled = await this.isEnabled();
    if (!enabled) {
      throw new ServiceUnavailableException('Skydropx no está habilitado');
    }
    if (!shipmentId) {
      throw new BadRequestException('shipmentId es requerido');
    }
    try {
      const { endpoint } = await this.getCredentials();
      const headers = await this.getAuthHeaders();
      const body = reason?.trim() ? { reason: reason.trim() } : {};
      const response = await axios.post(
        `${endpoint}/shipments/${encodeURIComponent(shipmentId)}/cancellations`,
        body,
        { headers, validateStatus: (status) => status < 500 }
      );
      if (response.status >= 400) {
        const err =
          response.data?.message ||
          response.data?.error ||
          response.statusText;
        throw new ServiceUnavailableException(
          `Skydropx cancelación (${response.status}): ${err}`
        );
      }
      this.logger.log(`✅ Envío Skydropx cancelado: ${shipmentId}`);
    } catch (error: any) {
      if (
        error instanceof ServiceUnavailableException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`❌ Error cancelando envío Skydropx: ${error.message}`);
      throw new ServiceUnavailableException(
        `Error al cancelar envío: ${error.message}`
      );
    }
  }

  private getCachedCatalog(key: string): unknown | undefined {
    const hit = this.catalogCache.get(key);
    if (hit && Date.now() - hit.at < this.catalogTtlMs) return hit.data;
    return undefined;
  }

  private setCachedCatalog(key: string, data: unknown): void {
    this.catalogCache.set(key, { at: Date.now(), data });
  }

  private async fetchCatalogPath(pathSuffix: string): Promise<unknown> {
    const { endpoint } = await this.getCredentials();
    const headers = await this.getAuthHeaders();
    const url = `${endpoint}/shipments/${pathSuffix}`;
    const response = await axios.get(url, {
      headers,
      validateStatus: (status) => status < 500,
    });
    if (response.status >= 400) {
      const msg =
        response.data?.message ||
        response.data?.error ||
        response.statusText;
      throw new ServiceUnavailableException(
        `Skydropx (${response.status}): ${msg}`
      );
    }
    return response.data;
  }

  async getCarrierServicesCached(): Promise<unknown> {
    const key = 'carrier_services';
    const hit = this.getCachedCatalog(key);
    if (hit !== undefined) return hit;
    const data = await this.fetchCatalogPath('carrier_services');
    this.setCachedCatalog(key, data);
    return data;
  }

  async getConsignmentNotesCached(): Promise<unknown> {
    const key = 'consignment_notes';
    const hit = this.getCachedCatalog(key);
    if (hit !== undefined) return hit;
    const data = await this.fetchCatalogPath('consignment_notes');
    this.setCachedCatalog(key, data);
    return data;
  }

  async getPackagingsCached(): Promise<unknown> {
    const key = 'packagings';
    const hit = this.getCachedCatalog(key);
    if (hit !== undefined) return hit;
    const data = await this.fetchCatalogPath('packagings');
    this.setCachedCatalog(key, data);
    return data;
  }
}

