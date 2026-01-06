-- ============================================================================
-- DIAGNÓSTICO: Orden con rate_id pero sin shipping_label
-- ============================================================================
-- Este script ayuda a diagnosticar por qué una orden tiene rate_id pero
-- no se ha creado el shipping_label.
--
-- Uso: Reemplaza 'f811ab23-8b73-4230-ba5b-ca7aad626454' con tu order_id
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- 1. VERIFICAR INFORMACIÓN DE LA ORDEN
-- ============================================================================
SELECT 
    o.id as order_id,
    o.status as order_status,
    o.created_at as order_created_at,
    o.business_id,
    b.name as business_name,
    o.client_id,
    up.first_name || ' ' || COALESCE(up.last_name, '') as client_name
FROM orders.orders o
LEFT JOIN core.businesses b ON o.business_id = b.id
LEFT JOIN core.user_profiles up ON o.client_id = up.id
WHERE o.id = 'f811ab23-8b73-4230-ba5b-ca7aad626454';

-- ============================================================================
-- 2. VERIFICAR ORDER ITEMS Y RATE_ID
-- ============================================================================
SELECT 
    oi.id as item_id,
    oi.order_id,
    oi.product_id,
    oi.item_name,
    oi.quantity,
    oi.item_price,
    oi.quotation_id,
    oi.rate_id,  -- ⚠️ Este debe existir
    oi.shipping_carrier,
    oi.shipping_service,
    p.name as product_name,
    p.description as product_description,
    CASE 
        WHEN oi.rate_id IS NULL THEN '❌ NO HAY RATE_ID'
        ELSE '✅ Rate ID presente'
    END as rate_id_status
FROM orders.order_items oi
LEFT JOIN catalog.products p ON oi.product_id = p.id
WHERE oi.order_id = 'f811ab23-8b73-4230-ba5b-ca7aad626454';

-- ============================================================================
-- 3. VERIFICAR SI EXISTE SHIPPING_LABEL
-- ============================================================================
SELECT 
    sl.*,
    CASE 
        WHEN sl.id IS NULL THEN '❌ NO EXISTE SHIPPING_LABEL'
        ELSE '✅ Shipping label existe'
    END as shipping_label_status
FROM orders.shipping_labels sl
WHERE sl.order_id = 'f811ab23-8b73-4230-ba5b-ca7aad626454';

-- ============================================================================
-- 4. VERIFICAR DIRECCIONES (necesarias para crear shipment)
-- ============================================================================
-- Dirección del negocio (origen)
SELECT 
    'ORIGEN (Negocio)' as tipo,
    b.id as business_id,
    b.name as business_name,
    a.street,
    a.street_number,
    a.neighborhood,
    a.city,
    a.state,
    a.postal_code,
    a.country,
    CASE 
        WHEN a.id IS NULL THEN '❌ NO HAY DIRECCIÓN DEL NEGOCIO'
        WHEN a.postal_code IS NULL OR a.postal_code = '' THEN '⚠️ FALTA CÓDIGO POSTAL'
        WHEN a.city IS NULL OR a.city = '' THEN '⚠️ FALTA CIUDAD'
        WHEN a.state IS NULL OR a.state = '' THEN '⚠️ FALTA ESTADO'
        ELSE '✅ Dirección completa'
    END as direccion_status
FROM orders.orders o
INNER JOIN core.businesses b ON o.business_id = b.id
LEFT JOIN core.addresses a ON b.address_id = a.id
WHERE o.id = 'f811ab23-8b73-4230-ba5b-ca7aad626454'

UNION ALL

-- Dirección del cliente (destino)
SELECT 
    'DESTINO (Cliente)' as tipo,
    o.id as business_id,
    up.first_name || ' ' || COALESCE(up.last_name, '') as business_name,
    a.street,
    a.street_number,
    a.neighborhood,
    a.city,
    a.state,
    a.postal_code,
    a.country,
    CASE 
        WHEN a.id IS NULL THEN '❌ NO HAY DIRECCIÓN DE ENTREGA'
        WHEN a.postal_code IS NULL OR a.postal_code = '' THEN '⚠️ FALTA CÓDIGO POSTAL'
        WHEN a.city IS NULL OR a.city = '' THEN '⚠️ FALTA CIUDAD'
        WHEN a.state IS NULL OR a.state = '' THEN '⚠️ FALTA ESTADO'
        ELSE '✅ Dirección completa'
    END as direccion_status
FROM orders.orders o
LEFT JOIN core.addresses a ON o.delivery_address_id = a.id
LEFT JOIN core.user_profiles up ON o.client_id = up.id
WHERE o.id = 'f811ab23-8b73-4230-ba5b-ca7aad626454';

-- ============================================================================
-- 5. RESUMEN DE DIAGNÓSTICO
-- ============================================================================
WITH order_info AS (
    SELECT 
        o.id,
        o.status,
        o.delivery_address_id,
        b.address_id as business_address_id
    FROM orders.orders o
    LEFT JOIN core.businesses b ON o.business_id = b.id
    WHERE o.id = 'f811ab23-8b73-4230-ba5b-ca7aad626454'
),
items_info AS (
    SELECT 
        oi.order_id,
        COUNT(*) as total_items,
        COUNT(oi.rate_id) as items_with_rate_id,
        MAX(oi.rate_id) as rate_id
    FROM orders.order_items oi
    WHERE oi.order_id = 'f811ab23-8b73-4230-ba5b-ca7aad626454'
    GROUP BY oi.order_id
),
shipping_info AS (
    SELECT 
        sl.order_id,
        COUNT(*) as shipping_labels_count
    FROM orders.shipping_labels sl
    WHERE sl.order_id = 'f811ab23-8b73-4230-ba5b-ca7aad626454'
    GROUP BY sl.order_id
),
addresses_info AS (
    SELECT 
        o.id as order_id,
        CASE WHEN ba.id IS NOT NULL THEN 1 ELSE 0 END as has_business_address,
        CASE WHEN da.id IS NOT NULL THEN 1 ELSE 0 END as has_delivery_address,
        CASE WHEN ba.postal_code IS NOT NULL AND ba.postal_code != '' THEN 1 ELSE 0 END as business_has_postal_code,
        CASE WHEN da.postal_code IS NOT NULL AND da.postal_code != '' THEN 1 ELSE 0 END as delivery_has_postal_code
    FROM orders.orders o
    LEFT JOIN core.businesses b ON o.business_id = b.id
    LEFT JOIN core.addresses ba ON b.address_id = ba.id
    LEFT JOIN core.addresses da ON o.delivery_address_id = da.id
    WHERE o.id = 'f811ab23-8b73-4230-ba5b-ca7aad626454'
)
SELECT 
    oi.id as order_id,
    oi.status,
    ii.total_items,
    ii.items_with_rate_id,
    ii.rate_id,
    COALESCE(si.shipping_labels_count, 0) as shipping_labels_count,
    ai.has_business_address,
    ai.has_delivery_address,
    ai.business_has_postal_code,
    ai.delivery_has_postal_code,
    CASE 
        WHEN oi.status != 'completed' THEN '❌ Orden no está en estado "completed"'
        WHEN ii.items_with_rate_id = 0 THEN '❌ No hay rate_id en los items'
        WHEN COALESCE(si.shipping_labels_count, 0) > 0 THEN '✅ Shipping label ya existe'
        WHEN ai.has_business_address = 0 THEN '❌ Falta dirección del negocio'
        WHEN ai.has_delivery_address = 0 THEN '❌ Falta dirección de entrega'
        WHEN ai.business_has_postal_code = 0 THEN '⚠️ Falta código postal del negocio'
        WHEN ai.delivery_has_postal_code = 0 THEN '⚠️ Falta código postal de entrega'
        ELSE '✅ Todo listo para crear shipment (revisar logs del backend)'
    END as diagnostico
FROM order_info oi
LEFT JOIN items_info ii ON oi.id = ii.order_id
LEFT JOIN shipping_info si ON oi.id = si.order_id
LEFT JOIN addresses_info ai ON oi.id = ai.order_id;

