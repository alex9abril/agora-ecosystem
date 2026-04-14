-- ============================================================================
-- AGORA ECOSYSTEM - Verify: Estado de pedidos en la base de datos
-- ============================================================================
-- Descripción: Script de diagnóstico para verificar si existen pedidos en la
--              base de datos y el estado de todas las tablas relacionadas.
--              Ejecutar ANTES y DESPUÉS del script de purga para confirmar
--              que la depuración se aplicó correctamente.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-04-13
-- Hora: 14:00:00
-- ============================================================================

-- ============================================================================
-- 1. CONTEO GENERAL DE PEDIDOS
-- ============================================================================
SELECT
    '1. PEDIDOS (orders.orders)' AS tabla,
    COUNT(*) AS total_filas
FROM orders.orders

UNION ALL

SELECT
    '2. ITEMS (orders.order_items)',
    COUNT(*)
FROM orders.order_items

UNION ALL

SELECT
    '3. PAGOS (orders.payment_transactions)',
    (SELECT CASE
        WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='orders' AND table_name='payment_transactions')
        THEN (SELECT COUNT(*) FROM orders.payment_transactions)
        ELSE -1
    END)

UNION ALL

SELECT
    '4. ENVIOS (orders.shipping_labels)',
    (SELECT CASE
        WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='orders' AND table_name='shipping_labels')
        THEN (SELECT COUNT(*) FROM orders.shipping_labels)
        ELSE -1
    END)

UNION ALL

SELECT
    '5. EVENTOS LOGISTICOS (orders.shipping_label_logistics_events)',
    (SELECT CASE
        WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='orders' AND table_name='shipping_label_logistics_events')
        THEN (SELECT COUNT(*) FROM orders.shipping_label_logistics_events)
        ELSE -1
    END)

UNION ALL

SELECT
    '6. ENTREGAS (orders.deliveries)',
    (SELECT CASE
        WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='orders' AND table_name='deliveries')
        THEN (SELECT COUNT(*) FROM orders.deliveries)
        ELSE -1
    END)

UNION ALL

SELECT
    '7. VISTAS (orders.order_views)',
    (SELECT CASE
        WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='orders' AND table_name='order_views')
        THEN (SELECT COUNT(*) FROM orders.order_views)
        ELSE -1
    END)

UNION ALL

SELECT
    '8. DEVOLUCIONES (orders.order_returns)',
    (SELECT CASE
        WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='orders' AND table_name='order_returns')
        THEN (SELECT COUNT(*) FROM orders.order_returns)
        ELSE -1
    END)

UNION ALL

SELECT
    '9. REEMBOLSOS (orders.order_refunds)',
    (SELECT CASE
        WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='orders' AND table_name='order_refunds')
        THEN (SELECT COUNT(*) FROM orders.order_refunds)
        ELSE -1
    END)

UNION ALL

SELECT
    '10. HISTORIAL STATUS (orders.order_status_history)',
    (SELECT CASE
        WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='orders' AND table_name='order_status_history')
        THEN (SELECT COUNT(*) FROM orders.order_status_history)
        ELSE -1
    END)

UNION ALL

SELECT
    '11. RESENAS (reviews.reviews)',
    (SELECT CASE
        WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='reviews' AND table_name='reviews')
        THEN (SELECT COUNT(*) FROM reviews.reviews)
        ELSE -1
    END)

UNION ALL

SELECT
    '12. PROPINAS (reviews.tips)',
    (SELECT CASE
        WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='reviews' AND table_name='tips')
        THEN (SELECT COUNT(*) FROM reviews.tips)
        ELSE -1
    END)

UNION ALL

SELECT
    '13. INTEG LOGS (communication.integration_logs)',
    (SELECT CASE
        WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='communication' AND table_name='integration_logs')
        THEN (SELECT COUNT(*) FROM communication.integration_logs WHERE order_id IS NOT NULL)
        ELSE -1
    END)

UNION ALL

SELECT
    '14. WALLET TXN con order (commerce.wallet_transactions)',
    (SELECT CASE
        WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='commerce' AND table_name='wallet_transactions')
        THEN (SELECT COUNT(*) FROM commerce.wallet_transactions WHERE order_id IS NOT NULL)
        ELSE -1
    END)

UNION ALL

SELECT
    '15. PROMO USES (commerce.promotion_uses)',
    (SELECT CASE
        WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='commerce' AND table_name='promotion_uses')
        THEN (SELECT COUNT(*) FROM commerce.promotion_uses WHERE order_id IS NOT NULL)
        ELSE -1
    END)

ORDER BY tabla;

-- ============================================================================
-- 2. DETALLE DE PEDIDOS (si existen)
-- ============================================================================
SELECT
    o.id,
    o.status,
    o.total_amount,
    o.payment_method,
    o.payment_status,
    o.created_at,
    (SELECT COUNT(*) FROM orders.order_items oi WHERE oi.order_id = o.id) AS items_count
FROM orders.orders o
ORDER BY o.created_at DESC;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - total_filas = 0 en todas las filas significa que la depuración fue exitosa
-- - total_filas = -1 significa que la tabla no existe (migración no aplicada)
-- - Si ves filas con datos, el script de purga NO se ejecutó con COMMIT
