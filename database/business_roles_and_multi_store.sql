-- ============================================================================
-- ROLES DE NEGOCIO Y MÚLTIPLES TIENDAS POR CUENTA
-- ============================================================================
-- Descripción: Sistema de roles para usuarios de negocios y soporte para
--              múltiples tiendas por cuenta (sucursales o tiendas diferentes)
-- 
-- Características:
-- 1. Roles de negocio: superadmin, admin, operations_staff, kitchen_staff
-- 2. Múltiples tiendas por cuenta: Un usuario puede ser dueño/administrador de varias tiendas
-- 3. Roles por tienda: Cada usuario puede tener diferentes roles en diferentes tiendas
-- 
-- Uso: Ejecutar después de schema.sql para agregar estas funcionalidades
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-01-16
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- TIPOS ENUM: Roles de Negocio
-- ============================================================================

-- Rol que un usuario tiene dentro de un negocio específico
-- Crear el tipo solo si no existe (idempotente)
-- IMPORTANTE: Crear el tipo en el schema 'core' explícitamente
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'core' AND t.typname = 'business_role'
    ) THEN
        CREATE TYPE core.business_role AS ENUM (
            'superadmin',              -- Super Administrador: Ve todo, crea usuarios, acceso completo
            'admin',                   -- Administrador: Crea productos, modifica precios, crea promociones
            'operations_staff',        -- Operations Staff: Acepta pedidos, los pone en marcha, hace entregas cuando llega el repartidor
            'kitchen_staff'           -- Kitchen Staff (opcional): Para órdenes aceptadas, las pone en preparación y luego en preparada
        );
        
        COMMENT ON TYPE core.business_role IS 'Roles que un usuario puede tener dentro de un negocio específico';
    END IF;
END $$;

-- ============================================================================
-- TABLA: Relación Usuarios-Negocios (Muchos a Muchos)
-- ============================================================================
-- Esta tabla permite que:
-- 1. Un usuario pueda tener múltiples tiendas (sucursales o tiendas diferentes)
-- 2. Un usuario pueda tener diferentes roles en diferentes tiendas
-- 3. Múltiples usuarios puedan trabajar en la misma tienda con diferentes roles

CREATE TABLE IF NOT EXISTS core.business_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relaciones
    business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Rol del usuario en este negocio específico
    role business_role NOT NULL DEFAULT 'operations_staff',
    
    -- Permisos específicos (JSONB para flexibilidad futura)
    -- Ejemplo: {"can_edit_prices": true, "can_create_promotions": true}
    permissions JSONB DEFAULT '{}'::jsonb,
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Quién asignó este rol
    
    -- Constraints
    UNIQUE(business_id, user_id) -- Un usuario solo puede tener un rol por negocio
    -- Nota: La validación de un solo superadmin por negocio se maneja mediante trigger
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_business_users_business_id ON core.business_users(business_id);
CREATE INDEX IF NOT EXISTS idx_business_users_user_id ON core.business_users(user_id);
CREATE INDEX IF NOT EXISTS idx_business_users_role ON core.business_users(role);
CREATE INDEX IF NOT EXISTS idx_business_users_is_active ON core.business_users(is_active);
CREATE INDEX IF NOT EXISTS idx_business_users_business_user_active ON core.business_users(business_id, user_id, is_active);

-- Índice compuesto para consultas frecuentes: "¿Qué negocios tiene este usuario?"
CREATE INDEX IF NOT EXISTS idx_business_users_user_business ON core.business_users(user_id, business_id) WHERE is_active = TRUE;

-- Índice compuesto para consultas frecuentes: "¿Qué usuarios tiene este negocio?"
CREATE INDEX IF NOT EXISTS idx_business_users_business_role ON core.business_users(business_id, role) WHERE is_active = TRUE;

-- ============================================================================
-- TRIGGER: Actualizar updated_at automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION core.update_business_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_business_users_updated_at ON core.business_users;
CREATE TRIGGER trigger_update_business_users_updated_at
    BEFORE UPDATE ON core.business_users
    FOR EACH ROW
    EXECUTE FUNCTION core.update_business_users_updated_at();

-- ============================================================================
-- TRIGGER: Validar que solo haya un superadmin activo por negocio
-- ============================================================================

CREATE OR REPLACE FUNCTION core.validate_single_superadmin()
RETURNS TRIGGER AS $$
DECLARE
    superadmin_count INTEGER;
BEGIN
    -- Si se está insertando o actualizando a superadmin
    IF NEW.role = 'superadmin' AND NEW.is_active = TRUE THEN
        -- Contar superadmins activos en el mismo negocio (excluyendo el registro actual si es UPDATE)
        SELECT COUNT(*) INTO superadmin_count
        FROM core.business_users
        WHERE business_id = NEW.business_id
        AND role = 'superadmin'
        AND is_active = TRUE
        AND (TG_OP = 'INSERT' OR id != NEW.id);
        
        -- Si ya hay un superadmin activo, lanzar error
        IF superadmin_count > 0 THEN
            RAISE EXCEPTION 'Solo puede haber un superadmin activo por negocio. Desactiva el superadmin existente primero.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_single_superadmin ON core.business_users;
CREATE TRIGGER trigger_validate_single_superadmin
    BEFORE INSERT OR UPDATE ON core.business_users
    FOR EACH ROW
    EXECUTE FUNCTION core.validate_single_superadmin();

-- ============================================================================
-- FUNCIÓN: Verificar si un usuario tiene un rol específico en un negocio
-- ============================================================================

CREATE OR REPLACE FUNCTION core.user_has_business_role(
    p_user_id UUID,
    p_business_id UUID,
    p_role core.business_role
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM core.business_users 
        WHERE user_id = p_user_id 
        AND business_id = p_business_id 
        AND role = p_role 
        AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.user_has_business_role IS 'Verifica si un usuario tiene un rol específico en un negocio';

-- ============================================================================
-- FUNCIÓN: Obtener todos los negocios de un usuario con sus roles
-- ============================================================================

DROP FUNCTION IF EXISTS core.get_user_businesses(UUID);
CREATE OR REPLACE FUNCTION core.get_user_businesses(p_user_id UUID)
RETURNS TABLE (
    business_id UUID,
    business_name VARCHAR(255),
    role core.business_role,
    is_active BOOLEAN,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.name,
        bu.role,
        bu.is_active,
        bu.created_at
    FROM core.business_users bu
    INNER JOIN core.businesses b ON bu.business_id = b.id
    WHERE bu.user_id = p_user_id
    AND bu.is_active = TRUE
    ORDER BY bu.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_user_businesses IS 'Obtiene todos los negocios activos de un usuario con sus roles';

-- ============================================================================
-- FUNCIÓN: Obtener todos los usuarios de un negocio con sus roles
-- ============================================================================

DROP FUNCTION IF EXISTS core.get_business_users(UUID);
CREATE OR REPLACE FUNCTION core.get_business_users(p_business_id UUID)
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role core.business_role,
    is_active BOOLEAN,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bu.user_id,
        au.email::TEXT,
        up.first_name,
        up.last_name,
        bu.role,
        bu.is_active,
        bu.created_at
    FROM core.business_users bu
    INNER JOIN auth.users au ON bu.user_id = au.id
    LEFT JOIN core.user_profiles up ON bu.user_id = up.id
    WHERE bu.business_id = p_business_id
    AND bu.is_active = TRUE
    ORDER BY 
        CASE bu.role
            WHEN 'superadmin' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'operations_staff' THEN 3
            WHEN 'kitchen_staff' THEN 4
        END,
        bu.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_business_users IS 'Obtiene todos los usuarios activos de un negocio con sus roles';

-- ============================================================================
-- FUNCIÓN: Obtener todas las tiendas de un superadmin
-- ============================================================================
-- Permite al superadmin ver todas sus tiendas para configurarlas

DROP FUNCTION IF EXISTS core.get_superadmin_businesses(UUID);
CREATE OR REPLACE FUNCTION core.get_superadmin_businesses(p_superadmin_id UUID)
RETURNS TABLE (
    business_id UUID,
    business_name VARCHAR(255),
    business_email VARCHAR(255),
    business_phone VARCHAR(20),
    business_address TEXT,
    is_active BOOLEAN,
    total_users INTEGER,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.name,
        b.email,
        b.phone,
        COALESCE(
            TRIM(
                CONCAT_WS(', ',
                    NULLIF(TRIM(CONCAT_WS(' ', 
                        NULLIF(a.street, ''), 
                        NULLIF(a.street_number, '')
                    )), ''),
                    NULLIF(TRIM(a.neighborhood), ''),
                    NULLIF(TRIM(a.city), ''),
                    NULLIF(TRIM(a.state), '')
                )
            ),
            'Sin dirección'
        ) AS business_address,
        b.is_active,
        COUNT(DISTINCT bu.id) FILTER (WHERE bu.is_active = TRUE)::INTEGER AS total_users,
        b.created_at
    FROM core.businesses b
    INNER JOIN core.business_users bu ON b.id = bu.business_id
    LEFT JOIN core.addresses a ON b.address_id = a.id AND a.is_active = TRUE
    WHERE bu.user_id = p_superadmin_id
    AND bu.role = 'superadmin'
    AND bu.is_active = TRUE
    GROUP BY b.id, b.name, b.email, b.phone, b.is_active, b.created_at,
             a.street, a.street_number, a.neighborhood, a.city, a.state
    ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_superadmin_businesses IS 'Obtiene todas las tiendas donde un usuario es superadmin';

-- ============================================================================
-- FUNCIÓN: Asignar usuario a tienda (solo superadmin)
-- ============================================================================
-- Permite al superadmin asignar usuarios a sus tiendas con un rol específico

CREATE OR REPLACE FUNCTION core.assign_user_to_business(
    p_superadmin_id UUID,
    p_business_id UUID,
    p_user_id UUID,
    p_role core.business_role,
    p_permissions JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_assignment_id UUID;
    v_is_superadmin BOOLEAN;
BEGIN
    -- Verificar que el usuario que hace la asignación es superadmin de la tienda
    SELECT EXISTS (
        SELECT 1 
        FROM core.business_users 
        WHERE business_id = p_business_id 
        AND user_id = p_superadmin_id 
        AND role = 'superadmin' 
        AND is_active = TRUE
    ) INTO v_is_superadmin;
    
    IF NOT v_is_superadmin THEN
        RAISE EXCEPTION 'Solo el superadmin de la tienda puede asignar usuarios';
    END IF;
    
    -- Verificar que no se intente asignar otro superadmin (solo puede haber uno)
    IF p_role = 'superadmin' THEN
        IF EXISTS (
            SELECT 1 
            FROM core.business_users 
            WHERE business_id = p_business_id 
            AND role = 'superadmin' 
            AND is_active = TRUE
        ) THEN
            RAISE EXCEPTION 'Solo puede haber un superadmin activo por tienda';
        END IF;
    END IF;
    
    -- Insertar o actualizar la asignación
    INSERT INTO core.business_users (
        business_id, 
        user_id, 
        role, 
        permissions, 
        is_active, 
        created_by
    )
    VALUES (
        p_business_id,
        p_user_id,
        p_role,
        p_permissions,
        TRUE,
        p_superadmin_id
    )
    ON CONFLICT (business_id, user_id) DO UPDATE SET
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        is_active = TRUE,
        updated_at = CURRENT_TIMESTAMP,
        created_by = p_superadmin_id
    RETURNING id INTO v_assignment_id;
    
    RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.assign_user_to_business IS 'Asigna un usuario a una tienda con un rol específico. Solo puede ser ejecutado por el superadmin de la tienda.';

-- ============================================================================
-- FUNCIÓN: Remover usuario de tienda (solo superadmin)
-- ============================================================================
-- Permite al superadmin remover usuarios de sus tiendas

CREATE OR REPLACE FUNCTION core.remove_user_from_business(
    p_superadmin_id UUID,
    p_business_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_superadmin BOOLEAN;
    v_target_is_superadmin BOOLEAN;
BEGIN
    -- Verificar que el usuario que hace la remoción es superadmin de la tienda
    SELECT EXISTS (
        SELECT 1 
        FROM core.business_users 
        WHERE business_id = p_business_id 
        AND user_id = p_superadmin_id 
        AND role = 'superadmin' 
        AND is_active = TRUE
    ) INTO v_is_superadmin;
    
    IF NOT v_is_superadmin THEN
        RAISE EXCEPTION 'Solo el superadmin de la tienda puede remover usuarios';
    END IF;
    
    -- Verificar que no se intente remover al superadmin (debe desactivarse primero)
    SELECT EXISTS (
        SELECT 1 
        FROM core.business_users 
        WHERE business_id = p_business_id 
        AND user_id = p_user_id 
        AND role = 'superadmin' 
        AND is_active = TRUE
    ) INTO v_target_is_superadmin;
    
    IF v_target_is_superadmin THEN
        RAISE EXCEPTION 'No se puede remover al superadmin. Desactívalo primero o transfiere el rol a otro usuario.';
    END IF;
    
    -- Desactivar la asignación (no eliminar para mantener historial)
    UPDATE core.business_users
    SET is_active = FALSE,
        updated_at = CURRENT_TIMESTAMP
    WHERE business_id = p_business_id
    AND user_id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.remove_user_from_business IS 'Remueve un usuario de una tienda. Solo puede ser ejecutado por el superadmin de la tienda.';

-- ============================================================================
-- FUNCIÓN: Cambiar rol de usuario en tienda (solo superadmin)
-- ============================================================================
-- Permite al superadmin cambiar el rol de un usuario en una tienda

CREATE OR REPLACE FUNCTION core.change_user_role_in_business(
    p_superadmin_id UUID,
    p_business_id UUID,
    p_user_id UUID,
    p_new_role core.business_role
)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_superadmin BOOLEAN;
BEGIN
    -- Verificar que el usuario que hace el cambio es superadmin de la tienda
    SELECT EXISTS (
        SELECT 1 
        FROM core.business_users 
        WHERE business_id = p_business_id 
        AND user_id = p_superadmin_id 
        AND role = 'superadmin' 
        AND is_active = TRUE
    ) INTO v_is_superadmin;
    
    IF NOT v_is_superadmin THEN
        RAISE EXCEPTION 'Solo el superadmin de la tienda puede cambiar roles de usuarios';
    END IF;
    
    -- Verificar que no se intente asignar otro superadmin si ya existe uno
    IF p_new_role = 'superadmin' THEN
        IF EXISTS (
            SELECT 1 
            FROM core.business_users 
            WHERE business_id = p_business_id 
            AND role = 'superadmin' 
            AND is_active = TRUE
            AND user_id != p_user_id
        ) THEN
            RAISE EXCEPTION 'Solo puede haber un superadmin activo por tienda. Desactiva el superadmin existente primero.';
        END IF;
    END IF;
    
    -- Actualizar el rol
    UPDATE core.business_users
    SET role = p_new_role,
        updated_at = CURRENT_TIMESTAMP
    WHERE business_id = p_business_id
    AND user_id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.change_user_role_in_business IS 'Cambia el rol de un usuario en una tienda. Solo puede ser ejecutado por el superadmin de la tienda.';

-- ============================================================================
-- FUNCIÓN: Obtener usuarios disponibles para asignar (no asignados a la tienda)
-- ============================================================================
-- Permite al superadmin ver usuarios que puede asignar a su tienda

DROP FUNCTION IF EXISTS core.get_available_users_for_business(UUID, TEXT);
CREATE OR REPLACE FUNCTION core.get_available_users_for_business(
    p_business_id UUID,
    p_search_term TEXT DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    is_already_assigned BOOLEAN,
    assigned_role core.business_role
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        au.email::TEXT,
        up.first_name,
        up.last_name,
        up.phone,
        COALESCE(bu.is_active, FALSE) AS is_already_assigned,
        bu.role AS assigned_role
    FROM auth.users au
    LEFT JOIN core.user_profiles up ON au.id = up.id
    LEFT JOIN core.business_users bu ON au.id = bu.user_id 
        AND bu.business_id = p_business_id
    WHERE (
        p_search_term IS NULL 
        OR au.email ILIKE '%' || p_search_term || '%'
        OR up.first_name ILIKE '%' || p_search_term || '%'
        OR up.last_name ILIKE '%' || p_search_term || '%'
        OR up.phone ILIKE '%' || p_search_term || '%'
    )
    ORDER BY 
        COALESCE(bu.is_active, FALSE) DESC, -- Mostrar primero los ya asignados
        au.email;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_available_users_for_business IS 'Obtiene usuarios disponibles para asignar a una tienda, incluyendo búsqueda opcional';

-- ============================================================================
-- FUNCIÓN: Obtener resumen de permisos de un usuario en todas sus tiendas
-- ============================================================================
-- Permite ver qué tiendas puede acceder un usuario y con qué roles

DROP FUNCTION IF EXISTS core.get_user_businesses_summary(UUID);
CREATE OR REPLACE FUNCTION core.get_user_businesses_summary(p_user_id UUID)
RETURNS TABLE (
    business_id UUID,
    business_name VARCHAR(255),
    role core.business_role,
    permissions JSONB,
    is_active BOOLEAN,
    can_access BOOLEAN,
    assigned_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.name,
        bu.role,
        bu.permissions,
        bu.is_active,
        (bu.is_active AND b.is_active) AS can_access,
        bu.created_at AS assigned_at
    FROM core.business_users bu
    INNER JOIN core.businesses b ON bu.business_id = b.id
    WHERE bu.user_id = p_user_id
    ORDER BY 
        (bu.is_active AND b.is_active) DESC,
        bu.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_user_businesses_summary IS 'Obtiene un resumen de todas las tiendas a las que un usuario tiene acceso y sus roles';

-- ============================================================================
-- VISTA: Negocios con información de usuarios y roles
-- ============================================================================

-- Renombrar columnas de la vista si existen (antes de recrearla)
DO $$
BEGIN
    -- Renombrar columnas si la vista existe y tiene los nombres antiguos
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'core' AND table_name = 'businesses_with_users') THEN
        -- Verificar si las columnas antiguas existen antes de renombrarlas
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'core' 
            AND table_name = 'businesses_with_users' 
            AND column_name = 'total_operativos_aceptadores'
        ) THEN
            ALTER VIEW core.businesses_with_users RENAME COLUMN total_operativos_aceptadores TO total_operations_staff;
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'core' 
            AND table_name = 'businesses_with_users' 
            AND column_name = 'total_operativos_cocina'
        ) THEN
            ALTER VIEW core.businesses_with_users RENAME COLUMN total_operativos_cocina TO total_kitchen_staff;
        END IF;
    END IF;
END $$;

-- Recrear la vista con los nombres actualizados
DROP VIEW IF EXISTS core.businesses_with_users;
CREATE VIEW core.businesses_with_users AS
SELECT 
    b.id AS business_id,
    b.name AS business_name,
    b.owner_id,
    au.email AS owner_email,
    COUNT(bu.id) FILTER (WHERE bu.is_active = TRUE) AS total_active_users,
    COUNT(bu.id) FILTER (WHERE bu.role = 'superadmin' AND bu.is_active = TRUE) AS total_superadmins,
    COUNT(bu.id) FILTER (WHERE bu.role = 'admin' AND bu.is_active = TRUE) AS total_admins,
    COUNT(bu.id) FILTER (WHERE bu.role = 'operations_staff' AND bu.is_active = TRUE) AS total_operations_staff,
    COUNT(bu.id) FILTER (WHERE bu.role = 'kitchen_staff' AND bu.is_active = TRUE) AS total_kitchen_staff,
    b.is_active AS business_is_active,
    b.created_at AS business_created_at
FROM core.businesses b
LEFT JOIN auth.users au ON b.owner_id = au.id
LEFT JOIN core.business_users bu ON b.id = bu.business_id
GROUP BY b.id, b.name, b.owner_id, au.email, b.is_active, b.created_at;

COMMENT ON VIEW core.businesses_with_users IS 'Vista que muestra negocios con estadísticas de usuarios y roles';

-- ============================================================================
-- MIGRACIÓN: Asignar rol superadmin al owner_id existente
-- ============================================================================
-- Esta migración asigna automáticamente el rol 'superadmin' a todos los
-- dueños existentes de negocios para mantener la compatibilidad

DO $$
DECLARE
    business_record RECORD;
    existing_superadmin_id UUID;
BEGIN
    -- Asignar rol superadmin a todos los owners existentes
    FOR business_record IN 
        SELECT id, owner_id 
        FROM core.businesses
        WHERE owner_id IS NOT NULL
    LOOP
        -- Verificar si ya existe un superadmin activo para este negocio
        SELECT bu.user_id INTO existing_superadmin_id
        FROM core.business_users bu
        WHERE bu.business_id = business_record.id
        AND bu.role = 'superadmin'
        AND bu.is_active = TRUE
        LIMIT 1;
        
        -- Si ya existe un superadmin y es el mismo owner, solo actualizar
        IF existing_superadmin_id IS NOT NULL AND existing_superadmin_id = business_record.owner_id THEN
            -- Ya está asignado como superadmin, solo asegurar que esté activo
            UPDATE core.business_users
            SET is_active = TRUE,
                updated_at = CURRENT_TIMESTAMP
            WHERE business_id = business_record.id
            AND user_id = business_record.owner_id;
        ELSIF existing_superadmin_id IS NOT NULL AND existing_superadmin_id != business_record.owner_id THEN
            -- Hay otro superadmin, desactivarlo primero
            UPDATE core.business_users
            SET is_active = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE business_id = business_record.id
            AND user_id = existing_superadmin_id
            AND role = 'superadmin';
            
            -- Ahora insertar/actualizar el owner como superadmin
            INSERT INTO core.business_users (business_id, user_id, role, is_active)
            VALUES (
                business_record.id,
                business_record.owner_id,
                'superadmin',
                TRUE
            )
            ON CONFLICT (business_id, user_id) DO UPDATE SET
                role = 'superadmin',
                is_active = TRUE,
                updated_at = CURRENT_TIMESTAMP;
        ELSE
            -- No hay superadmin existente, insertar normalmente
            INSERT INTO core.business_users (business_id, user_id, role, is_active)
            VALUES (
                business_record.id,
                business_record.owner_id,
                'superadmin',
                TRUE
            )
            ON CONFLICT (business_id, user_id) DO UPDATE SET
                role = 'superadmin',
                is_active = TRUE,
                updated_at = CURRENT_TIMESTAMP;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Migración completada: Todos los owners existentes ahora tienen rol superadmin';
END $$;

-- ============================================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================================================

COMMENT ON TABLE core.business_users IS 'Relación muchos-a-muchos entre usuarios y negocios. Permite que un usuario tenga múltiples tiendas y diferentes roles en cada una.';

COMMENT ON COLUMN core.business_users.business_id IS 'ID del negocio';
COMMENT ON COLUMN core.business_users.user_id IS 'ID del usuario (auth.users)';
COMMENT ON COLUMN core.business_users.role IS 'Rol del usuario en este negocio específico';
COMMENT ON COLUMN core.business_users.permissions IS 'Permisos específicos adicionales en formato JSONB';
COMMENT ON COLUMN core.business_users.is_active IS 'Si el usuario está activo en este negocio';
COMMENT ON COLUMN core.business_users.created_by IS 'Usuario que asignó este rol (puede ser NULL si fue auto-asignado)';

-- ============================================================================
-- EJEMPLOS DE USO
-- ============================================================================

/*
-- ============================================================================
-- GESTIÓN BÁSICA DE USUARIOS Y TIENDAS
-- ============================================================================

-- 1. Ver todas las tiendas de un superadmin
SELECT * FROM core.get_superadmin_businesses('superadmin-user-uuid');

-- 2. Ver todos los negocios de un usuario
SELECT * FROM core.get_user_businesses('user-uuid-here');

-- 3. Ver todos los usuarios de un negocio
SELECT * FROM core.get_business_users('business-uuid-here');

-- 4. Verificar si un usuario tiene rol admin en un negocio
SELECT core.user_has_business_role('user-uuid', 'business-uuid', 'admin');

-- 5. Ver negocios con estadísticas de usuarios
SELECT * FROM core.businesses_with_users;

-- ============================================================================
-- CONFIGURADOR DE PERMISOS (SUPERADMIN)
-- ============================================================================

-- 6. Asignar un usuario a una tienda con rol admin (solo superadmin)
SELECT core.assign_user_to_business(
    'superadmin-user-uuid',  -- ID del superadmin que hace la asignación
    'business-uuid',          -- ID de la tienda
    'new-user-uuid',         -- ID del usuario a asignar
    'admin',                 -- Rol a asignar
    '{"can_edit_prices": true}'::jsonb  -- Permisos adicionales (opcional)
);

-- 7. Cambiar el rol de un usuario en una tienda (solo superadmin)
SELECT core.change_user_role_in_business(
    'superadmin-user-uuid',  -- ID del superadmin
    'business-uuid',          -- ID de la tienda
    'user-uuid',             -- ID del usuario
    'operations_staff'    -- Nuevo rol
);

-- 8. Remover un usuario de una tienda (solo superadmin)
SELECT core.remove_user_from_business(
    'superadmin-user-uuid',  -- ID del superadmin
    'business-uuid',          -- ID de la tienda
    'user-uuid'              -- ID del usuario a remover
);

-- 9. Ver usuarios disponibles para asignar a una tienda (con búsqueda opcional)
SELECT * FROM core.get_available_users_for_business(
    'business-uuid',
    'juan'  -- Término de búsqueda (opcional, NULL para todos)
);

-- 10. Ver resumen de permisos de un usuario en todas sus tiendas
SELECT * FROM core.get_user_businesses_summary('user-uuid');

-- ============================================================================
-- GESTIÓN DIRECTA (ALTERNATIVA SIN FUNCIONES)
-- ============================================================================

-- 11. Asignar un usuario a un negocio con rol admin (directo)
INSERT INTO core.business_users (business_id, user_id, role, created_by)
VALUES (
    'business-uuid-here',
    'user-uuid-here',
    'admin',
    'current-user-uuid'
);

-- 12. Cambiar el rol de un usuario en un negocio (directo)
UPDATE core.business_users
SET role = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE business_id = 'business-uuid' AND user_id = 'user-uuid';

-- 13. Desactivar un usuario de un negocio (sin eliminarlo)
UPDATE core.business_users
SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
WHERE business_id = 'business-uuid' AND user_id = 'user-uuid';

-- 14. Ver todos los usuarios con rol operations_staff en un negocio
SELECT * FROM core.business_users
WHERE business_id = 'business-uuid'
AND role = 'operations_staff'
AND is_active = TRUE;
*/

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

