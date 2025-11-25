-- ============================================================================
-- CREAR PERFILES DE USUARIO (ASUMIENDO QUE LOS USUARIOS YA EXISTEN EN auth.users)
-- ============================================================================
-- Descripción: Crea perfiles en core.user_profiles para usuarios existentes
--              en auth.users. Ejecuta esto DESPUÉS de crear usuarios en el Dashboard.
-- 
-- Uso: Ejecuta esto después de crear los usuarios en Supabase Dashboard
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2024-11-18
-- ============================================================================

-- Configurar search_path
SET search_path TO public, auth, core;

-- ============================================================================
-- CREAR PERFILES EN core.user_profiles
-- ============================================================================
-- Los perfiles extienden la información de auth.users con roles y datos adicionales

DO $$
DECLARE
    v_cliente_id UUID;
    v_repartidor_id UUID;
    v_local_id UUID;
BEGIN
    -- Obtener IDs de auth.users por email
    SELECT id INTO v_cliente_id FROM auth.users WHERE email = 'cliente@example.com' LIMIT 1;
    SELECT id INTO v_repartidor_id FROM auth.users WHERE email = 'repartidor@example.com' LIMIT 1;
    SELECT id INTO v_local_id FROM auth.users WHERE email = 'local@example.com' LIMIT 1;
    
    -- Verificar que todos los usuarios existan
    IF v_cliente_id IS NULL THEN
        RAISE EXCEPTION 'Usuario cliente@example.com no encontrado en auth.users. Crea el usuario primero en Supabase Dashboard (Authentication > Users > Add User)';
    END IF;
    IF v_repartidor_id IS NULL THEN
        RAISE EXCEPTION 'Usuario repartidor@example.com no encontrado en auth.users. Crea el usuario primero en Supabase Dashboard (Authentication > Users > Add User)';
    END IF;
    IF v_local_id IS NULL THEN
        RAISE EXCEPTION 'Usuario local@example.com no encontrado en auth.users. Crea el usuario primero en Supabase Dashboard (Authentication > Users > Add User)';
    END IF;
    
    -- Crear perfil del Cliente (relación con auth.users)
    INSERT INTO core.user_profiles (
        id, role, first_name, last_name, phone,
        phone_verified, is_active, wallet_user_id
    ) VALUES (
        v_cliente_id,  -- ID de auth.users
        'client',
        'Juan',
        'Pérez',
        '+525512345678',
        TRUE,
        TRUE,
        'wallet-user-cliente-001'
    ) ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone;
    
    RAISE NOTICE '✅ Perfil creado para cliente (ID: %)', v_cliente_id;
    
    -- Crear perfil del Repartidor (relación con auth.users)
    INSERT INTO core.user_profiles (
        id, role, first_name, last_name, phone,
        phone_verified, is_active, wallet_user_id
    ) VALUES (
        v_repartidor_id,  -- ID de auth.users
        'repartidor',
        'Carlos',
        'González',
        '+525598765432',
        TRUE,
        TRUE,
        'wallet-user-repartidor-001'
    ) ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone;
    
    RAISE NOTICE '✅ Perfil creado para repartidor (ID: %)', v_repartidor_id;
    
    -- Crear perfil del Local (relación con auth.users)
    INSERT INTO core.user_profiles (
        id, role, first_name, last_name, phone,
        phone_verified, is_active, wallet_user_id
    ) VALUES (
        v_local_id,  -- ID de auth.users
        'local',
        'María',
        'Rodríguez',
        '+525555555555',
        TRUE,
        TRUE,
        'wallet-user-local-001'
    ) ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone;
    
    RAISE NOTICE '✅ Perfil creado para local (ID: %)', v_local_id;
    
    RAISE NOTICE '✅ Todos los perfiles creados exitosamente';
    
END $$;

-- ============================================================================
-- VERIFICAR QUE LOS PERFILES SE CREARON
-- ============================================================================

SELECT 
    up.id,
    au.email,
    up.role,
    up.first_name,
    up.last_name,
    up.phone,
    up.is_active
FROM core.user_profiles up
JOIN auth.users au ON au.id = up.id
WHERE au.email IN (
    'cliente@example.com',
    'repartidor@example.com',
    'local@example.com'
)
ORDER BY au.email;

-- ============================================================================
-- INSTRUCCIONES
-- ============================================================================
-- 1. Crea los usuarios en Supabase Dashboard:
--    Authentication > Users > Add User
--    - cliente@example.com
--    - repartidor@example.com
--    - local@example.com
--
-- 2. Ejecuta este script para crear los perfiles:
--    \i database/create_profiles_only.sql
--
-- ============================================================================

