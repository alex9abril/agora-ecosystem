-- ============================================================================
-- FIX: Corrección de la lógica de compatibilidad de productos con vehículos
-- ============================================================================
-- Descripción: Corrige la función check_product_vehicle_compatibility para
--              que sea más estricta y no permita compatibilidades incorrectas
--              entre modelos diferentes de la misma marca.
-- 
-- Problema: La función anterior permitía que un producto compatible con
--           "Toyota Corolla" fuera considerado compatible con "Toyota Tacoma"
--           solo porque compartían la misma marca.
--
-- Solución: La nueva lógica tiene dos pasos:
--           PASO 1 (Verificación de conflictos):
--           1. Si el vehículo tiene un model_id específico (ej: Tacoma), verificar que el producto
--              NO tenga registros con model_id diferente (ej: Corolla)
--           2. Si hay conflictos, retornar FALSE inmediatamente
--           PASO 2 (Verificación de compatibilidad positiva):
--           3. Buscar registros que coincidan: marca + (model_id igual o NULL) + (year_id igual o NULL) + (spec_id igual o NULL)
--           4. Si el producto solo tiene brand_id (sin model_id), es compatible con cualquier modelo de esa marca
--           5. Si el producto tiene model_id específico, solo es compatible con ese mismo modelo
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-01-XX
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- FUNCIÓN CORREGIDA: Verificar compatibilidad de un producto con un vehículo
-- ============================================================================
-- LÓGICA CORREGIDA (dos pasos):
-- PASO 1: Verificación de conflictos
--   - Si el vehículo tiene model_id específico, verificar que el producto NO tenga registros
--     con model_id diferente (esto evita que un producto compatible con "Corolla" sea
--     considerado compatible con "Tacoma" solo porque también tiene un registro genérico)
-- PASO 2: Verificación de compatibilidad positiva
--   - Buscar registros que coincidan: marca + (model_id igual o NULL) + (year_id igual o NULL) + (spec_id igual o NULL)
--   - Si encuentra coincidencias, retornar TRUE
-- ============================================================================

CREATE OR REPLACE FUNCTION catalog.check_product_vehicle_compatibility(
    p_product_id UUID,
    p_brand_id UUID DEFAULT NULL,
    p_model_id UUID DEFAULT NULL,
    p_year_id UUID DEFAULT NULL,
    p_spec_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_conflicting_model BOOLEAN;
BEGIN
    -- Si el vehículo tiene un model_id específico, verificar que el producto
    -- NO tenga registros con model_id diferente (conflictivos)
    IF p_model_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1
            FROM catalog.product_vehicle_compatibility pvc
            WHERE pvc.product_id = p_product_id
              AND pvc.is_active = TRUE
              AND pvc.is_universal = FALSE
              AND pvc.vehicle_brand_id = p_brand_id
              AND pvc.vehicle_model_id IS NOT NULL
              AND pvc.vehicle_model_id != p_model_id
        ) INTO v_has_conflicting_model;
        
        -- Si hay registros conflictivos (con model_id diferente), NO es compatible
        IF v_has_conflicting_model THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    -- Verificar compatibilidad positiva
    RETURN EXISTS(
        SELECT 1
        FROM catalog.product_vehicle_compatibility pvc
        WHERE pvc.product_id = p_product_id
          AND pvc.is_active = TRUE
          AND (
            -- Compatibilidad universal
            pvc.is_universal = TRUE
            OR
            -- Compatibilidad específica (lógica estricta)
            (
              -- La marca DEBE coincidir siempre
              pvc.vehicle_brand_id = p_brand_id
              
              -- MODEL_ID: Si el vehículo tiene model_id, el producto debe tener ese mismo model_id o no tenerlo
              -- Si el vehículo NO tiene model_id, acepta cualquier cosa
              AND (
                (p_model_id IS NOT NULL AND (
                  pvc.vehicle_model_id IS NULL 
                  OR pvc.vehicle_model_id = p_model_id
                ))
                OR
                (p_model_id IS NULL)
              )
              
              -- YEAR_ID: Si el vehículo tiene year_id, el producto debe tener ese mismo year_id o no tenerlo
              AND (
                (p_year_id IS NOT NULL AND (
                  pvc.vehicle_year_id IS NULL 
                  OR pvc.vehicle_year_id = p_year_id
                ))
                OR
                (p_year_id IS NULL)
              )
              
              -- SPEC_ID: Si el vehículo tiene spec_id, el producto debe tener ese mismo spec_id o no tenerlo
              AND (
                (p_spec_id IS NOT NULL AND (
                  pvc.vehicle_spec_id IS NULL 
                  OR pvc.vehicle_spec_id = p_spec_id
                ))
                OR
                (p_spec_id IS NULL)
              )
            )
          )
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION catalog.check_product_vehicle_compatibility IS 'Verifica si un producto es compatible con un vehículo específico (lógica corregida y estricta)';

