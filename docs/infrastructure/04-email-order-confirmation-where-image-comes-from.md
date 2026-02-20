# Dónde se envía el correo y de dónde sale la imagen

## Método que envía el correo de confirmación

Hay **dos** flujos que pueden enviar el correo:

1. **Orders (después de crear el pedido)**  
   - **Archivo:** `apps/backend/src/modules/orders/orders.service.ts`  
   - **Método:** `sendOrderConfirmationEmail(orderId, businessId)` (privado)  
   - **Línea aprox.:** 2474  

2. **KarloPay (después del pago)**  
   - **Archivo:** `apps/backend/src/modules/payments/karlopay/karlopay.service.ts`  
   - **Método:** `sendOrderConfirmationEmail(orderId, businessId)` (privado)  
   - **Línea aprox.:** 917  

En ambos se hace lo mismo: se obtienen los ítems con la query, se resuelve la URL de la imagen y se construye el HTML que se manda al `emailService.sendOrderConfirmationEmail(...)`.

---

## Dónde se obtiene el dato de la imagen (Orders)

En **`orders.service.ts`**, dentro de `sendOrderConfirmationEmail`:

### 1. Query que trae el valor crudo de la imagen (líneas ~2503-2524)

```ts
const itemsResult = await dbPool.query(
  `SELECT 
     oi.item_name,
     oi.quantity,
     oi.item_subtotal,
     oi.item_price,
     COALESCE(
       (SELECT pi.file_path
        FROM catalog.product_images pi
        WHERE pi.product_id = oi.product_id AND pi.is_active = TRUE
        ORDER BY pi.is_primary DESC NULLS LAST, pi.display_order ASC
        LIMIT 1),
       c.image_url,
       p.image_url
     ) AS image_url
   FROM orders.order_items oi
   LEFT JOIN catalog.products p ON oi.product_id = p.id
   LEFT JOIN catalog.collections c ON oi.collection_id = c.id
   WHERE oi.order_id = $1
   ORDER BY oi.created_at, oi.id`,
  [orderId]
);
```

- **`image_url`** que devuelve esta query es el valor que está guardado en la BD:
  - Primero: `product_images.file_path` (path relativo o lo que se haya guardado).
  - Si no hay: `collections.image_url`.
  - Si no hay: `products.image_url`.

Ese valor es el que llega en **`row.image_url`** a la siguiente parte.

### 2. Resolución de la URL (líneas ~2535-2542)

```ts
const bucketProducts = process.env.SUPABASE_STORAGE_BUCKET_PRODUCTS || 'products';
const items = rawItems.map((row) => {
  const resolvedImageUrl = resolveProductImagePublicUrl(
    row.image_url || '',
    bucketProducts,
    supabaseAdmin,
  );
  return { ...row, image_url: resolvedImageUrl };
});
```

- **Entrada:** `row.image_url` (lo que devolvió el COALESCE de la query).
- **Salida:** `resolvedImageUrl` es lo que se usa como URL de la imagen en el correo.

La función **`resolveProductImagePublicUrl`** está en:
- **Archivo:** `apps/backend/src/utils/storage.utils.ts`  
- **Líneas aprox.:** 109-153  

Ahí se hace: unwrap de URL doble, normalización a path `uuid/filename` y `getPublicUrl(bucket, path)`.

### 3. Dónde se escribe el `src` de la imagen en el HTML (líneas ~2429-2430)

```ts
const imageHtml = item.image_url
  ? `<img src="${escapeHtml(item.image_url)}" alt="..." ... />`
  : `<div ...></div>`;
```

- **`item.image_url`** aquí es el **`resolvedImageUrl`** del paso anterior (ya está en `items`).
- Ese string es el que va en el `src` del correo. No se concatena nada más.

### 4. Dónde se envía el correo (líneas ~2605-2618)

```ts
await this.emailService.sendOrderConfirmationEmail(
  userEmail,
  orderNumber,
  orderDate,
  orderTotal,
  paymentMethod,
  orderUrl,
  orderItemsDetailHtml,   // <-- aquí va el HTML con los <img src="...">
  order.business_id,
  order.business_group_id,
  { userId: order.client_id, orderId: order.id }
);
```

---

## Resumen del flujo del dato de la imagen

1. **BD** → query con `COALESCE( product_images.file_path, c.image_url, p.image_url )` → **`row.image_url`**
2. **`resolveProductImagePublicUrl(row.image_url, ...)`** → **`resolvedImageUrl`**
3. **`items`** = cada row con **`image_url: resolvedImageUrl`**
4. **`buildOrderItemsDetailHtml(items)`** → HTML con **`<img src="${item.image_url}">`**
5. **`emailService.sendOrderConfirmationEmail(..., orderItemsDetailHtml)`** → ese HTML es el que lleva la URL en el `src`.

Si en el correo sigue saliendo la URL doble, entonces o bien:
- **`row.image_url`** que sale de la BD ya es la URL doble y **`resolveProductImagePublicUrl`** no la está corrigiendo, o
- El correo que estás viendo se envió por **KarloPay** (mismo flujo pero en `karlopay.service.ts`) y ahí el dato o la versión del código pueden ser distintos.

En consola (solo en desarrollo) verás un log con el **valor crudo** de `row.image_url` y el **valor resuelto** para cada ítem al enviar el correo; con eso puedes comprobar qué está entrando y qué está saliendo.
