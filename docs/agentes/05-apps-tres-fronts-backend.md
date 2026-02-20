# Agente: Apps — Tres fronts y backend

**Nombre corto:** **Apps**

**Uso:** Cuando trabajes en frontend o en qué app va una funcionalidad, usa este documento. El proyecto tiene **un backend** y **tres aplicaciones front** que consumen sus APIs. Cada front tiene un rol distinto; al implementar o documentar hay que saber en cuál(es) va la UI.

---

## 1. Las tres apps front

| App | Ruta en repo | Para qué sirve | Quién lo usa |
|-----|----------------|-----------------|--------------|
| **web-admin** | `apps/web-admin/` | Gestionar el **sitio AGORA** a nivel global: configuraciones, usuarios, negocios, catálogos, integraciones, contenido del sitio. | Administradores del ecosistema (superadmin, soporte). |
| **web-local** | `apps/web-local/` | Gestionar **una tienda** (sucursal): productos, pedidos, inventario, horarios, branding de esa tienda. | Dueños/gerentes de una sucursal o grupo. |
| **store-front** | `apps/store-front/` | La **tienda tal cual**: catálogo, carrito, checkout, órdenes. Es lo que ve el cliente final. Soporta contexto global, grupo, sucursal y marca. | Clientes que compran. |

- **Backend:** `apps/backend/` — API única (NestJS). Los tres fronts consumen el mismo backend; los módulos y permisos diferencian qué puede hacer cada uno.

---

## 2. Cuándo tocar cada app

| Si la funcionalidad es… | App(s) donde va la UI |
|-------------------------|------------------------|
| Configuración del sitio, usuarios globales, catálogos globales, integraciones (envíos, pagos), sliders, contenido global | **web-admin** |
| Gestión de mi tienda: productos, precios, stock, pedidos de mi sucursal, horarios, branding de mi tienda | **web-local** |
| Ver catálogo, buscar, carrito, checkout, mis órdenes, contexto por sucursal/grupo/marca | **store-front** |
| Reportes por sucursal (para el dueño de la tienda) | **web-local** (y/o web-admin si es reporte global) |
| Reportes globales del ecosistema | **web-admin** |

Regla práctica: **¿quién usa esta pantalla?** → Admin del sitio → web-admin; dueño/gerente de tienda → web-local; cliente que compra → store-front.

---

## 3. Backend y permisos

- **Un solo backend** (`apps/backend/`). Módulos por dominio: auth, orders, products, businesses, business-groups, etc.
- La **autenticación** (Supabase Auth) es común; los **roles** y **permisos** determinan qué endpoints puede llamar cada front (admin, local, cliente).
- **web-admin** suele usar endpoints de administración y configuración global.
- **web-local** usa endpoints scoped por `business_id` / sucursal (o grupo) del usuario.
- **store-front** usa endpoints públicos o de cliente (catálogo, carrito, checkout, órdenes del usuario); puede filtrar por contexto (global, grupo, sucursal, marca) según el agente MultiTienda.

---

## 4. Relación con otros agentes

- **MultiTienda:** el **store-front** es quien usa el contexto global / grupo / sucursal / marca (URLs, StoreContext, `store_context` en pedidos). web-admin y web-local no usan ese contexto de navegación.
- **GRIANT:** al implementar una feature, en la capa **frontend** debe decidir en qué app(s) va la UI según este agente (Apps) y luego implementar en `web-admin`, `web-local` y/o `store-front`.

---

## 5. Cómo invocar este agente

- *"Según el agente Apps (@docs/agentes/05-apps-tres-fronts-backend.md), ¿dónde va la pantalla de [X]?"*
- *"Apps: necesito [configuración de sliders] → web-admin."*
- *"Usa GRIANT para [feature]; la gestión en web-local y la vista cliente en store-front."*

Cuando implementes o documentes algo de frontend, cargar este documento evita dudas sobre si la UI va en web-admin, web-local o store-front.
