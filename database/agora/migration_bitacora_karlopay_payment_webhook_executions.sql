-- ============================================================================
-- AGORA ECOSYSTEM - Bitácora: webhook POST pago KarloPay
-- ============================================================================
-- Descripción: Una fila por llamada a POST /api/payments/karlopay/webhook/payment
--              (cuerpo saneado, metadatos HTTP, duración, éxito o error).
-- Requisito: schema bitacora (p. ej. migration_bitacora_integration_cart_executions.sql).
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-04-27
-- ============================================================================

SET search_path TO public;

CREATE SCHEMA IF NOT EXISTS bitacora;

CREATE TABLE bitacora.karlopay_payment_webhook_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    http_method TEXT NOT NULL,
    path TEXT NOT NULL,
    route_path TEXT,

    path_params JSONB,
    query_params JSONB,
    body_params JSONB,

    status_code INT,
    success BOOLEAN NOT NULL DEFAULT true,
    duration_ms INT,

    error_name TEXT,
    error_message TEXT,

    cart_id UUID,
    store_id UUID,

    response_summary JSONB,
    metadata JSONB
);

COMMENT ON TABLE bitacora.karlopay_payment_webhook_executions IS
    'Una fila por petición al webhook de confirmación de pago KarloPay (/api/payments/karlopay/webhook/payment).';
COMMENT ON COLUMN bitacora.karlopay_payment_webhook_executions.body_params IS
    'Resumen del cuerpo del webhook (saneado; sin datos de tarjeta completos).';
COMMENT ON COLUMN bitacora.karlopay_payment_webhook_executions.cart_id IS
    'Reservado; puede usarse si el payload enlaza un UUID interno.';
COMMENT ON COLUMN bitacora.karlopay_payment_webhook_executions.store_id IS
    'Reservado.';

CREATE INDEX idx_bitacora_kpwe_created_at ON bitacora.karlopay_payment_webhook_executions (created_at DESC);
CREATE INDEX idx_bitacora_kpwe_success ON bitacora.karlopay_payment_webhook_executions (success);

GRANT USAGE ON SCHEMA bitacora TO service_role;
GRANT SELECT, INSERT ON bitacora.karlopay_payment_webhook_executions TO service_role;
