-- ============================================================================
-- CREAR USUARIOS DE PRUEBA EN SUPABASE AUTH
-- ============================================================================
-- Descripción: Crea usuarios en auth.users (tabla de autenticación de Supabase)
--              y luego crea los perfiles relacionados en core.user_profiles
-- 
-- ⚠️ ADVERTENCIA: Este script requiere permisos de service_role o superusuario.
--    En Supabase, normalmente NO puedes insertar directamente en auth.users.
--    Si falla, usa el Dashboard o la API de Supabase.
-- ============================================================================
-- Versión: 2.1
-- Fecha: 2024-11-18
-- ============================================================================

-- Configurar search_path
SET search_path TO public, auth, core;

-- ============================================================================
-- FUNCIÓN PARA CREAR USUARIO DE PRUEBA
-- ============================================================================

CREATE OR REPLACE FUNCTION create_test_user(
    p_email TEXT,
    p_password TEXT DEFAULT 'password123',
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_instance_id UUID;
    v_user_id UUID;
    v_encrypted_password TEXT;
BEGIN
    -- Obtener instance_id de diferentes formas
    -- En Supabase, puede estar en auth.instances o podemos usar un valor por defecto
    SELECT id INTO v_instance_id FROM auth.instances LIMIT 1;
    
    -- Si no se encuentra, intentar obtenerlo de otra forma
    -- En Supabase, el instance_id puede estar en diferentes lugares
    IF v_instance_id IS NULL THEN
        -- Intentar obtener de usuarios existentes
        SELECT instance_id INTO v_instance_id 
        FROM auth.users 
        WHERE instance_id IS NOT NULL 
        LIMIT 1;
        
        -- Si aún no se encuentra, lanzar error con instrucciones
        IF v_instance_id IS NULL THEN
            RAISE EXCEPTION 'No se encontró instance_id. Esto generalmente significa que no tienes permisos para crear usuarios directamente en auth.users. Usa el Dashboard de Supabase (Authentication > Users > Add User) o la API de Supabase en su lugar.';
        END IF;
    END IF;
    
    -- Usar el ID proporcionado o generar uno nuevo
    IF p_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
    ELSE
        v_user_id := p_user_id;
    END IF;
    
    -- Encriptar password
    v_encrypted_password := crypt(p_password, gen_salt('bf'));
    
    -- Intentar insertar usuario
    -- Nota: En Supabase, algunos campos pueden ser opcionales o manejados automáticamente
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role,
        aud
    ) VALUES (
        v_user_id,
        COALESCE(v_instance_id, (SELECT id FROM auth.instances LIMIT 1)), -- Intentar obtener de nuevo o usar NULL
        p_email,
        v_encrypted_password,
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{}',
        FALSE,
        'authenticated',
        'authenticated'
    ) ON CONFLICT (id) DO NOTHING
    RETURNING id INTO v_user_id;
    
    -- Si no se insertó (conflicto), obtener el ID existente
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
        RAISE NOTICE 'Usuario % ya existe con ID: %', p_email, v_user_id;
    ELSE
        RAISE NOTICE 'Usuario % creado con ID: %', p_email, v_user_id;
    END IF;
    
    RETURN v_user_id;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creando usuario %: %', p_email, SQLERRM;
END;
$$;

-- ============================================================================
-- PASO 1: CREAR USUARIOS EN auth.users (TABLA DE AUTENTICACIÓN)
-- ============================================================================

-- Ejecutar la función para crear cada usuario en auth.users
-- Esto crea los usuarios en la tabla de autenticación de Supabase
SELECT create_test_user('cliente@example.com', 'password123') AS cliente_id;
SELECT create_test_user('repartidor@example.com', 'password123') AS repartidor_id;
SELECT create_test_user('local@example.com', 'password123') AS local_id;

-- ============================================================================
-- PASO 2: CREAR PERFILES EN core.user_profiles (RELACIÓN CON auth.users)
-- ============================================================================
-- Los perfiles extienden la información de auth.users con roles y datos adicionales

-- Obtener IDs reales de los usuarios creados en auth.users
DO $$
DECLARE
    v_cliente_id UUID;
    v_repartidor_id UUID;
    v_local_id UUID;
BEGIN
    -- Obtener IDs de auth.users
    SELECT id INTO v_cliente_id FROM auth.users WHERE email = 'cliente@example.com' LIMIT 1;
    SELECT id INTO v_repartidor_id FROM auth.users WHERE email = 'repartidor@example.com' LIMIT 1;
    SELECT id INTO v_local_id FROM auth.users WHERE email = 'local@example.com' LIMIT 1;
    
    -- Verificar que todos los usuarios existan
    IF v_cliente_id IS NULL THEN
        RAISE EXCEPTION 'Usuario cliente@example.com no encontrado en auth.users';
    END IF;
    IF v_repartidor_id IS NULL THEN
        RAISE EXCEPTION 'Usuario repartidor@example.com no encontrado en auth.users';
    END IF;
    IF v_local_id IS NULL THEN
        RAISE EXCEPTION 'Usuario local@example.com no encontrado en auth.users';
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
    
    RAISE NOTICE 'Perfil creado para cliente (ID: %)', v_cliente_id;
    
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
    
    RAISE NOTICE 'Perfil creado para repartidor (ID: %)', v_repartidor_id;
    
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
    
    RAISE NOTICE 'Perfil creado para local (ID: %)', v_local_id;
    
END $$;

-- ============================================================================
-- VERIFICAR QUE LOS USUARIOS SE CREARON
-- ============================================================================

SELECT 
    id, 
    email, 
    email_confirmed_at IS NOT NULL as email_verified,
    created_at
FROM auth.users 
WHERE email IN (
    'cliente@example.com',
    'repartidor@example.com',
    'local@example.com'
)
ORDER BY email;

-- ============================================================================
-- NOTA: Si este script falla con error de permisos
-- ============================================================================
-- Usa una de estas alternativas:
--
-- 1. Supabase Dashboard:
--    - Ve a Authentication > Users > Add User
--    - Crea los 3 usuarios manualmente
--
-- 2. Supabase Management API (desde tu aplicación):
--    const { data, error } = await supabase.auth.admin.createUser({
--      email: 'cliente@example.com',
--      password: 'password123',
--      email_confirm: true
--    });
--
-- 3. Conectarte con service_role key (solo desarrollo):
--    Usa la clave service_role de tu proyecto Supabase
--
-- ============================================================================

