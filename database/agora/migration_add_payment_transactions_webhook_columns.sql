-- ============================================================================
-- [AGORA] - Migration: payment_transactions webhook_payload y webhook_received_at
-- ============================================================================
-- Descripción: Añade a orders.payment_transactions las columnas para guardar
--              el payload completo del webhook (intacto) y la fecha/hora de
--              recepción del pago.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-02
-- Hora: 23:30:00
-- ============================================================================

SET search_path TO orders, public;

-- ----------------------------------------------------------------------------
-- Añadir columnas a payment_transactions
-- ----------------------------------------------------------------------------
ALTER TABLE orders.payment_transactions
  ADD COLUMN IF NOT EXISTS webhook_payload JSONB,
  ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMP;

COMMENT ON COLUMN orders.payment_transactions.webhook_payload IS 'Payload completo del webhook recibido (p. ej. Karlopay), guardado intacto para auditoría';
COMMENT ON COLUMN orders.payment_transactions.webhook_received_at IS 'Fecha/hora en que se recibió el webhook de pago (servidor)';

-- Índice opcional para consultas por fecha de recepción
CREATE INDEX IF NOT EXISTS idx_payment_transactions_webhook_received_at
  ON orders.payment_transactions(webhook_received_at)
  WHERE webhook_received_at IS NOT NULL;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - webhook_payload: solo se rellena cuando la transacción se actualiza/crea
--   desde un webhook (p. ej. Karlopay). Null para transacciones wallet/manual.
-- - webhook_received_at: mismo criterio; permite reportes por fecha de pago.
-- - Ejecución: el usuario debe correr este script en la base de datos.
-- ============================================================================
