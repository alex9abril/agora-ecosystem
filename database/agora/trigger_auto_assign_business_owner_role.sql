-- ============================================================================
-- AGORA ECOSYSTEM - Trigger para asignar rol automáticamente al owner
-- ============================================================================
-- Descripción: Crea un trigger que asigna automáticamente el rol 'superadmin'
--              al owner cuando se crea una nueva sucursal
-- 
-- Uso: Ejecutar una vez para configurar el trigger automático
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- FUNCIÓN: Asignar rol automáticamente al owner de una nueva sucursal
-- ============================================================================

CREATE OR REPLACE FUNCTION core.auto_assign_business_owner_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo asignar rol si el business tiene owner_id y no existe ya un registro
    IF NEW.owner_id IS NOT NULL THEN
        INSERT INTO core.business_users (
            business_id,
            user_id,
            role,
            permissions,
            is_active,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            NEW.owner_id,
            'superadmin'::core.business_role,
            '{}'::jsonb,
            TRUE,
            COALESCE(NEW.created_at, CURRENT_TIMESTAMP),
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (business_id, user_id) DO UPDATE SET
            role = 'superadmin'::core.business_role,
            is_active = TRUE,
            updated_at = CURRENT_TIMESTAMP;
        
        RAISE NOTICE '✅ Rol superadmin asignado automáticamente al owner % de la sucursal %', NEW.owner_id, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.auto_assign_business_owner_role IS 'Asigna automáticamente el rol superadmin al owner cuando se crea una nueva sucursal';

-- ============================================================================
-- TRIGGER: Ejecutar después de insertar una nueva sucursal
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_auto_assign_business_owner_role ON core.businesses;

CREATE TRIGGER trigger_auto_assign_business_owner_role
    AFTER INSERT ON core.businesses
    FOR EACH ROW
    EXECUTE FUNCTION core.auto_assign_business_owner_role();

COMMENT ON TRIGGER trigger_auto_assign_business_owner_role ON core.businesses IS 'Asigna automáticamente el rol superadmin al owner cuando se crea una nueva sucursal';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que el trigger se creó correctamente
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_assign_business_owner_role';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

