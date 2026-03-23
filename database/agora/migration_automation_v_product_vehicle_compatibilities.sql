-- ============================================================================
-- AGORA ECOSYSTEM - Vista automation: compatibilidades vehículo por tienda
-- ============================================================================
-- Descripción: Una fila por registro activo de catalog.product_vehicle_compatibility
--              restringido a productos que aparecen en automation.v_store_products
--              para el mismo store_id. Permite filtrar por store_id y obtener solo
--              compatibilidades de refacciones/accesorios (u otros) publicados en
--              ese canal (global, grupo, sucursal, marca, etc.).
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-19
-- Hora: 16:00:00
-- ============================================================================

SET search_path TO core, catalog, orders, automation, public;

CREATE SCHEMA IF NOT EXISTS automation;

COMMENT ON SCHEMA automation IS
    'Objetos de lectura para automatizaciones (ej. WhatsApp, ETL): vistas que cruzan core/catalog sin duplicar datos.';

-- Requiere automation.v_store_products (migration_v_store_products.sql).

DROP VIEW IF EXISTS automation.v_product_vehicle_compatibilities;

CREATE OR REPLACE VIEW automation.v_product_vehicle_compatibilities AS
SELECT
    sp.store_id,
    sp.store_type,
    sp.store_slug,
    sp.store_name,
    sp.pricing_scope,
    sp.store_business_group_id,
    sp.store_business_id,
    sp.store_vehicle_brand_id,
    pvc.id AS compatibility_id,
    sp.product_id,
    sp.sku AS product_sku,
    sp.product_name,
    sp.product_type,
    pvc.is_universal,
    pvc.notes AS compatibility_notes,
    pvc.created_at AS compatibility_created_at,
    pvc.updated_at AS compatibility_updated_at,
    pvc.vehicle_variant_id,
    vv.make AS vehicle_make,
    vv.model AS vehicle_model,
    vv.year AS vehicle_year,
    vv.body_trim AS vehicle_body_trim,
    vv.engine_transmission AS vehicle_engine_transmission,
    vv.is_active AS vehicle_variant_is_active,
    vb.id AS matched_vehicle_brand_id,
    vb.code AS matched_vehicle_brand_code,
    vb.name AS matched_vehicle_brand_name,
    CASE
        WHEN pvc.is_universal THEN 'Universal'::text
        WHEN vv.id IS NOT NULL THEN
            CONCAT_WS(
                ' ',
                NULLIF(TRIM(vv.make), ''),
                NULLIF(TRIM(vv.model), ''),
                NULLIF(vv.year::text, ''),
                NULLIF(TRIM(vv.body_trim), ''),
                NULLIF(TRIM(vv.engine_transmission), '')
            )
        ELSE NULL
    END AS compatibility_label
FROM automation.v_store_products sp
INNER JOIN catalog.product_vehicle_compatibility pvc
    ON pvc.product_id = sp.product_id
    AND pvc.is_active = TRUE
LEFT JOIN catalog.vehicle_variants vv
    ON vv.id = pvc.vehicle_variant_id
LEFT JOIN LATERAL (
    SELECT b.id, b.code, b.name
    FROM catalog.vehicle_brands b
    WHERE b.is_active = TRUE
      AND LOWER(TRIM(b.name)) = LOWER(TRIM(vv.make))
    ORDER BY b.display_order NULLS LAST, b.name
    LIMIT 1
) vb ON TRUE
WHERE (pvc.is_universal = TRUE OR vv.id IS NULL OR vv.is_active = TRUE);

COMMENT ON VIEW automation.v_product_vehicle_compatibilities IS
    'Compatibilidades (product_vehicle_compatibility) solo para productos del catálogo por tienda (v_store_products). Filtrar: WHERE store_id = $1. matched_vehicle_* enlaza make de la variante con vehicle_brands por nombre (case-insensitive).';

-- ============================================================================
-- NOTAS
-- ============================================================================
-- 1. Ejecutar después de migration_v_store_products.sql (depende de automation.v_store_products).
-- 2. Ejemplo: SELECT * FROM automation.v_product_vehicle_compatibilities WHERE store_id = $1;
-- 3. Filas universal: vehicle_* y matched_vehicle_* son NULL salvo etiqueta "Universal".
-- 4. Si varias marcas comparten el mismo nombre, matched_vehicle_brand_* toma una fila
--    (orden display_order, name); ajustar si el catálogo requiere otro criterio.
-- 5. Excluye variantes inactivas en filas no universales (vv.is_active = FALSE no aparece).
-- 6. Combinaciones deduplicadas por tienda (variantes + catálogo marca):
--    migration_automation_v_store_vehicle_combinations.sql → automation.v_store_vehicle_combinations.
-- ============================================================================
