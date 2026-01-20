-- ============================================================================
-- AGORA ECOSYSTEM - Diagnose: Admin Login Issue
-- ============================================================================
-- Descripción: Diagnostica el estado del usuario administrador en auth.users
-- y core.user_profiles. Incluye verificación de extensiones (pgcrypto) y
-- presencia de hash de password.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-01-19
-- Hora: 20:24:40
-- ============================================================================

-- ============================================================================
-- CONFIGURACIÓN INICIAL
-- ============================================================================
SET search_path TO public, auth, core, extensions;

-- ============================================================================
-- VERIFICAR EXTENSIONES RELEVANTES (pgcrypto)
-- ============================================================================
SELECT
    e.extname,
    n.nspname AS schema_name
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE e.extname IN ('pgcrypto')
ORDER BY e.extname;

-- Verificar funciones crypt/gen_salt disponibles
SELECT
    n.nspname AS schema_name,
    p.proname,
    pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN ('crypt', 'gen_salt')
ORDER BY p.proname, n.nspname;

-- ============================================================================
-- VERIFICAR USUARIO EN auth.users
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
WHERE email = 'alex9abril@gmail.com'
   OR id = '7cb53446-c2e9-4101-8209-e30bad5580b4';

-- ============================================================================
-- VERIFICAR IDENTIDADES (proveedores)
-- ============================================================================
SELECT
    id,
    user_id,
    provider,
    created_at,
    updated_at
FROM auth.identities
WHERE user_id = '7cb53446-c2e9-4101-8209-e30bad5580b4';

-- ============================================================================
-- VERIFICAR PERFIL EN core.user_profiles
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
WHERE id = '7cb53446-c2e9-4101-8209-e30bad5580b4';

-- ============================================================================
-- VERIFICAR ROLES EN NEGOCIOS (si aplica)
-- ============================================================================
SELECT
    bu.user_id,
    bu.business_id,
    bu.role,
    bu.is_active,
    bu.created_at,
    bu.updated_at
FROM core.business_users bu
WHERE bu.user_id = '7cb53446-c2e9-4101-8209-e30bad5580b4';

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. Si encrypted_password_status = NULL/EMPTY, el login con password fallará.
-- 2. Si no existe registro en core.user_profiles o role != 'admin', puede
--    haber restricciones de acceso en el backend.
-- 3. Si pgcrypto no está habilitado, no es posible resetear password vía SQL.
-- 4. Si banned_until tiene valor futuro, el usuario está bloqueado en Auth.
-- ============================================================================
