-- ============================================================================
-- AGORA ECOSYSTEM - Seed: Business Groups from Existing Businesses
-- ============================================================================
-- Descripción: Crea grupos empresariales basados en las sucursales existentes
--              y asigna las sucursales a sus respectivos grupos.
--
-- Uso: Ejecutar después de migration_business_groups.sql
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-12-04
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- PASO 1: Crear grupos empresariales para cada owner_id único
-- ============================================================================
-- Agrupa las sucursales por owner_id y crea un grupo empresarial para cada uno.
-- El nombre del grupo se genera a partir del nombre de la primera sucursal
-- o un nombre genérico si no hay sucursales.

DO $$
DECLARE
    v_owner_record RECORD;
    v_group_id UUID;
    v_group_name VARCHAR(255);
    v_group_slug VARCHAR(255);
    v_first_business_name VARCHAR(255);
BEGIN
    RAISE NOTICE '🚀 Iniciando creación de grupos empresariales desde sucursales existentes...';
    RAISE NOTICE '';

    -- Iterar sobre cada owner_id único que tiene sucursales
    FOR v_owner_record IN 
        SELECT DISTINCT 
            b.owner_id,
            COUNT(*) as total_branches,
            MIN(b.name) as first_branch_name
        FROM core.businesses b
        WHERE b.owner_id IS NOT NULL
        GROUP BY b.owner_id
        ORDER BY b.owner_id
    LOOP
        -- Determinar nombre del grupo
        -- Si hay múltiples sucursales, usar un nombre genérico basado en la primera
        -- Si solo hay una, usar el nombre de la sucursal + " Group"
        IF v_owner_record.total_branches > 1 THEN
            -- Extraer el prefijo común (ej: "Toyota" de "Toyota Pachuca", "Toyota Universidad")
            v_first_business_name := v_owner_record.first_branch_name;
            -- Intentar extraer el prefijo común (antes del primer espacio o guion)
            IF POSITION(' ' IN v_first_business_name) > 0 THEN
                v_group_name := SPLIT_PART(v_first_business_name, ' ', 1) || ' Group';
            ELSIF POSITION('-' IN v_first_business_name) > 0 THEN
                v_group_name := SPLIT_PART(v_first_business_name, '-', 1) || ' Group';
            ELSE
                v_group_name := v_first_business_name || ' Group';
            END IF;
        ELSE
            v_group_name := v_owner_record.first_branch_name || ' Group';
        END IF;

        -- Generar slug único
        v_group_slug := core.generate_business_group_slug(v_group_name);

        -- Verificar si ya existe un grupo para este owner_id
        SELECT id INTO v_group_id
        FROM core.business_groups
        WHERE owner_id = v_owner_record.owner_id
        LIMIT 1;

        -- Si no existe, crear el grupo
        IF v_group_id IS NULL THEN
            INSERT INTO core.business_groups (
                owner_id,
                name,
                legal_name,
                description,
                slug,
                is_active
            )
            VALUES (
                v_owner_record.owner_id,
                v_group_name,
                v_group_name, -- Usar el mismo nombre como legal_name por defecto
                'Grupo empresarial creado automáticamente desde sucursales existentes.',
                v_group_slug,
                TRUE
            )
            RETURNING id INTO v_group_id;

            RAISE NOTICE '  ✅ Creado grupo: "%" (ID: %, Owner: %, Sucursales: %)', 
                v_group_name, 
                v_group_id,
                v_owner_record.owner_id,
                v_owner_record.total_branches;
        ELSE
            RAISE NOTICE '  ℹ️  Grupo ya existe: "%" (ID: %, Owner: %)', 
                v_group_name,
                v_group_id,
                v_owner_record.owner_id;
        END IF;

        -- Asignar todas las sucursales de este owner_id al grupo
        UPDATE core.businesses
        SET business_group_id = v_group_id
        WHERE owner_id = v_owner_record.owner_id
          AND business_group_id IS NULL;

        RAISE NOTICE '  📍 Asignadas % sucursales al grupo "%"', 
            v_owner_record.total_branches,
            v_group_name;
        RAISE NOTICE '';
    END LOOP;

    RAISE NOTICE '✅ Proceso completado exitosamente.';
END $$;

-- ============================================================================
-- PASO 2: Verificación y reporte
-- ============================================================================
-- Muestra un resumen de los grupos creados y sus sucursales asignadas.

SELECT 
    bg.id as group_id,
    bg.name as group_name,
    bg.slug as group_slug,
    bg.owner_id,
    COUNT(b.id) as total_branches,
    STRING_AGG(b.name, ', ' ORDER BY b.name) as branch_names
FROM core.business_groups bg
LEFT JOIN core.businesses b ON bg.id = b.business_group_id
GROUP BY bg.id, bg.name, bg.slug, bg.owner_id
ORDER BY bg.created_at DESC;

-- ============================================================================
-- PASO 3: Consulta detallada por grupo
-- ============================================================================
-- Muestra información detallada de cada grupo con sus sucursales.

SELECT 
    bg.name as "Grupo Empresarial",
    bg.slug as "Slug",
    bg.owner_id as "Owner ID",
    b.name as "Sucursal",
    b.slug as "Slug Sucursal",
    b.is_active as "Activa",
    b.accepts_pickup as "Acepta Pickup"
FROM core.business_groups bg
LEFT JOIN core.businesses b ON bg.id = b.business_group_id
ORDER BY bg.name, b.name;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
-- Este script:
-- ✅ Crea grupos empresariales para cada owner_id único
-- ✅ Asigna automáticamente todas las sucursales al grupo correspondiente
-- ✅ Genera nombres y slugs automáticamente
-- ✅ Es idempotente (puede ejecutarse múltiples veces sin duplicar grupos)
-- ============================================================================

