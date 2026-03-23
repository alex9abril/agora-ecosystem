-- ============================================================================
-- AGORA ECOSYSTEM - Consulta: vistas automation por store_id
-- ============================================================================
-- Descripción: Ejecuta tres consultas contra automation.v_store_products,
--              automation.v_product_vehicle_compatibilities y
--              automation.v_store_vehicle_combinations para un mismo canal
--              de venta (core.stores.id). Sustituir el UUID si se requiere
--              otra tienda.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-19
-- Hora: 18:00:00
-- ============================================================================

SET search_path TO core, catalog, orders, automation, public;

-- ----------------------------------------------------------------------------
-- 1) Catálogo efectivo por tienda
-- ----------------------------------------------------------------------------

SELECT *
FROM automation.v_store_products
WHERE store_id = 'd3803a96-63dd-4b82-983f-c0c8cdc87d56'::uuid
ORDER BY sku NULLS LAST, product_name;

-- ----------------------------------------------------------------------------
-- 2) Compatibilidades (producto ↔ vehículo) solo para productos de esa tienda
-- ----------------------------------------------------------------------------

SELECT *
FROM automation.v_product_vehicle_compatibilities
WHERE store_id = 'd3803a96-63dd-4b82-983f-c0c8cdc87d56'::uuid
ORDER BY product_sku NULLS LAST, compatibility_id;

-- ----------------------------------------------------------------------------
-- 3) Combinaciones de vehículo deduplicadas / catálogo marca para esa tienda
-- ----------------------------------------------------------------------------

SELECT *
FROM automation.v_store_vehicle_combinations
WHERE store_id = 'd3803a96-63dd-4b82-983f-c0c8cdc87d56'::uuid
ORDER BY combination_origin, is_universal DESC NULLS LAST, vehicle_make NULLS LAST, vehicle_model NULLS LAST, vehicle_year NULLS LAST;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- 1. Si usas psql: \i scripts/001_select_automation_views_by_store_id.sql
-- 2. Cada bloque devuelve un result set independiente; en Supabase SQL Editor
--    ejecuta un SELECT a la vez o envuelve en una transacción de solo lectura.
-- 3. UUID de ejemplo: d3803a96-63dd-4b82-983f-c0c8cdc87d56 (cambiar según entorno).
-- ============================================================================
