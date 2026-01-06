-- ============================================================================
-- DIAGNÓSTICO: Verificar respuesta del servicio de shipment
-- ============================================================================
-- Este script ayuda a verificar la respuesta completa del servicio de shipment
-- de Skydropx, incluyendo el metadata guardado.
--
-- Uso:
-- 1. Reemplaza {ORDER_ID} con el ID de la orden que quieres verificar
-- 2. Ejecuta el script en tu base de datos
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- 1. VERIFICAR SHIPPING LABEL POR ORDER ID
-- ============================================================================
-- Reemplaza 'TU_ORDER_ID_AQUI' con el ID real de la orden
SELECT 
    sl.id,
    sl.order_id,
    sl.tracking_number,
    sl.carrier_name,
    sl.status,
    sl.origin_address,
    sl.destination_address,
    sl.destination_name,
    sl.destination_phone,
    sl.package_weight,
    sl.package_dimensions,
    sl.declared_value,
    sl.pdf_url,
    sl.pdf_path,
    sl.generated_at,
    sl.created_at,
    -- Metadata completo (respuesta de Skydropx)
    sl.metadata,
    -- Extraer campos específicos del metadata
    sl.metadata->>'skydropx_shipment_id' as skydropx_shipment_id,
    sl.metadata->>'workflow_status' as workflow_status,
    sl.metadata->>'carrier' as carrier_from_metadata,
    sl.metadata->>'service' as service_from_metadata,
    -- Respuesta completa de Skydropx
    sl.metadata->'full_response' as skydropx_full_response
FROM orders.shipping_labels sl
WHERE sl.order_id = 'TU_ORDER_ID_AQUI'  -- ⚠️ REEMPLAZA ESTO
ORDER BY sl.created_at DESC
LIMIT 1;

-- ============================================================================
-- 2. VERIFICAR TODAS LAS GUÍAS DE ENVÍO CON METADATA
-- ============================================================================
SELECT 
    sl.id,
    sl.order_id,
    sl.tracking_number,
    sl.carrier_name,
    sl.status,
    sl.metadata->>'workflow_status' as skydropx_workflow_status,
    sl.metadata->>'skydropx_shipment_id' as skydropx_shipment_id,
    sl.metadata->>'carrier' as skydropx_carrier,
    sl.metadata->>'service' as skydropx_service,
    sl.generated_at,
    sl.created_at
FROM orders.shipping_labels sl
WHERE sl.metadata IS NOT NULL
ORDER BY sl.created_at DESC
LIMIT 10;

-- ============================================================================
-- 3. VERIFICAR ORDER ITEMS CON RATE_ID (para verificar que se guardó correctamente)
-- ============================================================================
SELECT 
    oi.id,
    oi.order_id,
    oi.product_id,
    oi.item_name,
    oi.quantity,
    oi.quotation_id,
    oi.rate_id,  -- ⭐ Este es el ID que se usa para crear el shipment
    oi.shipping_carrier,
    oi.shipping_service,
    oi.created_at
FROM orders.order_items oi
WHERE oi.order_id = 'TU_ORDER_ID_AQUI'  -- ⚠️ REEMPLAZA ESTO
ORDER BY oi.created_at ASC;

-- ============================================================================
-- 4. VERIFICAR ORDENES CON RATE_ID PERO SIN SHIPPING LABEL
-- ============================================================================
-- Útil para encontrar órdenes que deberían tener guía pero no la tienen
SELECT 
    o.id as order_id,
    o.status as order_status,
    o.created_at as order_created_at,
    COUNT(oi.id) as items_count,
    COUNT(oi.rate_id) as items_with_rate_id,
    MAX(oi.rate_id) as rate_id,
    MAX(oi.shipping_carrier) as carrier,
    MAX(oi.shipping_service) as service
FROM orders.orders o
INNER JOIN orders.order_items oi ON o.id = oi.order_id
WHERE oi.rate_id IS NOT NULL
  AND o.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 
    FROM orders.shipping_labels sl 
    WHERE sl.order_id = o.id
  )
GROUP BY o.id, o.status, o.created_at
ORDER BY o.created_at DESC
LIMIT 10;

-- ============================================================================
-- 5. VERIFICAR METADATA COMPLETO (formato JSON legible)
-- ============================================================================
-- Reemplaza 'TU_ORDER_ID_AQUI' con el ID real de la orden
SELECT 
    sl.order_id,
    sl.tracking_number,
    jsonb_pretty(sl.metadata) as metadata_formatted
FROM orders.shipping_labels sl
WHERE sl.order_id = 'TU_ORDER_ID_AQUI'  -- ⚠️ REEMPLAZA ESTO
  AND sl.metadata IS NOT NULL
ORDER BY sl.created_at DESC
LIMIT 1;

-- ============================================================================
-- 6. VERIFICAR ESTRUCTURA DEL METADATA
-- ============================================================================
-- Ver qué campos tiene el metadata
SELECT 
    sl.order_id,
    jsonb_object_keys(sl.metadata) as metadata_keys
FROM orders.shipping_labels sl
WHERE sl.metadata IS NOT NULL
GROUP BY sl.order_id, sl.metadata
LIMIT 5;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- El campo 'metadata' contiene:
-- - skydropx_shipment_id: ID del shipment en Skydropx
-- - workflow_status: Estado del workflow ('in_progress', 'success', 'failed')
-- - carrier: Carrier de Skydropx
-- - service: Servicio de Skydropx
-- - full_response: Respuesta completa de la API de Skydropx
--
-- Para ver el contenido completo del metadata, usa la consulta #5
-- ============================================================================

