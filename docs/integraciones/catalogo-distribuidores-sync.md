---
title: Integración automática de catálogos por distribuidor
description: Flujo técnico para sincronizar los catálogos externos (DMS) con el catálogo general de Agora y la disponibilidad por sucursal.
---

# 📄 Integración automática del catálogo general

Los distribuidores ya cargan y mantienen un catálogo maestro en sus DMS. En Agora ese catálogo es **global** (todos los negocios pueden verlo) y a nivel de sucursal se define manualmente disponibilidad, precios y stock desde el admin (ver `docs/20-sistema-catalogos-productos-avanzado.md`). Automatizar ese vínculo para múltiples distribuidores requiere un **punto medio controlado** que respete los datos maestros de Agora y permita auditoría, monitoreo y reconcilación ante errores.

Este documento describe la arquitectura técnica recomendada, los componentes principales (ingestión, staging, sincronización y monitoreo) y las buenas prácticas profesionales que se deben preservar antes de implementar cualquier código o migración.

## 1. Estado actual

1. Existe un catálogo global (`catalog.products`) que agrupa todos los productos de Agora.
2. El administrador establece **por sucursal**:
   - Si el producto está disponible (`is_available` / `stock`, `price`)
   - El precio específico y el inventario mostrado en la vista de sucursal (ver la UI de “Disponibilidad por distribuidor”).
3. Cada ajuste se hace de forma manual desde `web-admin`, lo cual no escala cuando un distribuidor administra miles de SKUs.

## 2. Objetivos de la integración

- Importar diariamente (o por evento) el catálogo que el distribuidor comparte vía endpoint, quedando un registro **inmutable** (payload bruto) para auditoría.
- Transformar ese catálogo por lotes para que Agora **cruce** cada SKU con su maestro y actualice/inserte las relaciones `producto ↔ sucursal`.
- Mantener **multidistribuidor**: la misma infraestructura debe servir para varios integradores con reglas aisladas y reintentos controlados.
- Garantizar **visibilidad de errores** y permitir reprocesar lotes sin afectar datos ya sincronizados correctamente.

## 3. Arquitectura propuesta

### 3.1 Flujo general

1. **Distribuidor envía catálogo** (JSON/CSV) al endpoint documentado en el backend (ej. `POST /integrations/distributors/:id/catalog`).
2. El servicio valida esquema mínimo (`sku`, `price`, `stock`, `branch_code` o `business_id` según contrato) y crea un registro en el staging.
3. Un job programado (cron o worker) ejecuta un stored procedure que:
   - Reconoce el catálogo maestro de Agora (`catalog.products`, `core.businesses`, o la tabla de relación actual).
   - Inserta o actualiza la disponibilidad por sucursal usando los datos del staging.
   - Marca el staging como procesado/failed y registra auditoría detallada.

### 3.2 Componentes principales

| Capa | Rol |
| --- | --- |
| API | Recibe payloads del DMS y almacena raw + metadata en staging. |
| Staging DB | Guarda cada fila con status (`pending`, `processed`, `failed`). |
| Procedimiento de sincronización | Cruza SKUs con Agora y actualiza las tablas `catalog.products` y `catalog.business_product_availability` (o la tabla equivalente real). |
| Monitoreo | Genera logs/agregados y alertas (errores de validación, discrepancias de stock). |

## 4. Modelo de datos sugerido (no ejecutar sin revisar `database/`)

> Antes de modificar cualquier tabla revisa toda la carpeta `database/`, especialmente `schema.sql`, `database/agora/` y `database/segments/`, siguiendo las reglas de `/.cursorrules`.

### 4.1 `integration.distributor_catalog_staging`

| Columna | Tipo | Descripción |
| --- | --- | --- |
| `id` | `UUID` | PK. |
| `distributor_id` | `UUID` | FK hacia tabla de distribuidores (registrada en `core.businesses` o `integration.distributors`). |
| `batch_id` | `UUID` | Permite agrupar un envío completo. |
| `sku` | `VARCHAR(100)` | SKU como lo reporta el distribuidor. |
| `branch_code` | `VARCHAR(50)` | Código de sucursal proporcionado. |
| `price` | `DECIMAL(10,2)` | Precio objetivo. |
| `stock` | `INTEGER` | Inventario. |
| `payload` | `JSONB` | Registro completo para auditoría. |
| `status` | `VARCHAR(30)` | `pending`, `processing`, `processed`, `failed`. |
| `error_message` | `TEXT` | Texto cuando `status = 'failed'`. |
| `inserted_at`, `processed_at` | `TIMESTAMP` | Timestamps. |

Agregar `UNIQUE(distributor_id, batch_id, sku, branch_code)` para evitar duplicados en el mismo lote si aplica.

### 4.2 `integration.distributor_config`

| Columna | Tipo | Descripción |
| --- | --- | --- |
| `id` | `UUID` | PK. |
| `distributor_id` | `UUID` | FK. |
| `sku_normalization_rule` | `JSONB` | Regla tipo `"prefix": "AG-", "strip": "-"`. |
| `price_adjustment` | `DECIMAL(10,2)` | Ajuste fijo o porcentaje a aplicar. |
| `branch_mapping` | `JSONB` | Ej: `{ "ext_branch_code": "core.businesses.id" }`. |
| `created_at`, `updated_at` | `TIMESTAMP` | Metadata. |

Define cómo transformar campos externos antes de cruzarlos con Agora. Permite aplicar reglas distintas por distribuidor sin cambiar código.

### 4.3 `integration.distributor_sync_logs`

| Columna | Tipo | Descripción |
| --- | --- | --- |
| `id` | `UUID` | PK. |
| `staging_id` | `UUID` | FK hacia staging. |
| `severity` | `VARCHAR(20)` | `info`, `warning`, `error`. |
| `message` | `TEXT` | Detalle. |
| `created_at` | `TIMESTAMP` | Marca temporal. |

Registra pasos del stored procedure (p. ej. “SKU no existe”, “Actualizado precio y stock”, “Falló por FK sales branch”).

## 5. Stored procedure / función SQL (descripción conceptual)

1. **Input:** `distributor_id`, `batch_id` (o `status = 'pending'`).
2. **Proceso:**
   - Leer staging en orden, bloquear filas (`FOR UPDATE SKIP LOCKED`) para evitar race conditions.
   - Normalizar SKU con la configuración (`sku_normalization_rule`).
   - Buscar `catalog.products` usando `sku` o un campo auxiliar (`external_sku`). Si no existe, marcar `failed`.
   - Buscar sucursal destino (`core.businesses`) usando `branch_code` y/o `branch_mapping`.
   - Insertar o actualizar la tabla de disponibilidad actual (p. ej. `catalog.business_products`):
     - `price = COALESCE(payload.price, staging.price)`
     - `stock = COALESCE(payload.stock, staging.stock)`
     - `is_available = TRUE`
     - `updated_at = NOW()`
   - Registrar resultado en `integration.distributor_sync_logs` y actualizar `status`.
3. **Errores comunes tratados:**
   - SKU no encontrado → `status = 'failed'`, mensaje “Producto no registrado”.
   - Sucursal desconocida → `status = 'failed'`, `branch_code` no mapeado.
   - Timeout / deadlock → reintentar `processing` con backoff.

La función puede devolver un resumen (num insertados, actualizados, fallidos) para que la API o job pueda reportar resultados.

## 6. Servicio NestJS / backend

1. **Controlador `distributor-sync.controller.ts`**
   - Endpoint `POST /integrations/distributors/:id/catalog`
   - Acepta `multipart/form-data` o JSON.
   - Valida esquema base (`sku`, `price`, `stock`, `branch_code`).
2. **Servicio `distributor-sync.service.ts`**
   - Inserta en staging y genera `batch_id`.
   - Normaliza campos usando `integration.distributor_config`.
   - Llama al stored procedure (`SELECT integration.sync_distributor_batch($1, $2)`).
   - Devuelve stats (procesados/fallidos).
3. **Jobs / workers**
   - Programados (ej. cada 10 min) para procesar lotes pendientes.
   - Pueden usar `pg_notify` para disparar el SP cuando llega nueva carga.
4. **Testing**
   - Mock de endpoint DMS (JSON de 200 registros).
   - Pruebas unitarias para validación de esquema y reglas de normalización.
   - Pruebas de integración para ejecutar el SP con datos de staging.

## 7. Multi-distribuidor y escalabilidad

- Cada distribuidor tiene su propio `integration.distributor_config`.
- El staging debe permitir `batch_id` consecutivos para que se puedan reprocesar por lotes.
- Usar `FOR UPDATE SKIP LOCKED` en el SP y limitaciones por página (ej. procesar 200 filas por ejecución) para evitar locks extensos.
- Controlar concurrencia: un job por distribuidor a la vez, con monitoreo de `processing_since`.
- Los campos `payload` y `status` permiten reintentar sin sobrescribir los datos originales.

## 8. Observabilidad y control

- **Logs:** Guardar en `integration.distributor_sync_logs` y opcionalmente en un topic (Elastic/Logstash) con structured logging.
- **Alertas:** Notificar si un lote completa con >10% de filas `failed` o si un SKU no se encuentra.
- **Dashboard interno:** Mostrar métricas por distribuidor (latencia, errores, throughput).
- **Auditoría:** Mantener `payload` y `batch_id` para rastrear cualquier actualización (cumple con políticas de trazabilidad).

## 9. Seguridad y permisos

1. El endpoint debe requerir autenticación con token (OAuth/ApiKey) propio del distribuidor.
2. Validar `distributor_id` vs. claims del token (solo puede subir su catálogo).
3. No permitir que un distribuidor actualice catálogos de otro.
4. Registrar el origen de cada lote (`created_by`, `source_ip`).

## 10. Rollout y pruebas

1. Empezar con un **distribuidor piloto** para validar transformaciones y timeouts.
2. Ejecutar pruebas de regresión sobre:
   - CRUD de catálogos existentes.
   - Disponibilidad manual (para asegurar que la lógica existente no se rompe).
   - API de sincronización (mock DMS).
3. Simular errores: SKU inexistente, sucursal no mapeada, payload malformado, DB deadlocks.
4. Documentar en el área de operaciones cómo reenviar un lote fallido (`UPDATE integration.distributor_catalog_staging SET status = 'pending' WHERE batch_id = ?`).

## 11. Próximos pasos

1. Mapear las tablas actuales que representan la relación `producto ↔ sucursal` dentro de `database/schema.sql` para determinar la tabla exacta que debe actualizarse.
2. Definir el contrato JSON/CSV del endpoint DMS con el distribuidor piloto.
3. Diseñar las migraciones (staging + config + logs) respetando el formato de encabezado y notas del equipo.
4. Crear el servicio NestJS que recibe cargas y dispara el SP.
5. Agregar este documento a la sección de integraciones (`docs/integraciones/`) para que sea referencia futura.

---

**Documentación relacionada:**  
 - [`docs/20-sistema-catalogos-productos-avanzado.md`](../20-sistema-catalogos-productos-avanzado.md)
 - `database/schema.sql` (esquema base de catálogos y negocios)  
 - `apps/backend/src/modules/catalog` (servicios de productos)  
 - `apps/backend/src/modules/businesses` (mapeos de sucursales)  
 - `apps/web-admin` (UI de disponibilidad)  

