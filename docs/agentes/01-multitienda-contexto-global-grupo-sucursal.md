# Agente: Funcionamiento de las tiendas (multi-contexto)

**Nombre corto:** **MultiTienda**

**Uso:** Cuando trabajes en temas de tiendas, sucursales, grupo, marca o tienda global, parte de este documento como contexto. Incluye antecedente en base de datos y en documentación.

---

## 0. Tienda vs distribuidor (definición de concepto)

- **Tienda** = **canal de venta**: dónde el cliente compra (URL, branding, carrito, checkout). Modelado en **`core.stores`**.
- **Distribuidor** = **quien tiene el producto en almacén** y surte el pedido (fulfillment). Puede **no tener tienda propia** y estar **montado en otra tienda o en varias**: vende a través del canal de otra(s) tienda(s).

Definición completa y relación tienda ↔ distribuidor: **`docs/contexto-trabajo/03-tiendas-y-distribuidores.md`**.

---

## 1. Los 5 tipos de tienda (canales de venta)

El marketplace tiene **cinco tipos de canal de venta** ("tiendas"). Cada uno es un contexto desde el que se puede vender; **quien surte el pedido (fulfillment) es el distribuidor** (en el modelo actual, la sucursal: `orders.business_id`).

| Tipo            | Prefijo URL (store-front)     | Descripción breve | Gestión |
|-----------------|-------------------------------|-------------------|---------|
| **Global**      | Sin prefijo (`/`)             | Agora: todo el catálogo. No se gestiona en web-local. | web-admin |
| **Grupo**       | `/grupo/{slug}`               | Tienda por grupo/corporativo. Productos del grupo. | web-local |
| **Sucursal**    | `/sucursal/{slug}`            | Tienda (canal) por sucursal; el distribuidor que surte puede ser esa sucursal u otro montado en esta tienda. | web-local |
| **Grupo+marca** | `/grupo/{slug}/marca/{code}`  | Varias sucursales del mismo grupo, una marca. Multimarca. | web-local |
| **Marca global**| `/brand/{code}`               | Tienda global por marca (todas las sucursales que venden esa marca). | No en web-local (cuenta marca) |

- **Global:** no se agrega prefijo a las rutas (`/products`, `/cart`, `/orders`, etc.).
- **Grupo, Sucursal, Marca:** las rutas internas llevan el prefijo del contexto (ej: `/sucursal/toyota-satelite/products`, `/grupo/grupo-andrade/cart`, `/brand/nissan/products`).
- Los **canales** están modelados en la tabla **`core.stores`**; al generar el pedido se guarda el canal en **`orders.orders.store_id`** y la ruta en **`orders.orders.store_context`**.

---

## 2. Relación entre tipos (jerarquía y datos)

- **Global** no es una fila en BD: es "sin filtro" de grupo/sucursal/marca.
- **Grupo** → tabla `core.business_groups`. Tiene varias **sucursales** (`core.businesses` con `business_group_id` apuntando al grupo).
- **Sucursal** → tabla `core.businesses`. Cada fila es una tienda/sucursal; puede tener `business_group_id` (pertenece a un grupo).
- **Marca** → tabla `catalog.vehicle_brands` (marcas de vehículos: Toyota, Nissan, etc.). El contexto "marca" en el store filtra por compatibilidad de productos con esa marca (catálogo/vehículos).

Resumen:
- Varios **grupos** (grupos empresariales).
- Varias **sucursales** por grupo (o sucursales sin grupo).
- Varias **marcas** de vehículos.
- Un solo contexto **global** que no filtra por grupo/sucursal/marca.

---

## 3. Base de datos (antecedente)

### 3.1 Tablas principales

- **`core.business_groups`**  
  Grupos empresariales (distribuidor/grupodealer).  
  Campos relevantes: `id`, `owner_id`, `name`, `legal_name`, `slug` (único, para URL), `logo_url`, `website_url`, `is_active`, `settings` (JSONB).

- **`core.businesses`**  
  Sucursales/negocios (cada tienda física o lógica).  
  Campos relevantes: `id`, `owner_id`, `name`, `slug` (único, para URL), `business_group_id` (FK a `core.business_groups`, nullable), `description`, `logo_url`, `location` (POINT), `is_active`, `accepts_orders`, `address_id`, `opening_hours` (JSONB).  
  Migraciones añaden, entre otros: `slug`, `accepts_pickup`, `business_group_id` (en `database/agora/migration_business_groups.sql` y asignación de sucursales al grupo).

- **`catalog.vehicle_brands`**  
  Marcas de vehículos (Nissan, Toyota, etc.).  
  Campos: `id`, `name`, `code` (para URL, ej: `nissan`), `display_order`, `is_active`.  
  Relacionada con compatibilidad de productos (vehicle_models, product_vehicle_compatibility, etc.) en `database/agora/migration_vehicle_compatibility.sql` y schema de catálogo.

- **`core.stores`**  
  **Tiendas** = canales de venta (una fila por tienda/canal). No confundir con distribuidor: la tienda es dónde se vende; el distribuidor es quien tiene el producto en almacén (puede no tener tienda propia y estar montado en una o más tiendas).  
  Campos: `id`, `type` ('global' | 'group' | 'branch' | 'group_brand' | 'global_brand'), `business_group_id`, `business_id`, `vehicle_brand_id` (según tipo), `slug`, `name`, `is_active`, `archived_at`, `settings` (JSONB).  
  Migración: `database/agora/migration_stores.sql`, `migration_stores_archived_at.sql`. Seed: `database/agora/seed_stores_from_groups_branches_brands.sql`.

- **Pedidos y canal de venta**  
  - `orders.orders`: cada pedido tiene `business_id` (sucursal que surte / fulfillment).  
  - `orders.orders.store_id` (UUID, nullable, FK a `core.stores`): canal de venta desde el que se realizó el pedido.  
  - `orders.orders.store_context` (TEXT, nullable): ruta de contexto (ej: `/sucursal/toyota-satelite`, `/grupo/grupo-andrade`) para construir en el correo el enlace "Ver detalle" a la misma tienda.  
  Migraciones: `database/agora/migration_add_store_context_to_orders.sql`, `database/agora/migration_orders_store_id.sql`.

- **Carrito multi-sucursal**  
  - `orders.shopping_cart`, `orders.shopping_cart_items`.  
  - Items con `branch_id` (sucursal). En checkout se crea **una orden por sucursal** y se relacionan con `order_group_id`.  
  Ref: `docs/features/12-proceso-checkout-multi-sucursal.md`, `database/migrations/migration_add_order_group_id.sql`, `database/migrations/migration_add_branch_id_to_cart_items.sql`.

### 3.2 Schemas y convenciones

- Entidades de negocio/tienda: **`core`** (business_groups, businesses, addresses, business_users, etc.).
- Catálogo (productos, categorías, marcas de vehículos, compatibilidad): **`catalog`**.
- Pedidos, ítems, carrito: **`orders`**.
- Antes de proponer cambios en tablas o columnas, revisar `database/schema/schema.sql`, `database/agora/`, `database/migrations/` y reglas en `.cursorrules` (convenciones, tipos, nombres).

---

## 4. Store-front (navegación y contexto)

- **Contexto:** `apps/store-front/src/contexts/StoreContext.tsx`.  
  - `StoreContextType = 'global' | 'grupo' | 'sucursal' | 'brand'`.  
  - Detecta el contexto por la URL: `/grupo/{slug}`, `/sucursal/{slug}`, `/brand/{code}`, o sin prefijo/`/global` → global.

- **URLs con contexto:**  
  - `getContextualUrl(path)`: si el contexto no es global, devuelve `/{contextType}/{slug}${path}` (ej: `/sucursal/toyota-satelite/orders`).  
  - Si es global, no se agrega prefijo.

- **Datos cargados según contexto:**  
  - Grupo: `businessGroupsService.getGroupBySlug(slug)` → `groupData`, `groupId`.  
  - Sucursal: `branchesService.getBranchBySlug(slug)` → `branchData`, `branchId` (y opcionalmente `groupId` si tiene `business_group_id`).  
  - Marca: `vehicleBrandsService.getBrandByCode(code)` → `brandData`, `brandId`.

- **Links y rutas:**  
  - Usar `ContextualLink` o `getContextualUrl()` para que productos, carrito, checkout, órdenes y "Ver detalle" del correo mantengan el mismo contexto (sucursal, grupo, marca o global).

- **Checkout, store_context y store_id:**  
  - Al hacer checkout se envía `storeContext` (ej: `/grupo/toyota-group` o `/sucursal/toyota-satelite`) y opcionalmente `storeId`.  
  - Se persiste en `orders.orders.store_context` (ruta) y en `orders.orders.store_id` (FK a `core.stores` cuando existe); el backend resuelve `store_id` desde `storeContext` si no se envía `storeId`.  
  - Se usa para construir la URL del botón "Ver detalle del pedido" en el correo (mismo contexto de tienda).

Documentación detallada:  
- `docs/store-front/01-resumen-solucion-contexto.md`  
- `docs/store-front/02-contexto-navegacion-mini-tienda.md`  
- `docs/store-front/03-ejemplos-implementacion-contexto.md`

---

## 5. Backend (APIs y filtrado)

- **Sucursales:** servicios/controllers bajo `apps/backend` que usan `core.businesses` (por id o por slug). Ej: obtener sucursal por slug, productos por sucursal, precios/stock por `business_id`/branch.
- **Grupos:** APIs que usan `core.business_groups` (por slug, por id) y listan sucursales del grupo.
- **Marcas:** catálogo y compatibilidad con `catalog.vehicle_brands`; endpoints que filtran productos por marca de vehículo cuando el contexto es "brand".
- **Pedidos:**  
  - Siempre asociados a una sucursal (`orders.orders.business_id` = fulfillment).  
  - `orders.store_id` identifica el canal de venta; `store_context` conserva la ruta para el correo.  
  - Si existe `store_context`, se usa para generar la URL de "Ver detalle" en el correo (mismo tipo de tienda: sucursal, grupo, marca o global).
- **Tiendas (canales):** módulo `StoresModule` en backend: `GET /stores` (filtros por tipo, grupo, etc.), `GET /stores/by-path?path=...`, `GET /stores/:id`, `PATCH /stores/:id`. Resolución de `store_id` desde path en checkout.

---

## 6. Resumen rápido para el agente

- **Tienda** = canal de venta (`core.stores`). **Distribuidor** = quien tiene producto en almacén y surte; puede no tener tienda propia y estar montado en una o más tiendas (ver `docs/contexto-trabajo/03-tiendas-y-distribuidores.md`).
- **5 tipos de tienda (canales):** global, grupo, sucursal, grupo+marca, marca global. Fulfillment (distribuidor) en el modelo actual es la sucursal (`orders.business_id`).
- **BD:** `core.stores` (canales de venta), `core.business_groups`, `core.businesses` (con `business_group_id` y `slug`), `catalog.vehicle_brands` (code para URL), `orders.orders.store_id` (canal) y `orders.orders.store_context` (ruta para correo).
- **URLs:** global sin prefijo; grupo `/grupo/{slug}`; sucursal `/sucursal/{slug}`; marca `/brand/{code}`; grupo+marca `/grupo/{slug}/marca/{code}` (fase 2 en store-front).
- **Store-front:** StoreContext + getContextualUrl + ContextualLink; checkout envía storeContext (y opcionalmente storeId); backend guarda `store_id` y `store_context` en el pedido.
- **Al implementar o cambiar algo de "tiendas":** mantener esta jerarquía, prefijos y convenciones de BD; si tocas rutas o correos, seguir usando `store_context`; para reportes y atribución usar `store_id`.

---

## 7. Reglas de gestión, cuentas y fulfillment

Para **quién gestiona qué**, **cuentas** (grupo vs marca vs global), **fulfillment** (siempre sucursal; sucursal = una marca) y **visibilidad de ventas**, ver la definición:

- **`docs/contexto-trabajo/02-multitienda-reglas-gestion-y-fulfillment.md`**

Resumen: el grupo gestiona solo branding grupo y sucursal; la tienda por **marca** la gestiona una **cuenta distinta** (corporativo/planta de la marca). Quien realiza la venta es siempre la sucursal; la tienda global aplica un pequeño porcentaje a los precios.

---

## 8. Documentación y DB de referencia

- **Tiendas vs distribuidores:** `docs/contexto-trabajo/03-tiendas-y-distribuidores.md`.
- Docs: `docs/store-front/01-resumen-solucion-contexto.md`, `02-contexto-navegacion-mini-tienda.md`, `03-ejemplos-implementacion-contexto.md`, `docs/features/12-proceso-checkout-multi-sucursal.md`, `docs/features/03-roles-negocio-multi-tiendas.md`.
- DB: `database/schema/schema.sql`, `database/agora/migration_business_groups.sql`, `database/agora/migration_branch_fields.sql`, `database/agora/migration_vehicle_compatibility.sql`, `database/agora/migration_stores.sql`, `database/agora/migration_orders_store_id.sql`, `database/agora/seed_stores_from_groups_branches_brands.sql`, `database/agora/migration_add_store_context_to_orders.sql`, `database/README.md`.
