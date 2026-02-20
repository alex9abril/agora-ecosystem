# Definición: Módulo de configuración y branding por marca (tienda por marca)

**Definido mediante GRIANT.**  
**Estado:** Definición lista; pendiente implementación.

---

## 1. Objetivo

Hoy la configuración (impuestos, notificaciones, Karbot) y el **branding** del storefront se pueden gestionar **por sucursal** y **por grupo** (web-admin y web-local). No existe un espacio para **configurar y brandear la tienda por marca** (p. ej. “tienda Toyota” en `/brand/toyota`).

**Objetivo:** Poder tener **configuración y branding específicos por marca de vehículo** (nivel **marca** de MultiTienda), de forma que el store-front en contexto `/brand/{code}` (p. ej. `/brand/toyota`) muestre logo, colores, textos y opciones configuradas para esa marca, independientes de sucursal/grupo.

---

## 2. Reglas de negocio

- **Alcance por nivel (MultiTienda):**
  - **Global:** sin cambio; sigue siendo “todo”.
  - **Grupo / Sucursal:** se mantiene como está (config y branding por grupo y por sucursal en web-admin y web-local).
  - **Marca (nuevo):** se añade configuración y branding **por marca de vehículo** (`catalog.vehicle_brands`). Solo aplica cuando el usuario navega en contexto **marca** (`/brand/{code}`).

- **Quién gestiona la configuración por marca:**
  - **web-admin:** único lugar donde se configura y brandea la “tienda por marca”. El admin del sitio elige qué marcas tienen tienda brandeada y edita logo, colores, textos, etc. por marca.
  - **web-local:** por ahora **no** gestiona configuración por marca; solo sigue gestionando sucursal y grupo. (Futuro opcional: que un grupo/sucursal pueda sobreescribir branding por marca para sus productos.)

- **Comportamiento en el store-front:**
  - En **contexto marca** (`/brand/toyota`): se usa la configuración y el branding de esa marca si existen; si no, fallback a tema/estilo por defecto (sin branding de marca).
  - En contexto global, grupo o sucursal: no se usa la configuración “por marca”; se sigue usando la lógica actual (grupo/sucursal según corresponda).

- **Activación por marca:**  
  Se debe poder indicar si una marca tiene “tienda por marca” activa (config/branding aplicados en el store-front). Si está inactiva, `/brand/{code}` se comporta sin branding específico (fallback).

---

## 3. Base de datos

- **Contexto actual:**
  - Branding por **grupo** y por **sucursal:** `core.business_groups.settings`, `core.businesses.settings` (JSONB, con clave `branding`). Función `core.get_business_branding(p_business_id)` hace merge grupo + sucursal.
  - Marcas de vehículo: `catalog.vehicle_brands` (id, name, code, display_order, is_active). Sin configuración ni branding hoy.

- **Propuesta (a implementar):**
  - **Nueva tabla** para no tocar `vehicle_brands` y mantener “tienda por marca” opcional:
    - **Nombre sugerido:** `catalog.vehicle_brand_store_config` (o `catalog.vehicle_brand_settings`).
    - **Campos mínimos:**  
      - `vehicle_brand_id` UUID NOT NULL REFERENCES catalog.vehicle_brands(id) ON DELETE CASCADE,  
      - `settings` JSONB DEFAULT '{}',  
      - `is_storefront_enabled` BOOLEAN DEFAULT false (si la tienda por esa marca está “activa” con branding),  
      - `created_at`, `updated_at`.  
    - Dentro de `settings` usar la misma estructura de **branding** que ya existe (logos, colors, fonts, texts, social_media, custom_css, custom_js) para reutilizar DTOs y UI.
  - **Alternativa:** añadir a `catalog.vehicle_brands` columnas `settings JSONB` y `is_storefront_enabled BOOLEAN`. La tabla nueva suele ser más limpia para evolución y permisos.

- **Índices:** al menos UNIQUE(vehicle_brand_id) en la tabla nueva (o PK vehicle_brand_id si es una fila por marca).

- **Convenciones:** seguir `.cursorrules` y `database/`: schema prefix `catalog.`, snake_case, trigger `update_updated_at`, sin `deleted_at` (usar `is_storefront_enabled` o similar para “desactivar”).

---

## 4. Backend

- **Módulo / controlador:**  
  Opción A: extender el módulo de **vehicle-brands** (o catálogo de marcas) con endpoints de “config/storefront”. Opción B: módulo pequeño **vehicle-brand-config** o **brand-store-config** con solo get/update por `vehicle_brand_id`.

- **Endpoints sugeridos:**
  - `GET /vehicle-brands/:id/store-config` (o `GET /vehicle-brands/:id/branding`) — devuelve configuración y branding de esa marca. Para store-front podría ser público (solo lectura); para web-admin mismo endpoint con permisos admin.
  - `PUT /vehicle-brands/:id/store-config` (o `PATCH`) — actualizar configuración y branding por marca. Solo **admin** (web-admin).

- **DTOs:** Reutilizar la estructura de branding existente (BrandingDto o equivalente) para logos, colores, fuentes, textos, redes sociales. Añadir si hace falta un DTO que incluya `is_storefront_enabled` y `branding`.

- **Permisos:** Solo roles con acceso a web-admin (admin/superadmin) pueden crear/actualizar configuración por marca. Lectura en store-front por `vehicle_brand_id` o por `code` (público o autenticado según decisión de producto).

- **Filtros MultiTienda:** En endpoints de listado (si se lista “marcas con tienda configurada”), filtrar por `is_storefront_enabled` y por `is_active` en `catalog.vehicle_brands`.

---

## 5. Frontend (Apps)

- **web-admin:**
  - **Dónde:** Dentro de **Configuración** (o “Tiendas por marca” / “Marcas”), una sección que liste las marcas de vehículo (`catalog.vehicle_brands`).
  - **Flujo:** Seleccionar una marca (p. ej. Toyota) → pantalla de configuración/branding para esa marca (logo, colores, textos, redes, activar/desactivar “tienda por marca”).
  - **Componente:** Reutilizar el mismo tipo de **BrandingManager** que ya se usa para grupo y sucursal, con `type='brand'` (o `'vehicle_brand'`) e `id = vehicle_brand_id`, y llamar a los nuevos endpoints por marca. Botones principales negros (regla del proyecto).

- **web-local:**  
  Por ahora **no** se añade gestión de configuración por marca. La configuración por marca es responsabilidad de web-admin.

- **store-front:**
  - En contexto **marca** (`/brand/{code}`): al cargar la app o la ruta, obtener la configuración/branding de esa marca (por `code` o por `vehicle_brand_id`) y aplicarla (header, logo, colores, temas, textos).
  - Si no hay configuración o la marca no tiene “tienda por marca” activa, usar tema/estilo por defecto sin branding de marca.
  - Mantener **StoreContext** y **getContextualUrl** para que todos los enlaces sigan en el mismo contexto marca.

---

## 6. Multi-tienda (resumen)

- **Nivel marca:** Aplica **solo** cuando el usuario está en `/brand/{code}`. La configuración y el branding por marca se almacenan por `vehicle_brand_id` y se gestionan desde **web-admin**.
- **Niveles grupo y sucursal:** Sin cambio; siguen configurándose y brandeándose como hasta ahora en web-admin y web-local.
- **Store-front:** Respeta el contexto (global, grupo, sucursal, marca); en contexto marca usa la nueva configuración por marca.

---

## 7. Referencias

- Agente **MultiTienda:** `docs/agentes/01-multitienda-contexto-global-grupo-sucursal.md`
- Agente **Apps:** `docs/agentes/05-apps-tres-fronts-backend.md`
- Branding actual (grupo/sucursal): `database/agora/migration_business_branding.sql`, `core.get_business_branding`, `apps/web-admin` y `apps/web-local` BrandingManager
- Marcas de vehículo: `catalog.vehicle_brands` en `database/agora/migration_vehicle_compatibility.sql`
- Configuración sitio: `catalog.site_settings` en `database/agora/migration_site_settings.sql`

---

## 8. Próximos pasos (implementación)

1. **DBA:** Crear migración para tabla de configuración/branding por marca (p. ej. `catalog.vehicle_brand_store_config`) y actualizar `database/INDEX.md`.
2. **Backend:** Implementar endpoints get/update de store-config (o branding) por `vehicle_brand_id`; permisos admin para escritura.
3. **web-admin:** Añadir sección “Tiendas por marca” / “Configuración por marca”, listado de marcas y BrandingManager por marca.
4. **store-front:** En contexto marca, consumir API de branding por marca y aplicar estilos y contenido.
5. **DocPost:** Actualizar documentación e índices cuando esté implementado.
