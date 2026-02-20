# Flujo de la URL de imagen en el correo de confirmación de pedido

## Por qué el correo "transforma" la URL y los APIs de catálogo no

- **GET /api/catalog/products/:id** y **GET /api/catalog/products/:id/images** devuelven la URL **ya construida** (`primary_image_url`, `public_url`) porque en ese flujo se lee `file_path` (path relativo) y se llama a `getPublicUrl(bucket, path)` en el mismo servicio. La respuesta es esa URL lista.
- **El correo no llama a esos endpoints.** El correo ejecuta su propia query que devuelve:
  - `COALESCE( product_images.file_path, collections.image_url, products.image_url ) AS image_url`
- Es decir, el correo recibe **el valor crudo guardado en la base**: puede ser un path relativo (como en tus ejemplos), una URL S3, una URL doble antigua o una URL pública. Por eso en el flujo del correo sí se "transforma": se normaliza ese valor a un path relativo y se construye la misma URL que construirían los endpoints de catálogo (`getPublicUrl`). Cuando el valor ya es un path relativo (p. ej. `2ce967df-.../image-....jpg`), la "transformación" es solo construir la URL con `getPublicUrl`, igual que en product-images.

---

## Dónde se incrusta la imagen (el `src` del `<img>`)

La URL que termina en el correo es la que se pone en `item.image_url` cuando se construye el HTML de los ítems. Ese HTML se genera en **una sola función** que es la que escribe el `src`:

### 1. Función que escribe el `src` (incrustación real)

**Archivo:** `apps/backend/src/modules/orders/orders.service.ts`  
**Método:** `buildOrderItemsDetailHtml` (privado)  
**Líneas (aprox.):** 2429-2430

```ts
const imageHtml = item.image_url
  ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.item_name)}" style="width: 56px; height: 56px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb;" />`
  : `<div style="..."></div>`;
```

- Aquí **no se concatena nada**: se usa tal cual `item.image_url`.
- Si `item.image_url` ya viene mal (doble URL), esa misma URL sale en el correo.
- Gmail luego envuelve esa URL en su proxy (`ci3.googleusercontent.com/meips/...#TU_URL`); eso lo hace Gmail, no nuestro código.

La misma función existe en **KarloPay** para el flujo de pago:

**Archivo:** `apps/backend/src/modules/payments/karlopay/karlopay.service.ts`  
**Método:** `buildOrderItemsDetailHtml`  
**Líneas (aprox.):** 872-873

---

## Dónde se asigna `item.image_url` (y dónde puede “concatenarse” la URL doble)

`item.image_url` se llena en el **map** que resuelve cada `row` que viene del SQL, **antes** de llamar a `buildOrderItemsDetailHtml`. Ahí es donde puede generarse la URL doble si algo falla.

### 2. Orders: resolución de `image_url` para el correo

**Archivo:** `apps/backend/src/modules/orders/orders.service.ts`  
**Método:** `sendOrderConfirmationEmail` (privado)  
**Líneas (aprox.):** 2534-2569

Flujo en el `map`:

1. **Origen del valor:** `row.image_url` viene del SQL (COALESCE de `product_images.file_path`, `collections.image_url`, `products.image_url`).
2. **Unwrap:** se quita el prefijo doble `/object/public/https://...` en bucle (líneas 2540-2544).
3. **Si ya es URL pública correcta** (contiene `/storage/v1/object/public/` y no contiene `/object/public/http`), se usa tal cual (2550-2552).
4. **Normalización:** `path = normalizeStoragePath(image_url)` (2555).
5. **Aquí puede producirse la “doble URL”:**
   - Se llama `supabaseAdmin.storage.from(bucketProducts).getPublicUrl(path)` (2556-2557).
   - **Supabase** construye: `baseUrl + "/storage/v1/object/public/" + bucket + "/" + path`.
   - Si por algún motivo `path` es una **URL completa** (p. ej. la URL S3), entonces esa concatenación da la URL doble:
     - `https://...supabase.co/storage/v1/object/public/products/https://...storage.supabase.co/storage/v1/s3/...`

Es decir: **la “concatenación” que ves es la de Supabase** al hacer `getPublicUrl(bucket, path)` cuando `path` es una URL completa en lugar de un path relativo `uuid/filename`.

### 3. KarloPay: mismo patrón

**Archivo:** `apps/backend/src/modules/payments/karlopay/karlopay.service.ts`  
**Método:** `sendOrderConfirmationEmail`  
**Líneas (aprox.):** 979-1013

Misma lógica: unwrap → si ya es URL pública OK → `normalizeStoragePath` → `getPublicUrl(bucketProducts, path)`. Si `path` llega a ser URL completa, ahí se genera la doble.

---

## Util que puede devolver “path” como URL

**Archivo:** `apps/backend/src/utils/storage.utils.ts`  
**Función:** `normalizeStoragePath(filePath)`

- Debe devolver **solo** un path relativo tipo `uuid/filename` para usarlo en `getPublicUrl(bucket, path)`.
- Si en algún caso devuelve una URL completa (p. ej. por un caso no cubierto en las prioridades o por recursión), y ese valor se pasa a `getPublicUrl`, se produce la doble URL.
- En el código de orders/karlopay, si `path.startsWith('http')` se usa `path` directo como `image_url` (no se llama `getPublicUrl`), pero si en algún flujo se pasara ese mismo valor a `getPublicUrl`, se concatenaría.

---

## Resumen

| Qué quieres revisar | Archivo | Método / función | Líneas aprox. |
|---------------------|---------|-------------------|----------------|
| Dónde se escribe el `src` del `<img>` | `orders.service.ts` | `buildOrderItemsDetailHtml` | 2429-2430 |
| Dónde se escribe el `src` (KarloPay) | `karlopay.service.ts` | `buildOrderItemsDetailHtml` | 872-873 |
| Dónde se asigna `item.image_url` (y llamada a getPublicUrl) | `orders.service.ts` | `sendOrderConfirmationEmail` (map) | 2534-2569 |
| Igual para KarloPay | `karlopay.service.ts` | `sendOrderConfirmationEmail` (map) | 979-1013 |
| Dónde se “concatena” la doble URL | Supabase client | `storage.from(bucket).getPublicUrl(path)` | 2556-2557 (orders), 1001 (karlopay) |
| Quién debe dar path relativo | `storage.utils.ts` | `normalizeStoragePath` | 12-92 |

URL correcta que debe quedar en el correo:

`https://[project].supabase.co/storage/v1/object/public/products/[uuid]/[filename].jpg`

Si en el correo ves algo como:

`.../object/public/https://...storage.supabase.co/storage/v1/s3/...`

es porque en esa ejecución `path` pasado a `getPublicUrl` fue una URL completa en lugar de `uuid/filename`.
