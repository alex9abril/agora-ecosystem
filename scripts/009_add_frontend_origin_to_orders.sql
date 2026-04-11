-- ============================================================================
-- AGORA ECOSYSTEM - Add: frontend_origin column to orders.orders
-- ============================================================================
-- Descripción: Agrega la columna frontend_origin a orders.orders para
-- guardar la URL base del frontend desde donde se realizó cada pedido.
-- Permite que los correos generen links al dominio correcto.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-04-11
-- Hora: 14:30:00
-- ============================================================================

\i ../database/agora/migration_orders_frontend_origin.sql
