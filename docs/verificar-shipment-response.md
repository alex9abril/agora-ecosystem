# 🔍 Cómo Verificar la Respuesta del Servicio de Shipment

Este documento explica las diferentes formas de verificar y comprobar la respuesta del servicio de shipment de Skydropx.

## 📋 Métodos de Verificación

### 1. **Consulta Directa en Base de Datos** (Recomendado)

Usa el script SQL de diagnóstico:

```bash
# Ejecuta el script de diagnóstico
psql -U tu_usuario -d tu_base_de_datos -f database/diagnostics/check_shipment_response.sql
```

O ejecuta directamente en tu cliente SQL:

```sql
-- Verificar shipping label por order ID
SELECT 
    sl.*,
    sl.metadata->>'skydropx_shipment_id' as skydropx_shipment_id,
    sl.metadata->>'workflow_status' as workflow_status,
    sl.metadata->>'carrier' as carrier,
    sl.metadata->>'service' as service,
    jsonb_pretty(sl.metadata) as metadata_formatted
FROM orders.shipping_labels sl
WHERE sl.order_id = 'TU_ORDER_ID_AQUI'
ORDER BY sl.created_at DESC
LIMIT 1;
```

### 2. **Endpoint GET - Obtener Guía por Order ID**

```bash
# Obtener la guía de envío completa
curl -X GET \
  'http://localhost:3000/api/logistics/shipping-labels/order/{ORDER_ID}' \
  -H 'Authorization: Bearer {TU_TOKEN}'
```

**Respuesta esperada:**
```json
{
  "id": "uuid",
  "order_id": "uuid",
  "tracking_number": "1234567890",
  "carrier_name": "FEDEX",
  "status": "generated",
  "pdf_url": "https://example.com/labels/shipment_123.pdf",
  "metadata": {
    "skydropx_shipment_id": "shipment_123456",
    "workflow_status": "success",
    "carrier": "fedex",
    "service": "FEDEX_EXPRESS",
    "full_response": {
      "data": {
        "id": "shipment_123456",
        "attributes": {
          "workflow_status": "success",
          "tracking_number": "1234567890",
          "label_url": "https://example.com/labels/shipment_123.pdf",
          "carrier": "fedex",
          "service": "FEDEX_EXPRESS"
        }
      }
    }
  },
  "generated_at": "2025-01-15T14:30:22Z"
}
```

### 3. **Verificar Logs del Backend**

Los logs del backend muestran información detallada:

```bash
# Ver logs en tiempo real
tail -f logs/backend.log | grep -i "shipment\|skydropx"
```

**Logs importantes a buscar:**
- `🚚 Creando envío en Skydropx con rate_id: ...`
- `✅ Shipment creado: ...`
- `✅ Envío creado en Skydropx: ...`
- `📄 PDF descargado y guardado: ...`
- `✅ Guía de envío creada: ...`

### 4. **Verificar desde el Frontend (web-local)**

En la página de detalle de orden (`/orders/{id}`), la guía de envío se muestra automáticamente si existe.

### 5. **Consulta SQL Rápida**

```sql
-- Verificar si una orden tiene rate_id y shipping label
SELECT 
    o.id as order_id,
    o.status,
    COUNT(DISTINCT oi.rate_id) as items_with_rate_id,
    COUNT(DISTINCT sl.id) as shipping_labels_count,
    sl.tracking_number,
    sl.metadata->>'workflow_status' as skydropx_status
FROM orders.orders o
LEFT JOIN orders.order_items oi ON o.id = oi.order_id
LEFT JOIN orders.shipping_labels sl ON o.id = sl.order_id
WHERE o.id = 'TU_ORDER_ID_AQUI'
GROUP BY o.id, o.status, sl.tracking_number, sl.metadata
```

## 🔍 Campos Importantes del Metadata

El campo `metadata` (JSONB) contiene:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `skydropx_shipment_id` | ID del shipment en Skydropx | `"shipment_123456"` |
| `workflow_status` | Estado del workflow | `"success"`, `"in_progress"`, `"failed"` |
| `carrier` | Carrier de Skydropx | `"fedex"`, `"dhl"`, `"estafeta"` |
| `service` | Servicio de Skydropx | `"FEDEX_EXPRESS"`, `"Standard Overnight"` |
| `full_response` | Respuesta completa de Skydropx | Objeto JSON completo |

## ✅ Checklist de Verificación

- [ ] **Rate ID guardado**: Verificar que `order_items.rate_id` no sea NULL
- [ ] **Shipping Label creado**: Verificar que existe registro en `shipping_labels`
- [ ] **Tracking Number**: Verificar que `tracking_number` no sea NULL
- [ ] **Metadata guardado**: Verificar que `metadata` no sea NULL
- [ ] **Workflow Status**: Verificar que `metadata->>'workflow_status'` sea `"success"`
- [ ] **PDF URL**: Verificar que `pdf_url` o `pdf_path` no sea NULL
- [ ] **Carrier correcto**: Verificar que `carrier_name` coincida con el seleccionado

## 🐛 Troubleshooting

### Si `metadata` es NULL:
- El shipment no se creó con Skydropx
- Se usó el método simulado como fallback
- Verificar logs para ver el error

### Si `workflow_status` es `"in_progress"`:
- El polling no completó correctamente
- Verificar logs para ver si hubo timeout
- Puede requerir polling manual

### Si `tracking_number` es NULL:
- El shipment no se completó en Skydropx
- Verificar `metadata->>'workflow_status'` para ver el estado
- Revisar `metadata->'full_response'` para ver el error

## 📝 Ejemplo de Verificación Completa

```sql
-- Verificación completa de una orden
WITH order_info AS (
  SELECT 
    o.id,
    o.status,
    o.created_at
  FROM orders.orders o
  WHERE o.id = 'TU_ORDER_ID_AQUI'
),
items_info AS (
  SELECT 
    oi.order_id,
    COUNT(*) as total_items,
    COUNT(oi.rate_id) as items_with_rate_id,
    MAX(oi.rate_id) as rate_id,
    MAX(oi.shipping_carrier) as carrier,
    MAX(oi.shipping_service) as service
  FROM orders.order_items oi
  WHERE oi.order_id = 'TU_ORDER_ID_AQUI'
  GROUP BY oi.order_id
),
shipping_info AS (
  SELECT 
    sl.order_id,
    sl.tracking_number,
    sl.carrier_name,
    sl.status,
    sl.metadata->>'workflow_status' as skydropx_status,
    sl.metadata->>'skydropx_shipment_id' as shipment_id,
    sl.pdf_url,
    sl.generated_at
  FROM orders.shipping_labels sl
  WHERE sl.order_id = 'TU_ORDER_ID_AQUI'
  ORDER BY sl.created_at DESC
  LIMIT 1
)
SELECT 
  oi.*,
  si.*,
  CASE 
    WHEN oi.items_with_rate_id > 0 AND si.tracking_number IS NOT NULL THEN '✅ OK'
    WHEN oi.items_with_rate_id > 0 AND si.tracking_number IS NULL THEN '⚠️ Rate ID existe pero no hay shipping label'
    WHEN oi.items_with_rate_id = 0 THEN '❌ No hay rate_id en los items'
    ELSE '❓ Estado desconocido'
  END as verification_status
FROM order_info o
LEFT JOIN items_info oi ON o.id = oi.order_id
LEFT JOIN shipping_info si ON o.id = si.order_id;
```

## 🔗 Referencias

- Script SQL: `database/diagnostics/check_shipment_response.sql`
- Endpoint: `GET /api/logistics/shipping-labels/order/:orderId`
- Tabla: `orders.shipping_labels`
- Campo metadata: `orders.shipping_labels.metadata` (JSONB)

