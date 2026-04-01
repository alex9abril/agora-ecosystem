-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Estados logísticos normalizados y auditoría
-- ============================================================================
-- Descripción: Extiende orders.shipping_labels con estado de negocio
--              normalizado (prepared, carrier_received, in_transit, delivered),
--              último status raw de Skydropx/carrier, tracking_url, master
--              tracking, última fuente de sincronización y crea la tabla
--              orders.shipping_label_logistics_events para historial idempotente
--              (webhook, polling, manual_sync, simulation).
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-31
-- Hora: 12:00:00
-- ============================================================================

SET search_path TO public, orders;

-- ============================================================================
-- 1. Columnas en shipping_labels
-- ============================================================================

ALTER TABLE orders.shipping_labels
  ADD COLUMN IF NOT EXISTS logistics_status_normalized VARCHAR(32) DEFAULT 'prepared',
  ADD COLUMN IF NOT EXISTS tracking_status_raw TEXT,
  ADD COLUMN IF NOT EXISTS master_tracking_number VARCHAR(120),
  ADD COLUMN IF NOT EXISTS tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS logistics_sync_source VARCHAR(32),
  ADD COLUMN IF NOT EXISTS logistics_last_event_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_snapshot JSONB DEFAULT NULL;

COMMENT ON COLUMN orders.shipping_labels.logistics_status_normalized IS
  'Estado de negocio: prepared (guía lista), carrier_received (en paquetería/recolectado), in_transit, delivered, cancelled';
COMMENT ON COLUMN orders.shipping_labels.tracking_status_raw IS
  'Último estatus tal como lo reporta Skydropx o la paquetera (sin normalizar)';
COMMENT ON COLUMN orders.shipping_labels.master_tracking_number IS
  'Master tracking number del carrier si aplica (distinto del tracking de pieza)';
COMMENT ON COLUMN orders.shipping_labels.tracking_url IS
  'URL pública de rastreo del carrier (ej. tracking_url_provider de Skydropx)';
COMMENT ON COLUMN orders.shipping_labels.logistics_sync_source IS
  'Última fuente que movió el estado: webhook, polling, manual_sync, simulation, label_creation';
COMMENT ON COLUMN orders.shipping_labels.logistics_last_event_at IS
  'Marca de tiempo del último evento logístico aplicado (webhook o API)';
COMMENT ON COLUMN orders.shipping_labels.pickup_snapshot IS
  'Subproceso pickup opcional: pickup_id, status, window, request_number, errors (JSON). El avance principal sigue siendo el shipment tracking.';

-- Backfill desde status legado (generated -> prepared, etc.) para todas las filas
UPDATE orders.shipping_labels sl
SET
  logistics_status_normalized = CASE sl.status
    WHEN 'generated' THEN 'prepared'
    WHEN 'picked_up' THEN 'carrier_received'
    WHEN 'in_transit' THEN 'in_transit'
    WHEN 'delivered' THEN 'delivered'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'prepared'
  END,
  tracking_status_raw = COALESCE(sl.tracking_status_raw, sl.status);

ALTER TABLE orders.shipping_labels
  ALTER COLUMN logistics_status_normalized SET NOT NULL,
  ALTER COLUMN logistics_status_normalized SET DEFAULT 'prepared';

ALTER TABLE orders.shipping_labels
  DROP CONSTRAINT IF EXISTS chk_shipping_labels_logistics_normalized;

ALTER TABLE orders.shipping_labels
  ADD CONSTRAINT chk_shipping_labels_logistics_normalized CHECK (
    logistics_status_normalized IN (
      'prepared',
      'carrier_received',
      'in_transit',
      'delivered',
      'cancelled'
    )
  );

CREATE INDEX IF NOT EXISTS idx_shipping_labels_logistics_normalized
  ON orders.shipping_labels (logistics_status_normalized);

CREATE INDEX IF NOT EXISTS idx_shipping_labels_logistics_last_event
  ON orders.shipping_labels (logistics_last_event_at DESC NULLS LAST);

-- ============================================================================
-- 2. Historial de eventos logísticos (auditoría / idempotencia)
-- ============================================================================

CREATE TABLE IF NOT EXISTS orders.shipping_label_logistics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipping_label_id UUID NOT NULL REFERENCES orders.shipping_labels (id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders.orders (id) ON DELETE CASCADE,

  event_source VARCHAR(32) NOT NULL,
  raw_status TEXT,
  normalized_status VARCHAR(32) NOT NULL,
  label_status VARCHAR(50) NOT NULL,

  carrier_name VARCHAR(100),
  tracking_number VARCHAR(120),
  idempotency_key TEXT NOT NULL,

  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payload JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_shipping_label_logistics_events_source CHECK (
    event_source IN (
      'webhook',
      'polling',
      'manual_sync',
      'simulation',
      'label_creation'
    )
  ),
  CONSTRAINT uq_shipping_label_logistics_events_idempotency UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_ship_lbl_log_events_label_id
  ON orders.shipping_label_logistics_events (shipping_label_id);

CREATE INDEX IF NOT EXISTS idx_ship_lbl_log_events_order_id
  ON orders.shipping_label_logistics_events (order_id);

CREATE INDEX IF NOT EXISTS idx_ship_lbl_log_events_occurred
  ON orders.shipping_label_logistics_events (occurred_at DESC);

COMMENT ON TABLE orders.shipping_label_logistics_events IS
  'Historial append-only de cambios logísticos; idempotency_key evita duplicados en reintentos de webhook o sync.';

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - pickup_snapshot se rellena desde el backend cuando existan webhooks/API de
--   recolecciones; no sustituye al tracking del shipment.
-- - logistics_sync_source en shipping_labels refleja la última escritura; el
--   detalle por evento queda en shipping_label_logistics_events.
-- - Ejecutar este script solo en bases que ya tengan orders.shipping_labels.
