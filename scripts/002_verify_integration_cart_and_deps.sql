-- ============================================================================
-- AGORA ECOSYSTEM - Verificación: tablas carrito integración y dependencias
-- ============================================================================
-- Descripción: Comprueba si existen orders.integration_carts, integration_cart_items
--              y las tablas referenciadas por FK (core.stores, catalog.products).
--              Ejecutar en Supabase SQL Editor (mismo proyecto que DATABASE_URL).
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-23
-- Hora: 12:30:00
-- ============================================================================

SELECT
  to_regclass('orders.integration_carts') AS integration_carts,
  to_regclass('orders.integration_cart_items') AS integration_cart_items,
  to_regclass('core.stores') AS core_stores,
  to_regclass('catalog.products') AS catalog_products;

-- NOTAS
-- - Si integration_carts es NULL, ejecute database/agora/migration_integration_cart.sql
--   completo en este proyecto.
-- - Si core_stores o catalog_products son NULL, el CREATE TABLE de la migración
--   fallará hasta que existan esos objetos en la BD.
