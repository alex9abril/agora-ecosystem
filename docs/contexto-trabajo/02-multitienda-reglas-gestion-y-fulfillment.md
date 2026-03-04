# Definición: MultiTienda — Reglas de gestión, cuentas y fulfillment

**Definido mediante GRIANT.**  
**Estado:** Definición de reglas de negocio; referencia para implementación.

Este documento fija **quién gestiona qué**, **quién cumple las ventas** y **quién ve qué**, para los cuatro niveles de tienda (global, grupo, sucursal, marca). Complementa al agente [01-multitienda-contexto-global-grupo-sucursal.md](../agentes/01-multitienda-contexto-global-grupo-sucursal.md).

**Tienda vs distribuidor:** En este documento, **tienda** = canal de venta (donde se vende); **distribuidor** = quien tiene el producto en almacén y surte el pedido. Un distribuidor puede no tener tienda propia y estar montado en una o más tiendas. Definición completa: [03-tiendas-y-distribuidores.md](./03-tiendas-y-distribuidores.md).

---

## 1. Resumen en una frase

Cada **tienda** (canal: global, grupo, sucursal, marca) promueve ventas; **quien recibe y realiza la venta** (fulfillment) es el **distribuidor** — en el modelo actual, el **almacén que despacha** (sucursal). Un distribuidor puede no tener tienda propia y operar montado en otra(s) tienda(s). La sucursal pertenece a un dealer (grupo) y **cada sucursal vende una sola marca**. La gestión (branding, config) y las cuentas se separan: grupo/dealer gestiona grupo y sucursales; la tienda por **marca** la gestiona una **cuenta distinta** (corporativo/planta de la marca).

---

## 2. Quién gestiona qué (branding y configuración)

| Nivel      | Quién gestiona | Dónde | Alcance |
|------------|----------------|--------|---------|
| **Global** | Admin del sitio | **web-admin** | Gestión de la tienda global. No preocupa por ahora; sigue como está. |
| **Grupo**  | El **grupo** (dealer/distribuidor) que se registra | **web-local** (o web-admin según rol) | Gestiona **branding de su grupo** y **branding de sus sucursales**. Solo hasta ahí: **no** gestiona la tienda por marca. |
| **Sucursal** | El grupo al que pertenece la sucursal (o la sucursal misma según permisos) | **web-local** | Branding de la sucursal (ya existente). |
| **Marca**  | **Cuenta distinta**: corporativo/planta de la marca (Nissan, Ford, etc.) | **Cuenta “marca”** (no es el dealer ni el distribuidor) | Gestiona la **tienda por marca** (branding, promoción de la marca). No tiene que ver con dealer, grupo ni sucursal: es la marca como fabricante/corporativo. |

**Regla clave:** Distintas sucursales y grupos pueden **vender la misma marca**. Por eso la **gestión de la tienda por marca** no puede estar en el grupo ni en la sucursal: debe ser una **cuenta propia** para el corporativo/planta de la marca (ej. Nissan México, Ford Motor), que nada tiene que ver con el dealer o el distribuidor.

---

## 3. Cuentas y apps

- **Cuenta grupo/dealer:** Acceso a **web-local** (y según rol a web-admin). Gestiona su grupo y sus sucursales (branding grupo + sucursal). **No** gestiona tienda por marca.
- **Cuenta marca (corporativo/planta):** Cuenta **separada**. Gestiona la tienda por marca (branding, contenido de “tienda Nissan”, “tienda Ford”, etc.). Usuario tipo “marca” o “brand_owner” — por definir en roles.
- **Cuenta admin / tienda global:** **web-admin**. Gestiona la tienda global y configuraciones de sitio.

---

## 4. Fulfillment: quién recibe y realiza la venta (distribuidor)

- **Siempre** quien **recibe** el pedido y **despacha** el producto es el **distribuidor** (quien tiene el producto en almacén). En el modelo actual ese rol lo cumple la **sucursal** (`orders.orders.business_id`).
- Un **distribuidor puede no tener tienda propia** y estar **montado en una o más tiendas** (vender a través de canales ajenos). Ver [03-tiendas-y-distribuidores.md](./03-tiendas-y-distribuidores.md).
- **Una sucursal pertenece a un dealer (grupo)** y **una sucursal vende una sola marca**.  
  → En datos: cada `core.businesses` (sucursal) tiene `business_group_id` y debe tener asociada **una sola** marca (p. ej. `vehicle_brand_id` o equivalente) para cumplir la regla “sucursal = una marca”.
- Los pedidos se asignan a la sucursal que surte (ya existe `orders.orders.business_id`); esa sucursal (distribuidor) tiene visibilidad de **todos los pedidos que ella despacha**.

---

## 5. Visibilidad de ventas (quién ve qué)

| Cuenta / Nivel | Qué ve |
|----------------|--------|
| **Sucursal** | **Todos los pedidos que esa sucursal surte** (fulfillment). Visibilidad completa de las ventas que realiza. |
| **Grupo (dealer)** | Las ventas que se realizaron **desde su tienda (contexto grupo)** — es decir, pedidos generados desde `/grupo/{slug}` y surtidos por sus sucursales (o por sucursales del grupo). |
| **Marca (corporativo)** | Las ventas que se realizaron **desde la tienda por marca** — pedidos generados desde `/brand/{code}` (su marca). El fulfillment sigue siendo sucursal; la cuenta marca ve el resultado de “su” tienda marca. |
| **Tienda global** | Las ventas que se realizaron **desde la tienda global** (pedidos sin contexto grupo/sucursal/marca, o contexto global). Además (ver siguiente punto): la tienda global aplica un margen sobre los precios. |

---

## 6. Precios y margen de la tienda global

- **Tienda global** incrementa los precios con un **pequeño porcentaje** sobre el precio base (o sobre el precio de la sucursal que surte) para mantener su **utilidad/margen**.  
- Los demás contextos (grupo, sucursal, marca) no necesariamente aplican ese mismo margen; la regla específica de cómo se calcula el precio en cada contexto (y cómo se reparte entre global, grupo, sucursal) se puede detallar más adelante en lógica de negocio y/o BD.

---

## 7. Resumen de reglas (checklist para implementación)

1. **Gestión:** Grupo gestiona branding grupo + sucursal; **no** gestiona tienda por marca. Tienda por marca = **cuenta distinta** (corporativo/planta de la marca). Tienda global = web-admin.
2. **Fulfillment:** Siempre la **sucursal**. Una sucursal = un grupo, **una marca**.
3. **Visibilidad:** Sucursal ve todo lo que surte; grupo ve ventas desde su tienda grupo; marca ve ventas desde su tienda marca; global ve ventas desde tienda global.
4. **Precios:** Tienda global añade un porcentaje a los precios para su utilidad.

---

## 8. Implicaciones para BD y roles (por definir en detalle)

- **Sucursal → una sola marca:** Confirmar o añadir en `core.businesses` la relación con `catalog.vehicle_brands` (p. ej. `vehicle_brand_id` o equivalente) y regla de negocio “una sucursal, una marca”.
- **Cuenta “marca”:** Definir rol o tipo de usuario (ej. `brand_owner`, `marca`) y qué puede gestionar (solo su marca en catálogo/vehicle_brands). Posible tabla o relación `vehicle_brands` ↔ usuarios/cuentas que gestionan esa marca.
- **Origen del pedido (attribution):** Para visibilidad “ventas desde tienda grupo” vs “desde tienda marca” vs “desde global”, ya existe `orders.orders.store_context`; usarlo (o ampliarlo) para reportes por tipo de tienda.

---

## 9. Referencias

- **Tiendas y distribuidores (definición):** [03-tiendas-y-distribuidores.md](./03-tiendas-y-distribuidores.md)
- Agente MultiTienda: [01-multitienda-contexto-global-grupo-sucursal.md](../agentes/01-multitienda-contexto-global-grupo-sucursal.md)
- Config por marca (definición previa): [01-definicion-modulo-configuracion-por-marca.md](./01-definicion-modulo-configuracion-por-marca.md)
- Apps (web-admin, web-local, store-front): [05-apps-tres-fronts-backend.md](../agentes/05-apps-tres-fronts-backend.md)
