-- ============================================================================
-- AGORA ECOSYSTEM - Create: Supervisor Notification Email Template
-- ============================================================================
-- Descripción: Agrega el template de correo genérico "Notificación para
-- Supervisores" al sistema de email templates en los 3 niveles
-- (global, grupo, sucursal). Se envía a los notification_recipients
-- configurados por sucursal/grupo cuando ocurre un evento relevante
-- (nueva venta, registro de cliente, cambio de estado de pedido).
-- ============================================================================
-- Versión: 1.1
-- Fecha: 2026-04-11
-- Hora: 14:00:00
-- ============================================================================

-- Ejecuta la migración principal
\i ../database/agora/migration_supervisor_order_report_template.sql
