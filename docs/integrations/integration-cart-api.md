# API: Carrito de integración (`/integrations/cart`)

Carrito persistente para **WhatsApp, bots y servicios externos** sin usuario Supabase. Cada carrito está ligado a un **`store_id`** (`core.stores`): la API valida que los productos puedan venderse en ese canal (misma lógica de negocio que el catálogo multi-tienda).

No reemplaza el carrito de usuario autenticado (`GET/POST /cart` con JWT).

## Requisitos

1. **Migración SQL**: ejecutar [`database/agora/migration_integration_cart.sql`](../../database/agora/migration_integration_cart.sql) (tablas `orders.integration_carts` e `orders.integration_cart_items`).
2. **Función de marca** (tiendas `group_brand` / `global_brand` con productos `refaccion`/`accesorio`): debe existir `catalog.product_matches_vehicle_brand` (p. ej. tras [`migration_v_store_products.sql`](../../database/agora/migration_v_store_products.sql)).
3. **Columna `archived_at` en `core.stores`** (recomendado): [`migration_stores_archived_at.sql`](../../database/agora/migration_stores_archived_at.sql).

## Autenticación (estilo webhook)

Todas las rutas bajo `/integrations/cart` son **públicas respecto al JWT** (`@Public()`), pero exigen una **clave compartida**:

| Origen | Descripción |
|--------|-------------|
| Header `X-Webhook-Secret` | Valor de la clave en texto plano |
| Header `Authorization: Bearer <clave>` | Misma clave como Bearer |

Claves válidas:

- Filas en **`core.webhook_secrets`** con `provider = 'integration_cart'`, `is_active = true` y no expiradas.
- Variable de entorno **`INTEGRATION_CART_WEBHOOK_SECRET`** (útil en desarrollo o si aún no hay filas en BD).

Si **no** hay ningún secreto configurado, la API responde **401** con mensaje indicando que falta configuración.

### Alta de clave en base de datos

Insertar (ajustar nombre; el formato del secret puede seguir el de otros webhooks del proyecto):

```sql
INSERT INTO core.webhook_secrets (name, secret, provider, is_active)
VALUES (
  'WhatsApp / integración carrito',
  'ago_secret_<tu_valor_seguro>',
  'integration_cart',
  true
);
```

O usar el flujo de administración de webhook secrets del backend si ya expone creación por `provider`.

## Base URL

Misma del API NestJS (ej. `https://<host>/api` si usáis prefijo global).

## Endpoints

### 1. Crear carrito

`POST /integrations/cart`

**Body JSON:**

```json
{ "storeId": "<uuid de core.stores>" }
```

**201** — Cuerpo ejemplo:

```json
{
  "id": "<cart_uuid>",
  "store_id": "<store_uuid>",
  "expires_at": "...",
  "created_at": "...",
  "updated_at": "..."
}
```

El carrito expira a los **30 días** por defecto (`expires_at`). Si se consulta o modifica después de expirar, la API responde **410 Gone**.

---

### 2. Obtener carrito

`GET /integrations/cart/:cartId`

Devuelve el carrito, ítems enriquecidos (nombre producto, imagen pública si aplica), `subtotal`, `itemCount`, `totalQuantity`.

---

### 3. Agregar o sumar cantidad (misma línea)

`POST /integrations/cart/:cartId/items`

**Body JSON:**

| Campo | Tipo | Obligatorio | Notas |
|-------|------|-------------|--------|
| `productId` | UUID | Sí | |
| `quantity` | int ≥ 1 | Sí | Si ya existe la misma línea (producto + variantes + notas + `branch_id`), se **suma** la cantidad y se actualiza snapshot de precio |
| `variantSelections` | objeto | No | Igual que `/cart/items` |
| `specialInstructions` | string | No | |
| `branchId` | UUID | Depende de la tienda | Ver tabla siguiente |

**Uso de `branchId` según `store.type`:**

| `store.type` | `branchId` |
|--------------|------------|
| `branch` | Opcional; si no se envía se usa la sucursal de la tienda. Debe coincidir con la tienda. |
| `group`, `group_brand` | **Obligatorio**; sucursal del grupo (`business_group_id` del store). |
| `global_brand` | **Obligatorio**; sucursal activa con PBA. |
| `global` | Opcional; si se envía, precio/disponibilidad por PBA de esa sucursal. |

Validación de catálogo: precio base &gt; 0, producto disponible, PBA habilitada cuando aplica, y para `refaccion`/`accesorio` en tiendas con marca, `product_matches_vehicle_brand`.

---

### 4. Ajustar cantidad de un ítem

`PATCH /integrations/cart/:cartId/items/:itemId`

**Body JSON** (al menos uno):

| Campo | Descripción |
|-------|-------------|
| `quantity` | Cantidad absoluta (≥ 1 si es el único campo útil) |
| `quantityDelta` | Suma algebraica a la cantidad actual |

Si se envían **ambos**, el resultado es **`quantity + quantityDelta`**.

Si la cantidad resultante es **≤ 0**, se **elimina** el ítem. Si el carrito queda sin ítems, se **borra** el carrito; la respuesta puede ser **`null`**.

---

### 5. Eliminar un ítem

`DELETE /integrations/cart/:cartId/items/:itemId`

Si era el último ítem, se elimina el carrito; respuesta **`null`** en ese caso.

---

### 6. Eliminar carrito completo

`DELETE /integrations/cart/:cartId`

Respuesta ejemplo: `{ "deleted": true, "cartId": "..." }`

---

## Códigos de error frecuentes

| Código | Significado |
|--------|-------------|
| 401 | Falta header de clave, clave incorrecta o no hay secretos configurados |
| 400 | Producto no permitido en la tienda, sucursal incorrecta, tienda inactiva/archivada |
| 404 | Carrito, ítem o tienda no encontrados |
| 410 | Carrito expirado |
| 503 | BD no configurada u error de servicio |

## Ejemplo `curl` (crear carrito y agregar ítem)

```bash
export API=https://tu-api.example.com
export SECRET=tu_clave_integration_cart
export STORE_ID=d3803a96-63dd-4b82-983f-c0c8cdc87d56

CART_ID=$(curl -sS -X POST "$API/integrations/cart" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $SECRET" \
  -d "{\"storeId\":\"$STORE_ID\"}" | jq -r '.data.id // .id')

curl -sS -X POST "$API/integrations/cart/$CART_ID/items" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $SECRET" \
  -d '{"productId":"<uuid-producto>","quantity":1,"branchId":"<uuid-sucursal>"}'
```

*(Si usáis interceptor que envuelve respuestas en `data`, ajustad el `jq`.)*

## Colección Postman

Ver [`postman/Integration_Cart.postman_collection.json`](../../postman/Integration_Cart.postman_collection.json).

## Referencias de código

- Controlador: [`apps/backend/src/modules/integration-cart/integration-cart.controller.ts`](../../apps/backend/src/modules/integration-cart/integration-cart.controller.ts)
- Guard: [`apps/backend/src/modules/integration-cart/guards/integration-cart-webhook.guard.ts`](../../apps/backend/src/modules/integration-cart/guards/integration-cart-webhook.guard.ts)
- Validación por tienda: [`apps/backend/src/modules/integration-cart/store-product-eligibility.service.ts`](../../apps/backend/src/modules/integration-cart/store-product-eligibility.service.ts)
