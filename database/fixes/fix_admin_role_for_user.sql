-- ============================================================================
-- AGORA ECOSYSTEM - Fix: Set Admin Role for User
-- ============================================================================
-- Descripción: Actualiza el rol del usuario en core.user_profiles a 'admin'
-- para restaurar el acceso de administrador. Verifica que el usuario exista
-- y confirma el cambio al final.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-01-19
-- Hora: 20:26:35
-- ============================================================================

-- ============================================================================
-- CONFIGURACIÓN INICIAL
-- ============================================================================
SET search_path TO public, core, auth;

-- ============================================================================
-- CUERPO DEL SCRIPT
-- ============================================================================
DO $$
DECLARE
    v_user_id UUID := '7cb53446-c2e9-4101-8209-e30bad5580b4';
    v_email TEXT := 'alex9abril@gmail.com';
    v_rows INTEGER;
BEGIN
    -- Verificar que el usuario exista en auth.users
    IF NOT EXISTS (
        SELECT 1 FROM auth.users WHERE id = v_user_id OR email = v_email
    ) THEN
        RAISE EXCEPTION 'Usuario no encontrado en auth.users (id/email): %, %', v_user_id, v_email;
    END IF;

    -- Verificar que exista perfil en core.user_profiles
    IF NOT EXISTS (
        SELECT 1 FROM core.user_profiles WHERE id = v_user_id
    ) THEN
        RAISE EXCEPTION 'No existe perfil en core.user_profiles para id: %', v_user_id;
    END IF;

    -- Actualizar rol a admin
    UPDATE core.user_profiles
    SET role = 'admin'
    WHERE id = v_user_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 1 THEN
        RAISE EXCEPTION 'No se pudo actualizar el rol (filas afectadas: %)', v_rows;
    END IF;

    RAISE NOTICE 'Rol actualizado a admin para % (user_id: %)', v_email, v_user_id;
END $$;

-- ============================================================================
-- VERIFICACIONES
-- ============================================================================
SELECT
    id,
    role,
    first_name,
    last_name,
    is_active,
    is_blocked,
    updated_at
FROM core.user_profiles
WHERE id = '7cb53446-c2e9-4101-8209-e30bad5580b4';

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. Este script solo afecta core.user_profiles (no cambia auth.users).
-- 2. Si el login sigue fallando, revisa password y auth.users.
-- 3. No ejecutes scripts SQL directamente en producción sin respaldo.
-- ============================================================================
