# Agente: GRIANT — Feature desde especificación (base → backend → front)

**Nombre:** **GRIANT** (Grijalva + Antonio)

**Uso:** Cuando pidas mediante **GRIANT** — *"usa GRIANT para [X]"*, *"mediante GRIANT quiero [X]"* — el agente puede **definir** (reglas, módulo, funcionamiento) antes de desarrollar y/o **implementar** todas las capas (base de datos → backend → frontend), manteniendo siempre el contexto **multi-tienda** (global, grupo, sucursal, marca). Usa este documento como instrucción estable para ese flujo.

---

## 1. Objetivo del agente

- **Entrada:** Una descripción breve de la funcionalidad (especificación o user story).
- **Salida:** Según lo que pidas: **definición** (reglas, módulo, comportamiento) y/o **implementación** completa en orden: base de datos → backend → frontend (y, si aplica, documentación).
- **Regla:** En cada capa, **siempre** considerar los cuatro contextos de tienda; no asumir "una sola tienda".

### 1.1 Definir antes de desarrollar

GRIANT sirve también para **definir** un módulo o un funcionamiento **antes** de codificar. Cuando pidas *"mediante GRIANT define [módulo/reglas/funcionamiento]"*, el agente debe producir una **especificación** (sin implementar todavía), por ejemplo:

- **Reglas de negocio:** qué puede y no puede hacer el módulo, validaciones, permisos.
- **Base de datos:** qué tablas, columnas o cambios se necesitan (schema, relaciones).
- **Backend:** qué endpoints, qué DTOs, qué filtros (p. ej. por sucursal, grupo, marca).
- **Frontend:** en qué app(s) va la UI (web-admin, web-local, store-front) y qué pantallas o flujos.
- **Multi-tienda:** en qué nivel(es) aplica (global, grupo, sucursal, marca).

Con esa definición escrita, luego puedes pedir: *"Usa GRIANT para implementar según lo que definimos"* o *"Implementa lo definido para [módulo]."* También puedes pedir en un solo paso: *"Mediante GRIANT define e implementa [X]."*

---

## 2. Contexto obligatorio: multi-tienda (siempre explícito)

En AGORA existen **cuatro niveles de tienda**. Toda feature que toque productos, pedidos, carrito, precios, stock, listados o navegación debe decidir **en qué nivel(es) aplica** y mantenerlo escrito y consistente.

| Nivel       | Descripción breve | ¿Múltiples? | Dónde se refleja |
|------------|--------------------|-------------|-------------------|
| **Global** | Tienda que muestra todo (todas las sucursales). Sin filtro por grupo/sucursal/marca. | No (uno solo) | Rutas sin prefijo (`/products`, `/cart`). |
| **Grupo**  | Grupo empresarial; agrupa varias sucursales. Filtra productos y búsquedas por grupo. | Sí | URL `/grupo/{slug}`. BD: `core.business_groups`. |
| **Sucursal** | Tienda/sucursal concreta (ej: Toyota Satélite). Productos, precios y stock por sucursal. | Sí | URL `/sucursal/{slug}`. BD: `core.businesses` (con `business_group_id` opcional). |
| **Marca**  | Marca de vehículo (Toyota, Nissan). Filtra productos compatibles con esa marca. | Sí | URL `/brand/{code}`. BD: `catalog.vehicle_brands`. |

**Reglas que el agente debe aplicar en cada capa:**

1. **Base de datos**  
   - Si la entidad es por negocio/tienda: usar `business_id` (sucursal) y, si aplica, `business_group_id` o relación con `catalog.vehicle_brands`.  
   - Revisar `database/schema/schema.sql`, `database/agora/`, `.cursorrules` (convenciones, tipos, prefijos de schema).

2. **Backend**  
   - APIs que devuelvan o filtren por tienda: soportar **global** (sin filtro), **grupo** (por `business_group_id`), **sucursal** (por `business_id`), **marca** (por `vehicle_brand_id` / compatibilidad) según el caso.  
   - Pedidos: siempre asociados a una sucursal (`orders.orders.business_id`); guardar `store_context` para el enlace en correo (ver agente de tiendas).

3. **Frontend (store-front)**  
   - Usar **StoreContext** y rutas con prefijo cuando no sea global: `/grupo/{slug}/...`, `/sucursal/{slug}/...`, `/brand/{code}/...`.  
   - Enlaces: `getContextualUrl()` o `ContextualLink`.  
   - Checkout: enviar `storeContext` y persistir en `orders.orders.store_context`.

4. **Documentación**  
   - Dejar escrito en qué nivel(es) aplica la feature (global, grupo, sucursal, marca) y actualizar `docs/INDEX.md` o `database/INDEX.md` si se añaden scripts o docs nuevos.

**Referencia detallada de multi-tienda:** siempre usar como base **`docs/agentes/01-multitienda-contexto-global-grupo-sucursal.md`** (tablas, URLs, StoreContext, checkout, `store_context`).

---

## 3. Orden de ejecución (capas)

El agente debe seguir este orden y no saltar capas:

1. **Base de datos**  
   - Proponer o crear migraciones/scripts en `database/` (schema, migrations, seeds según corresponda).  
   - Encabezado y estructura de scripts según `.cursorrules` (título, descripción, versión, fecha, hora, notas).  
   - Revisar `database/INDEX.md` para no duplicar y para ubicar scripts relacionados.

2. **Backend (NestJS)**  
   - Módulos, servicios, controladores, DTOs.  
   - Queries con prefijo de schema (`core.`, `catalog.`, `orders.`, etc.).  
   - Tipos alineados con el schema (UUID→string, DECIMAL→number, JSONB→interface, POINT→{longitude, latitude}).  
   - Si la feature implica "tienda": soporte explícito para global / grupo / sucursal / marca en filtros y respuestas.

3. **Frontend**  
   - **Decidir en qué app(s) va la UI** según el agente **Apps** (`docs/agentes/05-apps-tres-fronts-backend.md`): **web-admin** (gestión del sitio AGORA), **web-local** (gestión de una tienda), **store-front** (tienda cliente). Una feature puede tocar una o más apps.  
   - **Store-front:** rutas con contexto (getContextualUrl, ContextualLink), datos cargados según tipo de tienda (grupo/sucursal/marca).  
   - **Web-admin / web-local:** si aplica; botones principales negros (regla del proyecto).  
   - Interfaces TypeScript alineadas con DTOs/schema.

4. **Documentación e índice**  
   - Actualizar o crear docs en `docs/` (features, store-front, agentes) y, si se añaden scripts SQL, entradas en `database/INDEX.md` o `docs/INDEX.md`.

---

## 4. Checklist rápido por feature

Antes de dar por cerrada una implementación, el agente debe comprobar:

- [ ] **Multi-tienda:** ¿Quedó escrito y cumplido en qué nivel aplica (global, grupo, sucursal, marca)? ¿Rutas, filtros y `store_context` coherentes?
- [ ] **BD:** ¿Schema prefix en queries? ¿Convenciones de nombres y tipos (.cursorrules)? ¿Scripts con encabezado obligatorio?
- [ ] **Backend:** ¿DTOs y tipos alineados con el schema? ¿Filtros por grupo/sucursal/marca cuando toque?
- [ ] **Frontend:** ¿Se definió en qué app(s) va la UI (web-admin, web-local, store-front) según agente Apps? ¿StoreContext y URLs contextuales en store-front cuando no sea global? ¿Enlace "Ver detalle" del pedido usa `store_context`?
- [ ] **Docs/índice:** ¿Alguna doc o script nuevo reflejado en INDEX o en README?

---

## 5. Cómo invocar este agente

En el chat, pide mediante **GRIANT** y la especificación. Ejemplos:

**Solo definir (antes de desarrollar):**
- *"Mediante GRIANT define el módulo de [X]: reglas, endpoints, pantallas."*
- *"Usa GRIANT para definir las reglas y el funcionamiento de [reportes de ventas] antes de desarrollar."*

**Definir e implementar:**
- *"Mediante GRIANT define e implementa [X]."*

**Solo implementar:**
- *"Usa GRIANT para [X]."* — p. ej. *"Usa GRIANT para reporte de ventas por sucursal y rango de fechas."*
- *"Mediante GRIANT quiero [descripción]; no olvides el contexto multi-tienda (global, grupo, sucursal, marca)."*
- *"GRIANT: implementa según lo que definimos para [módulo]."*

El ejecutor (IA o desarrollador) debe cargar este documento, **`01-multitienda-contexto-global-grupo-sucursal.md`** y **`05-apps-tres-fronts-backend.md`** como contexto base antes de implementar (sobre todo en la capa frontend).

---

## 6. Referencias

- Multi-tienda (obligatorio): [01-multitienda-contexto-global-grupo-sucursal.md](./01-multitienda-contexto-global-grupo-sucursal.md)
- Tres fronts y backend (cuándo tocar web-admin, web-local, store-front): [05-apps-tres-fronts-backend.md](./05-apps-tres-fronts-backend.md)
- Convenciones BD y scripts: `.cursorrules`, `database/README.md`, [database/INDEX.md](../../database/INDEX.md)
- Store-front y contexto: `docs/store-front/01-resumen-solucion-contexto.md`, `02-contexto-navegacion-mini-tienda.md`, `03-ejemplos-implementacion-contexto.md`
- Checkout multi-sucursal: `docs/features/12-proceso-checkout-multi-sucursal.md`
