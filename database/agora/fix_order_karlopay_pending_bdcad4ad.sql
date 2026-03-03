-- ============================================================================
-- [AGORA] - Fix: Orden Karlopay en estado pending hasta webhook
-- ============================================================================
-- Descripción: Diagnóstico y corrección del pedido bdcad4ad-ed00-463b-a25e-aa105e9962f2.
--              La orden debe quedar como payment_status = 'pending' y las transacciones
--              Karlopay como status = 'pending', completed_at = NULL hasta que el
--              webhook de Karlopay confirme el pago.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-02
-- Hora: 22:00:00
-- ============================================================================

SET search_path TO orders, core, communication, commerce, catalog, public;

-- ----------------------------------------------------------------------------
-- 1. DIAGNÓSTICO: Estado actual del pedido y sus transacciones
-- ----------------------------------------------------------------------------
SELECT
    o.id AS order_id,
    o.payment_method,
    o.payment_status AS order_payment_status,
    o.total_amount,
    o.delivery_notes,
    o.created_at AS order_created_at
FROM orders.orders o
WHERE o.id = 'bdcad4ad-ed00-463b-a25e-aa105e9962f2';

SELECT
    pt.id AS transaction_id,
    pt.order_id,
    pt.payment_method,
    pt.transaction_id AS pt_transaction_id,
    pt.external_reference,
    pt.amount,
    pt.status AS transaction_status,
    pt.completed_at,
    pt.payment_data->>'pending_webhook' AS pending_webhook,
    pt.payment_data->>'auto_completed' AS auto_completed,
    pt.created_at
FROM orders.payment_transactions pt
WHERE pt.order_id = 'bdcad4ad-ed00-463b-a25e-aa105e9962f2'
ORDER BY pt.created_at;

-- ----------------------------------------------------------------------------
-- 2. CORRECCIÓN: Poner orden y transacciones Karlopay en pending
-- ----------------------------------------------------------------------------
-- 2.1 Orden: payment_status = 'pending'
UPDATE orders.orders
SET payment_status = 'pending',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'bdcad4ad-ed00-463b-a25e-aa105e9962f2';

-- 2.2 Transacciones Karlopay: status = 'pending', completed_at = NULL
UPDATE orders.payment_transactions
SET status = 'pending',
    completed_at = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE order_id = 'bdcad4ad-ed00-463b-a25e-aa105e9962f2'
  AND payment_method = 'karlopay';

-- ----------------------------------------------------------------------------
-- 3. VERIFICACIÓN: Estado después del fix
-- ----------------------------------------------------------------------------
SELECT
    o.id,
    o.payment_status AS order_payment_status,
    o.updated_at AS order_updated_at
FROM orders.orders o
WHERE o.id = 'bdcad4ad-ed00-463b-a25e-aa105e9962f2';

SELECT
    pt.id,
    pt.payment_method,
    pt.status AS transaction_status,
    pt.completed_at,
    pt.updated_at
FROM orders.payment_transactions pt
WHERE pt.order_id = 'bdcad4ad-ed00-463b-a25e-aa105e9962f2';

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - Ejecutar este script contra la base de datos del proyecto (ej. psql o cliente SQL).
-- - El backend debe estar recompilado (npm run build en apps/backend) y reiniciado
--   para que los nuevos pedidos con Karlopay se creen ya en 'pending'; si no, seguirán
--   creándose como 'completed' y la orden como 'paid'.
-- - Después del fix, el pedido bdcad4ad-ed00-463b-a25e-aa105e9962f2 se verá como
--   Pendiente en web-local; al invocar el webhook de Karlopay con el numberOfOrder
--   correspondiente, la orden pasará a Totalmente Pagado.
-- ============================================================================
