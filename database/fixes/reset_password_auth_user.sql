-- ============================================================================
-- AGORA ECOSYSTEM - Fix: Reset Password for Auth User
-- ============================================================================
-- Descripción: Restablece el password de un usuario existente en auth.users
-- usando el email como identificador principal. Genera el hash con bcrypt
-- y actualiza updated_at para reflejar el cambio.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-01-19
-- Hora: 19:59:20
-- ============================================================================

-- ============================================================================
-- CONFIGURACIÓN INICIAL
-- ============================================================================
-- Habilitar pgcrypto para crypt()/gen_salt() si no existe
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

SET search_path TO public, auth, extensions;

-- ============================================================================
-- CUERPO DEL SCRIPT
-- ============================================================================
DO $$
DECLARE
    v_email TEXT := 'alex9abril@gmail.com';
    v_new_password TEXT := 'AGrijalva321';
    v_user_id UUID;
    v_rows INTEGER;
BEGIN
    -- Verificar que el usuario existe por email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_email
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no encontrado en auth.users con email: %', v_email;
    END IF;

    -- Actualizar password (hash bcrypt)
    UPDATE auth.users
    SET
        encrypted_password = extensions.crypt(v_new_password, extensions.gen_salt('bf')),
        updated_at = NOW()
    WHERE id = v_user_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 1 THEN
        RAISE EXCEPTION 'No se pudo actualizar el password (filas afectadas: %)', v_rows;
    END IF;

    RAISE NOTICE 'Password actualizado para % (user_id: %)', v_email, v_user_id;
END $$;

-- ============================================================================
-- VERIFICACIONES
-- ============================================================================
SELECT
    id,
    email,
    updated_at,
    last_sign_in_at
FROM auth.users
WHERE email = 'alex9abril@gmail.com';

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. Reemplaza CAMBIAR_PASSWORD_AQUI por el password deseado antes de ejecutar.
-- 2. Este script requiere permisos elevados (service_role) en Supabase.
-- 3. Si pgcrypto no puede habilitarse, usa el Dashboard o la API Admin.
-- 4. No guardes el password real en el repositorio después de usar el script.
-- ============================================================================
