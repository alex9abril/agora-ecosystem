/**
 * Servicio para integración con Skydropx
 * Maneja cotizaciones y creación de envíos
 */

import {
  Injectable,
  ServiceUnavailableException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { IntegrationsService } from '../../settings/integrations.service';
import axios from 'axios';

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

interface CachedToken {
  access_token: string;
  expires_at: number; // Timestamp en milisegundos
  token_type: string;
}

@Injectable()
export class SkydropxService {
  private readonly logger = new Logger(SkydropxService.name);
  private tokenCache: CachedToken | null = null; // Cache del token OAuth

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
              estimated_delivery: rate.estimated_delivery || undefined,
              estimated_days: days,
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
        fullResponse: JSON.stringify(response.data, null, 2),
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
          // Buscar tracking_number en las ubicaciones correctas
          // 1. master_tracking_number en attributes (ubicación principal según estructura de Skydropx)
          // 2. tracking_number en attributes (fallback)
          const trackingNumber = 
            attributes.master_tracking_number ||
            attributes.tracking_number || 
            pollData.tracking_number || 
            null;
          
          // Buscar label_url en las ubicaciones correctas
          // 1. En included[0].attributes.label_url (ubicación principal según estructura de Skydropx)
          // 2. En attributes.label_url (fallback)
          const included = pollResponse.data.included || pollData.included || [];
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
      
      return {
        id: finalData.id || finalAttributes.id,
        tracking_number: finalAttributes.tracking_number || null,
        label_url: finalAttributes.label_url || null,
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
}

