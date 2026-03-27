# API: Carrito de integración (`/integrations/cart`)

Carrito persistente para **WhatsApp, bots y servicios externos** sin usuario Supabase. Cada carrito está ligado a un **`store_id`** (`core.stores`): la API valida que los productos puedan venderse en ese canal (misma lógica de negocio que el catálogo multi-tienda).

No reemplaza el carrito de usuario autenticado (`GET/POST /api/cart` con JWT).

## Rutas base

El backend usa prefijo global **`/api`** para casi todo, pero el **carrito de integración está excluido** de ese prefijo para alinearlo con URLs típicas de webhooks:

| Uso | Base URL ejemplo |
|-----|------------------|
| **Carrito integración (recomendado)** | `POST http://localhost:3000/integrations/cart` |
| Resto de la API | `http://localhost:3000/api/...` |

Si llamas `POST /integrations/cart` y recibes 404, reinicia el servidor tras actualizar el código y confirma que `IntegrationCartModule` está importado en `app.module.ts`.

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

### Si recibes 401 “no hay claves activas”

1. **`DATABASE_URL`**: el proceso del backend debe poder conectarse a la misma base donde insertaste la fila. Sin pool, la API no lee `core.webhook_secrets` (solo cuenta `INTEGRATION_CART_WEBHOOK_SECRET` si está en `.env`).
2. **`provider`**: debe ser equivalente a `integration_cart` (la consulta ignora mayúsculas y espacios al inicio/fin; evita guiones u otros nombres).
3. **`is_active`**: debe ser `true`. **`expires_at`**: `NULL` o fecha futura.
4. **Header**: el valor de `X-Webhook-Secret` (o el Bearer) debe coincidir **exactamente** con la columna `secret` (mismos caracteres, sin espacios extra salvo los que formen parte del valor).
5. **Permisos**: la URL de conexión suele usar `postgres` o `service_role`; si usas otro rol, necesita `SELECT` sobre `core.webhook_secrets` (ver [`migration_webhook_secrets.sql`](../../database/agora/migration_webhook_secrets.sql)).

Comprobación rápida en SQL (misma instancia que `DATABASE_URL`):

```sql
SELECT id, name, provider, is_active, expires_at, left(secret, 20) AS secret_prefix
FROM core.webhook_secrets
WHERE lower(trim(provider)) = 'integration_cart';
```

## Base URL

Origen del servidor **sin** el segmento `/api` para estos endpoints (ej. `https://<host>` o `http://localhost:3000`), porque las rutas del carrito de integración quedan en la raíz: `/integrations/cart`.

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

### 2. Enlace público al carrito (sitio web / WhatsApp)

El **backend** arma la URL; n8n solo llama al endpoint y reenvía el `url` por WhatsApp (o usa `token` si tu plantilla lo requiere).

- `POST /integrations/cart/:cartId/link` — body JSON opcional (ver tabla).
- `GET /integrations/cart/:cartId/link?ttlSeconds=&path=&storeId=` — mismos parámetros por query.

**Headers:** igual que el resto (`X-Webhook-Secret` o `Authorization: Bearer`).

**Body / query opcional:**

| Campo | Tipo | Default | Notas |
|-------|------|---------|--------|
| `ttlSeconds` | int | 604800 (7 d) | Entre 60 y 2 592 000 (30 d). El enlace **nunca** vive más que `expires_at` del carrito. |
| `path` | string | (ver abajo) | Ruta **relativa** bajo `FRONTEND_URL`. Si se envía, **tiene prioridad** sobre la ruta derivada de `storeId`. |
| `storeId` | UUID | — | **Sin `path`:** si lo envías y coincide con `integration_carts.store_id` del carrito, el backend arma la ruta del carrito en el sitio según `core.stores.type` y `slug` (ej. `branch` → `/sucursal/{slug}/cart`, `group` / `group_brand` → `/grupo/{slug}/cart`, `global_brand` → `/brand/{slug}/cart`, `global` → `/cart`). Si no envías `path` ni `storeId`, se usa `INTEGRATION_CART_WEB_PATH` (compatibilidad, p. ej. `/carrito/integracion`). |

**Variables de entorno:**

| Variable | Uso |
|----------|-----|
| `FRONTEND_URL` | Base del sitio (obligatoria para generar `url`), sin `/` final. |
| `INTEGRATION_CART_LINK_SECRET` | HMAC del token `t` (recomendada). Si falta, se usa `INTEGRATION_CART_WEBHOOK_SECRET`. |
| `INTEGRATION_CART_WEB_PATH` | Ruta por defecto si no envías `path`. |

**200** — Ejemplo (enlace a carrito contextual):

```json
{
  "url": "https://tu-sitio.com/sucursal/toyota-satelite/cart?t=eyJ2IjoxLCJjYXJ0SWQiOi...",
  "token": "eyJ2IjoxLCJjYXJ0SWQiOi...",
  "cart_id": "<uuid>",
  "store_id": "<uuid>",
  "link_expires_at": "2026-03-30T12:00:00.000Z",
  "path": "/sucursal/toyota-satelite/cart"
}
```

El query **`t`** es un token firmado (HMAC-SHA256). En **store-front**, la página de carrito (`/cart` y `/sucursal/.../cart`, etc.) lee `t`, importa el carrito de integración (usuario autenticado vía `POST /api/cart/import-integration`, invitado vía `GET /integrations/cart/session` + carrito local) y quita `t` de la URL. **No** expongas `INTEGRATION_CART_LINK_SECRET` en el cliente.

**503** si falta `FRONTEND_URL` o un secreto para firmar.

---

### 3. Resolver carrito por token del enlace (sitio web, sin webhook secret)

`GET /integrations/cart/session?t=<token>`

Valida la firma HMAC del mismo `token` que devuelve el endpoint de enlace y el query `t` en la URL pública. **No** requiere `X-Webhook-Secret` ni JWT. Pensado para que el frontend (p. ej. store-front) muestre el resumen antes de iniciar sesión.

**Query:**

| Parámetro | Obligatorio | Descripción |
|-----------|-------------|-------------|
| `t` | Sí | Token completo (`payload.sig`) |

**200** — Mismo cuerpo que `GET /integrations/cart/:cartId` (carrito con ítems enriquecidos).

**400** — Token ausente, inválido o caducado.

**410** — Carrito eliminado o expirado en base de datos.

**503** — Falta `INTEGRATION_CART_LINK_SECRET` / `INTEGRATION_CART_WEBHOOK_SECRET` para validar la firma.

---

### 4. Importar carrito de integración al carrito del usuario (checkout web)

`POST /api/cart/import-integration`

Requiere **JWT** de Supabase (`Authorization: Bearer`). Vacía el `shopping_cart` del usuario y copia las líneas del carrito de integración identificado por el mismo token `t` del enlace (validación idéntica a `GET .../session`). Tras esto, el usuario puede usar `POST /api/orders/checkout` con su flujo habitual.

**Body JSON:**

```json
{ "token": "<mismo token t del enlace>" }
```

**200** — Carrito del usuario (`GET /api/cart`).

**400** — Token inválido o carrito de integración vacío.

---

### 5. Obtener carrito (integración, con webhook)

`GET /integrations/cart/:cartId`

Devuelve el carrito, ítems enriquecidos (nombre producto, imagen pública si aplica), `subtotal`, `itemCount`, `totalQuantity`.

---

### 6. Agregar o sumar cantidad (misma línea)

`POST /integrations/cart/:cartId/items`

**Body JSON:**

| Campo | Tipo | Obligatorio | Notas |
|-------|------|-------------|--------|
| `productId` | UUID | Sí | |
| `quantity` | int ≥ 1 | Sí | Si ya existe la misma línea (producto + variantes + notas + `branch_id`), se **suma** la cantidad y se actualiza snapshot de precio |
| `variantSelections` | objeto | No | Igual que `/cart/items` |
| `specialInstructions` | string | No | |
| `branchId` | UUID | Sí | Sucursal de contexto para disponibilidad y precio (PBA) |

**Regla actual de `branchId`:**

| `store.type` | `branchId` |
|--------------|------------|
| `branch` | **Obligatorio** y debe coincidir con `store.business_id`. |
| `group`, `group_brand` | **Obligatorio** y debe pertenecer al `business_group_id` del store. |
| `global_brand` | **Obligatorio**; sucursal activa con PBA habilitada. |
| `global` | **Obligatorio**; se valida contra sucursal activa y PBA habilitada. |

Validación de catálogo: precio base &gt; 0, producto disponible, PBA habilitada cuando aplica, y para `refaccion`/`accesorio` en tiendas con marca, `product_matches_vehicle_brand`.

---

### 7. Ajustar cantidad de un ítem

`PATCH /integrations/cart/:cartId/items/:itemId`

**Body JSON** (al menos uno):

| Campo | Descripción |
|-------|-------------|
| `quantity` | Cantidad absoluta (≥ 1 si es el único campo útil) |
| `quantityDelta` | Suma algebraica a la cantidad actual |

Si se envían **ambos**, el resultado es **`quantity + quantityDelta`**.

Si la cantidad resultante es **≤ 0**, se **elimina** el ítem. Si el carrito queda sin ítems, se **borra** el carrito; la respuesta puede ser **`null`**.

---

### 8. Eliminar un ítem

`DELETE /integrations/cart/:cartId/items/:itemId`

Si era el último ítem, se elimina el carrito; respuesta **`null`** en ese caso.

---

### 9. Eliminar carrito completo

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
# Host sin /api (el carrito de integración no usa el prefijo global)
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
