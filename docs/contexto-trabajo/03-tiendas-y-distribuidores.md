# Definición: Tiendas y distribuidores

**Estado:** Definición de modelo de negocio. Referencia para implementación y documentación.

Este documento establece la diferencia entre **tienda** (canal de venta) y **distribuidor** (quien tiene el producto en almacén) y cómo se relacionan. Complementa a [02-multitienda-reglas-gestion-y-fulfillment.md](./02-multitienda-reglas-gestion-y-fulfillment.md) y al agente [01-multitienda-contexto-global-grupo-sucursal.md](../agentes/01-multitienda-contexto-global-grupo-sucursal.md).

---

## 1. Resumen en una frase

- **Tienda** = **canal de venta**: dónde el cliente compra (URL, branding, carrito, checkout).
- **Distribuidor** = **quien tiene el producto en almacén**: quien surte el pedido (fulfillment). Un distribuidor puede **no tener tienda propia** y estar **montado en otra tienda o en varias tiendas**.

---

## 2. Tienda (canal de venta)

| Aspecto | Descripción |
|--------|--------------|
| **Qué es** | El **canal** por el que se vende: la “fachada” (ruta, nombre, branding) desde la que el cliente navega, ve catálogo, agrega al carrito y hace checkout. |
| **En BD** | Tabla **`core.stores`**. Una fila por canal (global, grupo, sucursal, grupo+marca, marca global). |
| **Identificación** | `store_id`, `slug`, `store_context` (ruta ej. `/sucursal/toyota-satelite`, `/grupo/grupo-andrade`). |
| **En pedidos** | `orders.orders.store_id` = canal desde el que se realizó la venta; `orders.orders.store_context` = ruta para correos y enlaces. |

La tienda **no** es el almacén: es el **punto de venta** (virtual o asociado a un contexto de grupo/sucursal/marca).

---

## 3. Distribuidor (quien tiene el producto en almacén)

| Aspecto | Descripción |
|--------|--------------|
| **Qué es** | La entidad que **tiene el producto en almacén** y que **surte (fulfillment)** el pedido. Es quien despacha. |
| **En BD (actual)** | Típicamente **`core.businesses`** (sucursal) como entidad que despacha; en pedidos **`orders.orders.business_id`** = sucursal que surte. En integraciones y catálogos se habla de “distribuidor” como quien provee catálogo/stock (ver [01-catalogo-distribuidores-sync.md](../integrations/01-catalogo-distribuidores-sync.md)). |
| **Característica clave** | Un **distribuidor puede no tener tienda propia**. En ese caso opera **montado en una o más tiendas**: vende a través del canal de otra tienda (o de varias). |

**Ejemplo:**  
- Distribuidor A tiene sucursal física y además su **propia** tienda en Agora (canal sucursal).  
- Distribuidor B **no** tiene tienda propia: su producto se vende solo a través de la tienda del grupo o de una tienda de sucursal que lo tenga asociado. B es quien tiene el stock y surte, pero el canal de venta es la tienda de otro.

---

## 4. Relación tienda ↔ distribuidor

- **Una tienda** (canal) puede estar surtida por **uno o más distribuidores** (quienes tienen stock y cumplen los pedidos).
- **Un distribuidor** puede:
  - Tener **su propia tienda** (canal en `core.stores` asociado a su negocio/sucursal), y/o
  - Estar **montado en otra(s) tienda(s)** (vender a través de canales ajenos; el canal es de otro, el fulfillment es del distribuidor).

En el modelo actual de Agora, el **fulfillment** se asocia a **sucursal** (`orders.business_id`). La extensión futura para “distribuidor sin tienda propia, montado en N tiendas” puede requerir tablas o relaciones adicionales (ej. qué distribuidores surten qué tiendas); este documento deja fija la **definición de concepto** para que la documentación y el producto hablen de “tienda” vs “distribuidor” de forma coherente.

---

## 5. Resumen para documentación e implementación

| Término | Significado | Dónde se modela (hoy) |
|--------|-------------|------------------------|
| **Tienda** | Canal de venta (dónde se vende) | `core.stores` |
| **Distribuidor** | Quien tiene el producto en almacén y surte el pedido | Fulfillment: `orders.business_id` (sucursal); catálogo/integraciones: ver docs de distribuidores |
| **Distribuidor sin tienda propia** | Opera montado en una o más tiendas ajenas | Concepto aceptado; modelo de datos explícito (ej. tabla distribuidor–tienda) por definir si se implementa |

Al leer o escribir documentación:

- **Tienda** = canal de venta (URL, listados, checkout, `store_id`).
- **Distribuidor** = quien tiene el producto en almacén y puede o no tener tienda propia; puede estar montado en otra tienda o en varias.

---

## 6. Referencias

- [01-multitienda-contexto-global-grupo-sucursal.md](../agentes/01-multitienda-contexto-global-grupo-sucursal.md) — Tipos de tienda (canales), BD, store-front.
- [02-multitienda-reglas-gestion-y-fulfillment.md](./02-multitienda-reglas-gestion-y-fulfillment.md) — Quién gestiona qué, fulfillment por sucursal, visibilidad.
- [01-catalogo-distribuidores-sync.md](../integrations/01-catalogo-distribuidores-sync.md) — Sincronización de catálogo por distribuidor.
