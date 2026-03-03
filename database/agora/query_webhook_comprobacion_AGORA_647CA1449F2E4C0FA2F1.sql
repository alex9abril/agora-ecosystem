-- ============================================================================
-- [AGORA] - Query: Comprobación con AGORA_647CA1449F2E4C0FA2F1
-- ============================================================================
-- Descripción: Busca órdenes y transacciones asociadas al numberOfOrder
--              AGORA_647CA1449F2E4C0FA2F1 (external_reference / order_group_id).
--              Ejecutar en Supabase SQL Editor.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-02
-- ============================================================================

SET search_path TO orders, public;

-- 1) Órdenes del grupo (order_group_id = 647ca144-9f2e-4c0f-a2f1-1404fac68492)
SELECT
  o.id AS order_id,
  o.order_group_id,
  o.status AS order_status,
  o.payment_status AS order_payment_status,
  o.total_amount,
  o.confirmed_at AS order_confirmed_at,
  o.created_at
FROM orders.orders o
WHERE o.order_group_id = '647ca144-9f2e-4c0f-a2f1-1404fac68492';

-- 2) Transacciones con external_reference = AGORA_647CA1449F2E4C0FA2F1
SELECT
  pt.id AS transaction_id,
  pt.order_id,
  pt.payment_method,
  pt.transaction_id AS pt_transaction_id,
  pt.external_reference,
  pt.amount,
  pt.status AS tx_status,
  pt.completed_at AS tx_completed_at,
  pt.webhook_received_at,
  (pt.webhook_payload IS NOT NULL) AS has_webhook_payload,
  pt.webhook_payload
FROM orders.payment_transactions pt
WHERE pt.external_reference = 'AGORA_647CA1449F2E4C0FA2F1'
   OR pt.transaction_id = 'AGORA_647CA1449F2E4C0FA2F1';

-- 3) Mismo grupo: transacciones por order_id de las órdenes del punto 1
SELECT
  pt.id AS transaction_id,
  pt.order_id,
  pt.external_reference,
  pt.amount,
  pt.status AS tx_status,
  pt.completed_at,
  pt.webhook_received_at,
  (pt.webhook_payload IS NOT NULL) AS has_webhook_payload
FROM orders.payment_transactions pt
WHERE pt.order_id IN (
  SELECT id FROM orders.orders WHERE order_group_id = '647ca144-9f2e-4c0f-a2f1-1404fac68492'
)
ORDER BY pt.order_id, pt.created_at;
