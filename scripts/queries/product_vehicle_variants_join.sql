-- ============================================================================
-- Productos con sus variantes de vehículo (compatibilidades)
-- ============================================================================
-- Relación: products <- product_vehicle_compatibility -> vehicle_variants
-- Una fila por cada par (producto, variante). Si is_universal = true, vv.* es NULL.
-- ============================================================================

SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.sku AS product_sku,
    pvc.id AS compatibility_id,
    pvc.is_universal,
    pvc.notes AS compatibility_notes,
    vv.id AS vehicle_variant_id,
    vv.make,
    vv.model,
    vv.year,
    vv.body_trim,
    vv.engine_transmission
FROM catalog.products p
LEFT JOIN catalog.product_vehicle_compatibility pvc
    ON pvc.product_id = p.id
    AND pvc.is_active = TRUE
LEFT JOIN catalog.vehicle_variants vv
    ON vv.id = pvc.vehicle_variant_id
ORDER BY p.name, pvc.is_universal DESC NULLS LAST, vv.make NULLS LAST, vv.model NULLS LAST, vv.year NULLS LAST;

-- ----------------------------------------------------------------------------
-- Solo productos que tienen al menos una compatibilidad (específica o universal)
-- ----------------------------------------------------------------------------
-- SELECT
--     p.id AS product_id,
--     p.name AS product_name,
--     p.sku,
--     pvc.is_universal,
--     vv.make,
--     vv.model,
--     vv.year,
--     vv.body_trim,
--     vv.engine_transmission
-- FROM catalog.products p
-- INNER JOIN catalog.product_vehicle_compatibility pvc ON pvc.product_id = p.id AND pvc.is_active = TRUE
-- LEFT JOIN catalog.vehicle_variants vv ON vv.id = pvc.vehicle_variant_id
-- WHERE p.business_id = 'TU-BUSINESS-ID-AQUI'
-- ORDER BY p.name, vv.make, vv.model, vv.year;
