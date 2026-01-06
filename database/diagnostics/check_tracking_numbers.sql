-- ============================================================================
-- DIAGNÓSTICO: Verificar tracking_numbers guardados en shipping_labels
-- ============================================================================
-- Este script verifica qué tracking_numbers se están guardando en la base
-- de datos y si provienen de Skydropx o son generados localmente.
--
-- Uso: Ejecutar después de crear un nuevo envío para verificar que el
--      tracking_number de Skydropx se esté guardando correctamente.
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- VERIFICAR TRACKING_NUMBERS RECIENTES
-- ============================================================================

SELECT 
    sl.id,
    sl.order_id,
    sl.tracking_number,
    sl.carrier_name,
    sl.status,
    sl.created_at,
    o.status as order_status,
    -- Verificar si el tracking_number parece ser de Skydropx (números largos)
    CASE 
        WHEN sl.tracking_number ~ '^[0-9]+$' AND LENGTH(sl.tracking_number) >= 10 THEN 'Posible Skydropx'
        WHEN sl.tracking_number LIKE 'AGO-%' THEN 'Generado localmente'
        ELSE 'Formato desconocido'
    END as tracking_source,
    -- Verificar metadata de Skydropx
    sl.metadata->>'skydropx_shipment_id' as skydropx_shipment_id,
    sl.metadata->>'workflow_status' as workflow_status,
    sl.metadata->>'carrier' as skydropx_carrier,
    sl.metadata->>'service' as skydropx_service
FROM orders.shipping_labels sl
LEFT JOIN orders.orders o ON sl.order_id = o.id
ORDER BY sl.created_at DESC
LIMIT 10;

-- ============================================================================
-- VERIFICAR SI HAY METADATA DE SKYDROPX PERO TRACKING_NUMBER LOCAL
-- ============================================================================

SELECT 
    sl.id,
    sl.order_id,
    sl.tracking_number,
    sl.carrier_name,
    sl.metadata->>'skydropx_shipment_id' as skydropx_shipment_id,
    sl.metadata->>'workflow_status' as workflow_status,
    -- Extraer tracking_number del metadata si existe
    sl.metadata->'full_response'->'data'->'attributes'->>'tracking_number' as skydropx_tracking_in_metadata,
    sl.metadata->'full_response'->'data'->'attributes'->>'label_url' as skydropx_label_url
FROM orders.shipping_labels sl
WHERE sl.metadata IS NOT NULL
  AND sl.metadata->>'skydropx_shipment_id' IS NOT NULL
  AND sl.tracking_number LIKE 'AGO-%'  -- Tracking number generado localmente
ORDER BY sl.created_at DESC
LIMIT 10;

-- ============================================================================
-- VERIFICAR ORDENES CON RATE_ID PERO SIN TRACKING_NUMBER DE SKYDROPX
-- ============================================================================

SELECT 
    o.id as order_id,
    o.status as order_status,
    oi.rate_id,
    oi.shipping_carrier,
    oi.shipping_service,
    sl.tracking_number,
    sl.carrier_name,
    CASE 
        WHEN sl.tracking_number LIKE 'AGO-%' THEN 'Generado localmente'
        WHEN sl.tracking_number ~ '^[0-9]+$' AND LENGTH(sl.tracking_number) >= 10 THEN 'Posible Skydropx'
        ELSE 'Formato desconocido'
    END as tracking_source
FROM orders.orders o
INNER JOIN orders.order_items oi ON o.id = oi.order_id
LEFT JOIN orders.shipping_labels sl ON o.id = sl.order_id
WHERE oi.rate_id IS NOT NULL
  AND o.status = 'completed'
ORDER BY o.created_at DESC
LIMIT 10;

-- ============================================================================
-- RESUMEN: CONTAR TRACKING_NUMBERS POR TIPO
-- ============================================================================

SELECT 
    CASE 
        WHEN tracking_number ~ '^[0-9]+$' AND LENGTH(tracking_number) >= 10 THEN 'Skydropx (numérico largo)'
        WHEN tracking_number LIKE 'AGO-%' THEN 'Generado localmente'
        ELSE 'Otro formato'
    END as tracking_type,
    COUNT(*) as cantidad,
    MAX(created_at) as ultimo_creado
FROM orders.shipping_labels
GROUP BY tracking_type
ORDER BY cantidad DESC;

