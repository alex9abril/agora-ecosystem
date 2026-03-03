-- ============================================================================
-- [AGORA] - Query: Validar payload y datos de webhook para un pedido
-- ============================================================================
-- Descripción: Verifica que las transacciones del pedido bdcad4ad tengan
--              webhook_payload y webhook_received_at guardados (lo que recibió el hook).
-- Ejecutar en Supabase SQL Editor.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-02
-- ============================================================================

SET search_path TO orders, public;

-- 1) Resumen del pedido
SELECT
  o.id AS order_id,
  o.status AS order_status,
  o.payment_status AS order_payment_status,
  o.total_amount,
  o.confirmed_at AS order_confirmed_at
FROM orders.orders o
WHERE o.id = 'bdcad4ad-ed00-463b-a25e-aa105e9962f2';

-- 2) Transacciones: ver que webhook_payload y webhook_received_at estén guardados
SELECT
  pt.id AS transaction_id,
  pt.order_id,
  pt.payment_method,
  pt.external_reference,
  pt.amount,
  pt.status AS tx_status,
  pt.completed_at AS tx_completed_at,
  pt.webhook_received_at,
  (pt.webhook_payload IS NOT NULL) AS has_webhook_payload,
  pt.webhook_payload
FROM orders.payment_transactions pt
WHERE pt.order_id = 'bdcad4ad-ed00-463b-a25e-aa105e9962f2';
