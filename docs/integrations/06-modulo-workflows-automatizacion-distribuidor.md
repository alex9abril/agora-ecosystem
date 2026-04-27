---
title: Módulo de workflows de automatización (ingesta por distribuidor)
description: Especificación del motor de flujos propio, inspirado en n8n pero ligero, para conectar orígenes heterogéneos (API, SQL, etc.) hacia Agora, con UI en web-local y alcance por sucursal/distribuidor.
---

# Módulo de workflows de automatización (por distribuidor / sucursal)

## 1. Propósito

Centralizar la **ingesta y transformación** de datos de los sistemas de los clientes (DMS, ERP, SQL expuesto, APIs propias) hacia las tablas de Agora asociadas a cada **distribuidor**, de forma **repetible y configurable**, sin acoplar la lógica de negocio principal a cada variante de integración.

El objetivo inmediato es soportar escenarios reales: credenciales **MSSQL** con acceso desde el servidor de Agora, y en el futuro **APIs REST** con distintas formas de autenticación, webhooks, u orígenes adicionales. El destino lógico sigue alineado con la [sincronización de catálogo por distribuidor](./01-catalogo-distribuidores-sync.md) y con el [modelo tienda / distribuidor](../contexto-trabajo/03-tiendas-y-distribuidores.md).

## 2. Aclaración importante: no es n8n

- La **interfaz y el modelo mental** (flujos, nodos, disparadores) se inspiran en productos como **n8n** para agilidad operativa.
- El **producto** es un **motor de workflows propio**, más **lite**, acotado a casos de automatización de Agora (ingesta, mapeo, escritura a destino), con menos superficie que un orquestador genérico.
- **n8n no es una dependencia** de runtime; no se despliega n8n como servicio requerido del ecosistema. Si en algún momento se evalúa reutilizar herramientas externas, sería una decisión explícita y documentada aparte.

## 3. Unidad de configuración: sucursal = distribuidor

En el dominio de negocio de Agora, **“sucursal” y “distribuidor”** pueden referirse al mismo actor según el contexto (misma entidad, distinto nombre). La configuración de workflows, credenciales, mapeos y conectores es **siempre por esa unidad** (el punto de surtido / almacén con el que se integra).

Implicaciones:

- No hay un “flujo global” mezclando datos de dos distribuidores sin contexto: el **ámbito** de cada flujo y su ejecución queda **vinculado a la sucursal/distribuidor activa** en la sesión.
- Los datos ingeridos deben **aterrizar** en el conjunto de tablas o vistas que corresponde a ese distribuidor (o a staging con `distributor_id` / equivalente, según el esquema acordado).

## 4. Ubicación en el producto (web-local)

| Aspecto | Detalle |
| --- | --- |
| **App** | `apps/web-local` (panel del negocio / tienda local). |
| **Navegación** | Sección de **Configuración** (misma área que Tienda, Sucursales, Monedero, etc.), implementada hoy con `LocalLayout` y la rejilla de tarjetas en `apps/web-local/src/pages/settings/index.tsx`. |
| **Nuevo acceso** | Una **tarjeta** adicional en la rejilla (`grid` de tarjetas de configuración), coherente con el resto de módulos (título, descripción, enlace a una ruta dedicada, p. ej. `/settings/integrations-workflows` — nombre final a definir al implementar). |
| **Alcance de sucursal** | Toda la gestión (listar flujos, editar, probar, ver historial) depende de la **sucursal seleccionada** en el encabezado. El componente de selector de sucursal es `BranchDropdown` (`apps/web-local/src/components/layout/BranchDropdown.tsx`), usado en `Topbar`. Si el usuario cambia de sucursal, el contexto del módulo debe reflejar solo los workflows y secretos de **esa** sucursal/distribuidor. |
| **Permisos** | Al alinear con el resto de Configuración, deberá integrarse con el modelo de permisos de operador / superadmin (p. ej. `SettingsKey` y tarjetas visibles en `canShowCard`), de forma análoga a otras entradas sensibles. |

> **Nota de implementación:** Hasta que exista la página y la API, este apartado actúa como **contrato de producto** para frontend y backend.

## 5. Modelo funcional del motor (visión “tipo n8n” lite)

### 5.1 Workflow

- Un **workflow** es un grafo dirigido de **nodos** con al menos un **disparador** (trigger) y uno o más pasos que terminan en un **destino** de datos hacia Agora.
- Cada workflow está asociado a **un** contexto de distribuidor/sucursal (el seleccionado al crearlo o el inferido por la API).

### 5.2 Disparadores (triggers)

- **Webhook:** URL y método configurables; validación de autenticación (token, firmas, etc.) acorde a la política de seguridad.
- **Manual / “Ejecutar ahora”:** desde la UI o API (`POST .../workflows/:id/run`), para pruebas y reejecuciones. El historial usa `trigger_type = manual`.
- **Programado (cron en servidor):** el nodo `triggerSchedule` guarda `data.cron` (expresión compatible con el parser del backend). Si el flujo está **activo** (`is_enabled`), el proceso Nest evalúa candidatos **cada minuto** y ejecuta los que coinciden con el minuto actual.
  - **Activación:** variable de entorno `INTEGRATION_WORKFLOW_SCHEDULE_ENABLED=true` en el backend.
  - **Zona horaria del cron:** `WORKFLOW_SCHED_TZ` (IANA, p. ej. `America/Mexico_City`); si no se define, se usa `UTC`. Debe alinearse con lo que los operadores esperan de las horas configuradas en la UI.
  - **Granularidad:** un minuto; no se garantizan sub-minutos.
  - **Idempotencia:** como mucho un run con `trigger_type = schedule` por flujo y por minuto de reloj del servidor de base de datos (`date_trunc('minute', CURRENT_TIMESTAMP)` en la deduplicación).
  - **Implementación:** `IntegrationWorkflowsScheduler` + `IntegrationWorkflowsService.runWorkflowScheduledJob` en `apps/backend/src/modules/integration-workflows/`.

### 5.3 Tipos de nodos previstos (evolutivo)

| Tipo (concepto) | Rol |
| --- | --- |
| Conector **HTTP / REST** | Llamadas a APIs externas; autenticación (API key, Basic, OAuth2, etc.) parametrizable por config almacenada de forma segura. |
| Conector **SQL (p. ej. MSSQL)** | Lectura desde base del cliente (preferiblemente vistas o usuario de solo lectura); conexión desde infraestructura autorizada. |
| **Transformación / código** | Nodos de script o expresión para mapeo campo a campo, con uso acotado (preferir mapeo declarativo cuando sea posible). |
| **Destino Agora** | Inserción/actualización en tablas de staging o destino acordado para el distribuidor, con reglas de idempotencia. |

La lista es **extensible** mediante **conectores reutilizables** mantenidos por el equipo, no un plugin marketplace abierto en la primera versión.

### 5.4 Conectores como bloques reutilizables

Un **conector** encapsula: autenticación, límites, reintentos mínimos y el contrato hacia el origen. Ejemplos: “API con Bearer”, “MSSQL con string de conexión en almacén de secretos”. Los flujos **componen** conectores y transformaciones, en lugar de duplicar lógica por cliente en el monolito.

## 6. Flujo de datos hacia el catálogo y tiendas

1. **Ingesta** por workflow → datos crudos o normalizados en **staging** / tablas de integración con identificador de distribuidor.
2. **Proceso posterior** (job o pipeline existente) que cruza con el [catálogo maestro de Agora](../features/05-sistema-catalogos-productos-avanzado.md) y con la disponibilidad por sucursal, según [Integración de catálogo por distribuidor](./01-catalogo-distribuidores-sync.md).

El módulo de workflows se enfoca en el paso (1); el (2) puede compartir diseño con el documento de staging y sync ya descrito.

## 7. Principios no funcionales

- **Seguridad:** secretos fuera de código y fuera del JSON del flujo en claro; cifrado o vault según el estándar del backend; principio de menor privilegio en SQL (solo lectura en orígenes del cliente).
- **Idempotencia y auditoría:** claves de negocio para upsert; registro de ejecuciones (éxito, error, payload referencial) por sucursal.
- **Operabilidad:** logs consultables, reintentos con backoff, posibilidad de reejecutar o marcar lotes en fallo.
- **Simplicidad:** evitar que el nodo de código reemplace la política; preferir mapeo declarativo y conectores compartidos.

## 8. Relación con otros documentos

| Documento | Relación |
| --- | --- |
| [01-catalogo-distribuidores-sync.md](./01-catalogo-distribuidores-sync.md) | Staging, API de carga, jobs de sync hacia catálogo/disponibilidad. |
| [03-tiendas-y-distribuidores.md](../contexto-trabajo/03-tiendas-y-distribuidores.md) | Definición de tienda vs distribuidor. |
| [01-multitienda-contexto-global-grupo-sucursal.md](../agentes/01-multitienda-contexto-global-grupo-sucursal.md) | Contexto de sucursal y multi-tienda. |
| [Sistema de catálogos avanzado](../features/05-sistema-catalogos-productos-avanzado.md) | Modelo de productos y disponibilidad. |

## 9. Estado del documento

Especificación de **diseño y producto** para alinear a ingeniería, producto y operaciones.

**Última actualización:** implementación v1 (motor propio, sin n8n; UI en web-local por sucursal).

## 10. Implementación (v1) — resumen técnico

### 10.1 Base de datos (PostgreSQL / Supabase)

- **Script:** [`database/agora/migration_integration_workflows.sql`](../../database/agora/migration_integration_workflows.sql) crea el esquema `integration` y:
  - `integration.connector_types` — catálogo (`mssql` activo, `http_rest` planificado).
  - `integration.connectors` — instancia por `business_id` (sucursal), `config` JSONB no sensible, `password_ciphertext` para la contraseña cifrada en backend.
  - `integration.workflows` — `definition` JSONB (nodos y aristas compatibles con **@xyflow/react** en el front).
  - `integration.workflow_runs` — historial de ejecuciones (`manual` en v1).
- **RLS:** políticas basadas en `core.business_users` y `auth.uid()` para `authenticated`. El API Nest usa el pool con rol que hace bypass de RLS según el despliegue.
- **Seed de ejemplo:** [`database/seeds/seed_integration_workflows_demo.sql`](../../database/seeds/seed_integration_workflows_demo.sql) (requiere al menos un `core.businesses`; opcionalmente el UUID de pruebas de productos).

### 10.2 Backend (NestJS)

- **Módulo:** `apps/backend/src/modules/integration-workflows/`
- **Rutas bajo** ` /api/businesses/:businessId/integration/…` (prefijo global `api`): `connector-types`, `connectors` (CRUD), `workflows` (CRUD), `workflows/:id/run` (POST, disparo manual), `workflows/:id/runs` (listado).
- **Driver MSSQL:** dependencia `mssql` (conexión solo desde el servidor; timeouts acotados; resultados limitados a 1000 filas en la capa de ejecución v1).
- **Cifrado de contraseñas:** variable de entorno `WORKFLOW_CONNECTOR_ENCRYPTION_KEY` (Base64 de **32 bytes**). Ejemplo: `openssl rand -base64 32`. Sin ella, crear conector con contraseña falla de forma controlada.
- **v1 / alcance:** sin webhooks de entrada o salida; flujo de ejecución **lineal** validado en backend (un camino desde el nodo de disparo).

### 10.3 Front (web-local)

- **Rutas:** `/settings/integrations-workflows` (listado, pestañas Flujos / Conectores), `/settings/integrations-workflows/[id]` (editor con lienzo).
- **UI de grafo:** `@xyflow/react` con nodos `triggerManual`, `triggerSchedule`, `connectorMssql`, `sinkLog` y `httpPlaceholder` (solo visual, no operativo).
- **Permisos de operador:** clave `branches_integrations_workflows` en `apps/web-local/src/lib/operator-permissions.ts` y visibilidad de tarjeta vía `canShowCard` en `settings/index.tsx`.

### 10.4 Disparadores (triggers) en v1

- **Manual:** `POST .../workflows/:id/run` y botón “Ejecutar” en el editor.
- **Webhook y callbacks a terceros:** no implementados.
- **Cron interno (programado):** nodo y datos permitidos; el scheduler todavía no dispara en background (misma ejecución que manual cuando se añada el worker).
