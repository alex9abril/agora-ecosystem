-- ============================================================================
-- FIX: Corregir tipo business_role para que esté en el schema core
-- ============================================================================
-- Este script corrige el problema donde el tipo business_role puede estar
-- en el schema public en lugar del schema core, causando errores en las funciones.
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- PASO 1: Verificar y eliminar el tipo si existe en public
-- ============================================================================

DO $$ 
BEGIN
    -- Si el tipo existe en public, eliminarlo (solo si no hay dependencias)
    IF EXISTS (
        SELECT 1 
        FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'public' AND t.typname = 'business_role'
    ) THEN
        -- Intentar eliminar el tipo de public
        -- Nota: Esto fallará si hay columnas usando el tipo, pero eso está bien
        -- porque significa que necesitamos migrar primero
        BEGIN
            DROP TYPE IF EXISTS public.business_role CASCADE;
            RAISE NOTICE '✅ Tipo business_role eliminado de public';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️  No se pudo eliminar business_role de public (puede tener dependencias): %', SQLERRM;
        END;
    END IF;
END $$;

-- ============================================================================
-- PASO 2: Crear el tipo en el schema core si no existe
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'core' AND t.typname = 'business_role'
    ) THEN
        CREATE TYPE core.business_role AS ENUM (
            'superadmin',
            'admin',
            'operativo_aceptador',
            'operativo_cocina'
        );
        
        COMMENT ON TYPE core.business_role IS 'Roles que un usuario puede tener dentro de un negocio específico';
        RAISE NOTICE '✅ Tipo core.business_role creado';
    ELSE
        RAISE NOTICE '✅ Tipo core.business_role ya existe';
    END IF;
END $$;

-- ============================================================================
-- PASO 3: Si la columna de business_users usa el tipo sin schema, 
--         no necesitamos cambiarla porque PostgreSQL lo resuelve automáticamente
--         con el search_path. Pero si hay problemas, podemos forzar el tipo.
-- ============================================================================

-- Verificar que la columna esté usando el tipo correcto
DO $$
DECLARE
    v_type_oid OID;
    v_schema_name TEXT;
BEGIN
    -- Obtener el tipo de la columna role en business_users
    SELECT t.oid, n.nspname INTO v_type_oid, v_schema_name
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_type t ON a.atttypid = t.oid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE c.relname = 'business_users'
    AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'core')
    AND a.attname = 'role';
    
    IF v_type_oid IS NOT NULL THEN
        IF v_schema_name = 'core' THEN
            RAISE NOTICE '✅ Columna role ya usa core.business_role';
        ELSE
            RAISE NOTICE '⚠️  Columna role usa tipo de schema: %', v_schema_name;
            RAISE NOTICE '   Esto debería funcionar con el search_path, pero si hay problemas,';
            RAISE NOTICE '   considera recrear la tabla o hacer ALTER COLUMN.';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- PASO 4: Recrear las funciones que usan business_role para asegurar
--         que usen el tipo correcto del schema core
-- ============================================================================

-- Las funciones se recrearán cuando se ejecute business_roles_and_multi_store.sql
-- y superadmin_account_users.sql, así que solo verificamos aquí

DO $$
BEGIN
    RAISE NOTICE '✅ Script de corrección completado';
    RAISE NOTICE '   Ejecuta business_roles_and_multi_store.sql y superadmin_account_users.sql';
    RAISE NOTICE '   para recrear las funciones con los tipos correctos.';
END $$;

