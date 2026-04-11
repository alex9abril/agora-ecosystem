-- ============================================================================
-- AGORA ECOSYSTEM - Insert Masivo: Asignar IVA a todos los productos
-- ============================================================================
-- Descripción: Inserta en catalog.product_taxes una relación entre todos los
--              productos activos y el impuesto IVA (16%) para que aparezca
--              marcado en cada producto.
--              Usa ON CONFLICT DO NOTHING para no duplicar asignaciones
--              que ya existan.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-04-10
-- Hora: 23:00:00
-- ============================================================================

SET search_path TO catalog, core, public;

-- ============================================================================
-- 1. INSERT MASIVO: Asignar IVA 16% a todos los productos
-- ============================================================================

INSERT INTO catalog.product_taxes (product_id, tax_type_id, display_order)
SELECT
    p.id,
    '92a33a2b-ffa3-4828-8a94-a6aa6d50c7c0'::UUID,
    0
FROM catalog.products p
WHERE p.is_available = TRUE
ON CONFLICT (product_id, tax_type_id) DO NOTHING;

-- ============================================================================
-- 2. VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
    v_total_products INTEGER;
    v_assigned INTEGER;
    v_already_had INTEGER;
    v_newly_inserted INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_products
    FROM catalog.products WHERE is_available = TRUE;

    SELECT COUNT(*) INTO v_assigned
    FROM catalog.product_taxes
    WHERE tax_type_id = '92a33a2b-ffa3-4828-8a94-a6aa6d50c7c0';

    RAISE NOTICE '✅ Asignación masiva de IVA completada';
    RAISE NOTICE '   Productos activos totales: %', v_total_products;
    RAISE NOTICE '   Productos con IVA asignado: %', v_assigned;
END $$;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - Tax type ID: 92a33a2b-ffa3-4828-8a94-a6aa6d50c7c0 (IVA 16%)
-- - Solo se asigna a productos con is_available = TRUE
-- - ON CONFLICT DO NOTHING evita errores si un producto ya tenía IVA asignado
-- - No se usa override_rate, por lo que se aplica el rate del tax_type (0.16)
-- - Este script es idempotente: puede ejecutarse múltiples veces sin problema
-- ============================================================================
