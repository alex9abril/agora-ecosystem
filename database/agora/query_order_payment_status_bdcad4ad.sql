-- ============================================================================
-- [AGORA] - Consulta: Estado de pago del pedido bdcad4ad-ed00-463b-a25e-aa105e9962f2
-- ============================================================================
-- Ejecutar en Supabase SQL Editor o vía MCP.
-- ============================================================================

SET search_path TO orders, core, public;

-- Orden: estado de pago y datos principales
SELECT
    o.id AS order_id,
    o.payment_method,
    o.payment_status AS order_payment_status,
    o.payment_transaction_id,
    o.total_amount,
    o.status AS order_status,
    o.created_at AS order_created_at,
    o.delivery_notes
FROM orders.orders o
WHERE o.id = 'bdcad4ad-ed00-463b-a25e-aa105e9962f2';

-- Transacciones de pago (KarloPay, etc.) para esta orden
SELECT
    pt.id AS transaction_id,
    pt.order_id,
    pt.payment_method,
    pt.transaction_id AS external_tx_id,
    pt.external_reference,
    pt.amount,
    pt.status AS transaction_status,
    pt.completed_at,
    pt.payment_data->>'karlopay_number_of_order' AS karlopay_order_number,
    pt.payment_data->>'pending_webhook' AS pending_webhook,
    pt.created_at AS tx_created_at
FROM orders.payment_transactions pt
WHERE pt.order_id = 'bdcad4ad-ed00-463b-a25e-aa105e9962f2'
ORDER BY pt.created_at;
