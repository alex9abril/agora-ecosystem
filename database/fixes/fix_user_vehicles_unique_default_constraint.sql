-- ============================================================================
-- FIX: Corregir constraint unique_default_vehicle en user_vehicles
-- ============================================================================
-- Descripción: El constraint actual UNIQUE (user_id, is_default) está mal
--              diseñado porque impide tener múltiples vehículos con 
--              is_default = FALSE para el mismo usuario.
-- 
-- Solución: Eliminar el constraint actual y crear un partial unique index
--           que solo se aplique cuando is_default = TRUE
-- 
-- Uso: Ejecutar para corregir el problema de duplicados al crear vehículos
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- 1. ELIMINAR CONSTRAINT INCORRECTO
-- ============================================================================

-- Eliminar el constraint único actual que está causando el problema
ALTER TABLE core.user_vehicles 
DROP CONSTRAINT IF EXISTS unique_default_vehicle;

-- ============================================================================
-- 2. CREAR PARTIAL UNIQUE INDEX CORRECTO
-- ============================================================================

-- Crear un índice único parcial que solo se aplique cuando is_default = TRUE
-- Esto permite múltiples vehículos con is_default = FALSE, pero solo uno con TRUE
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_vehicles_unique_default 
ON core.user_vehicles (user_id) 
WHERE is_default = TRUE AND is_active = TRUE;

-- ============================================================================
-- 3. VERIFICACIÓN
-- ============================================================================

-- Verificar que el índice se creó correctamente
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'core' 
  AND tablename = 'user_vehicles'
  AND indexname = 'idx_user_vehicles_unique_default';

-- ============================================================================
-- 4. VERIFICAR QUE NO HAY MÚLTIPLES VEHÍCULOS PREDETERMINADOS
-- ============================================================================

-- Verificar si hay usuarios con múltiples vehículos predeterminados (debería estar vacío)
SELECT 
    user_id,
    COUNT(*) as default_vehicles_count
FROM core.user_vehicles
WHERE is_default = TRUE AND is_active = TRUE
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Si hay resultados, corregirlos (dejar solo el más reciente como predeterminado)
DO $$
DECLARE
    v_user_record RECORD;
    v_vehicle_id UUID;
BEGIN
    FOR v_user_record IN 
        SELECT user_id, COUNT(*) as count
        FROM core.user_vehicles
        WHERE is_default = TRUE AND is_active = TRUE
        GROUP BY user_id
        HAVING COUNT(*) > 1
    LOOP
        -- Obtener el ID del vehículo más reciente
        SELECT id INTO v_vehicle_id
        FROM core.user_vehicles
        WHERE user_id = v_user_record.user_id
          AND is_default = TRUE
          AND is_active = TRUE
        ORDER BY created_at DESC
        LIMIT 1;
        
        -- Desmarcar todos los demás como predeterminados
        UPDATE core.user_vehicles
        SET is_default = FALSE,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = v_user_record.user_id
          AND is_default = TRUE
          AND is_active = TRUE
          AND id != v_vehicle_id;
        
        RAISE NOTICE 'Corregido usuario %: Múltiples vehículos predeterminados, dejando solo el más reciente (ID: %)', 
            v_user_record.user_id, v_vehicle_id;
    END LOOP;
END $$;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Verificar que ahora solo hay un vehículo predeterminado por usuario (o ninguno)
SELECT 
    'Verificación final:' AS info,
    COUNT(DISTINCT user_id) as usuarios_con_vehiculo_default,
    COUNT(*) as total_vehiculos_default
FROM core.user_vehicles
WHERE is_default = TRUE AND is_active = TRUE;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

