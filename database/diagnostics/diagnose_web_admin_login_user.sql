-- ============================================================================
-- AGORA ECOSYSTEM - Diagnose: Web-Admin Login User
-- ============================================================================
-- Descripción: Diagnostica si un usuario cumple las validaciones esperadas
-- para iniciar sesión en web-admin (auth.users + core.user_profiles).
-- Incluye verificación de email confirmado, password hash y rol admin.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-01-19
-- Hora: 21:07:55
-- ============================================================================

-- ============================================================================
-- CONFIGURACIÓN INICIAL
-- ============================================================================
SET search_path TO public, auth, core;

-- ============================================================================
-- PARAMETROS (ajusta el email si es necesario)
-- ============================================================================
DO $$
DECLARE
    v_email TEXT := 'alex9abril@gmail.com';
    v_user_id UUID;
BEGIN
    -- Obtener user_id desde auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE lower(email) = lower(v_email)
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE NOTICE '❌ Usuario NO encontrado en auth.users para email: %', v_email;
        RETURN;
    END IF;

    RAISE NOTICE '✅ Usuario encontrado en auth.users. user_id: %', v_user_id;
END $$;

-- ============================================================================
-- VALIDACIONES EN auth.users
-- ============================================================================
SELECT
    id,
    email,
    aud,
    role,
    is_anonymous,
    is_sso_user,
    banned_until,
    email_confirmed_at,
    confirmed_at,
    created_at,
    updated_at,
    last_sign_in_at,
    CASE
        WHEN encrypted_password IS NULL THEN 'NULL'
        WHEN length(encrypted_password) = 0 THEN 'EMPTY'
        ELSE 'SET'
    END AS encrypted_password_status
FROM auth.users
WHERE lower(email) = lower('alex9abril@gmail.com');

-- ============================================================================
-- VALIDACIONES EN auth.identities (proveedor email)
-- ============================================================================
SELECT
    id,
    user_id,
    provider,
    created_at,
    updated_at
FROM auth.identities
WHERE user_id IN (
    SELECT id FROM auth.users WHERE lower(email) = lower('alex9abril@gmail.com')
);

-- ============================================================================
-- VALIDACIONES EN core.user_profiles (rol admin)
-- ============================================================================
SELECT
    id,
    role,
    first_name,
    last_name,
    phone,
    phone_verified,
    is_active,
    is_blocked,
    created_at,
    updated_at
FROM core.user_profiles
WHERE id IN (
    SELECT id FROM auth.users WHERE lower(email) = lower('alex9abril@gmail.com')
);

-- ============================================================================
-- CHECKS RESUMEN (OK/FAIL)
-- ============================================================================
WITH user_auth AS (
    SELECT *
    FROM auth.users
    WHERE lower(email) = lower('alex9abril@gmail.com')
    LIMIT 1
),
user_profile AS (
    SELECT *
    FROM core.user_profiles
    WHERE id = (SELECT id FROM user_auth)
)
SELECT
    CASE WHEN (SELECT id FROM user_auth) IS NOT NULL THEN 'OK' ELSE 'FAIL' END AS has_auth_user,
    CASE WHEN (SELECT email_confirmed_at FROM user_auth) IS NOT NULL THEN 'OK' ELSE 'FAIL' END AS email_confirmed,
    CASE WHEN (SELECT banned_until FROM user_auth) IS NULL THEN 'OK' ELSE 'FAIL' END AS not_banned,
    CASE
        WHEN (SELECT encrypted_password FROM user_auth) IS NOT NULL
             AND length((SELECT encrypted_password FROM user_auth)) > 0
        THEN 'OK' ELSE 'FAIL'
    END AS has_password_hash,
    CASE WHEN (SELECT id FROM user_profile) IS NOT NULL THEN 'OK' ELSE 'FAIL' END AS has_profile,
    CASE WHEN (SELECT role FROM user_profile) = 'admin' THEN 'OK' ELSE 'FAIL' END AS role_is_admin,
    CASE WHEN (SELECT is_active FROM user_profile) = TRUE THEN 'OK' ELSE 'FAIL' END AS profile_active,
    CASE WHEN (SELECT is_blocked FROM user_profile) = FALSE THEN 'OK' ELSE 'FAIL' END AS profile_not_blocked;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. Si encrypted_password_status = NULL/EMPTY, el login fallará.
-- 2. Si role != 'admin', web-admin puede denegar acceso.
-- 3. Si email_confirmed_at es NULL, Supabase rechaza login.
-- 4. Si banned_until tiene fecha futura, el usuario está bloqueado.
-- ============================================================================
