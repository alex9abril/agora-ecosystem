-- ============================================================================
-- AGORA ECOSYSTEM - Seed: Business Groups (Datos Específicos)
-- ============================================================================
-- Descripción: Crea grupos empresariales específicos basados en los datos
--              proporcionados y asigna las sucursales correspondientes.
--
-- Uso: Ejecutar después de migration_business_groups.sql
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-12-04
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- GRUPO 1: Para owner_id f7cc41d7-f407-4220-b9c4-11009cb229b7
-- Sucursal: Toyota Satelite
-- ============================================================================

DO $$
DECLARE
    v_group_id_1 UUID;
BEGIN
    -- Crear grupo empresarial para el primer owner
    INSERT INTO core.business_groups (
        owner_id,
        name,
        legal_name,
        description,
        slug,
        is_active
    )
    VALUES (
        'f7cc41d7-f407-4220-b9c4-11009cb229b7'::UUID,
        'Toyota Satelite Group',
        'Toyota Satelite',
        'Grupo empresarial para Toyota Satelite',
        'toyota-satelite-group',
        TRUE
    )
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        legal_name = EXCLUDED.legal_name,
        description = EXCLUDED.description,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO v_group_id_1;

    -- Asignar sucursal al grupo
    UPDATE core.businesses
    SET business_group_id = v_group_id_1
    WHERE id = '054471c5-0ff3-4adb-8c52-24a24ef25367'::UUID;

    RAISE NOTICE '✅ Grupo 1 creado: Toyota Satelite Group (ID: %)', v_group_id_1;
    RAISE NOTICE '   Sucursal asignada: Toyota Satelite';
END $$;

-- ============================================================================
-- GRUPO 2: Para owner_id 328b85d1-35e3-4e55-a667-831a7b9a7ab7
-- Sucursales: Toyota Pachuca, Toyota Universidad, Toyota Coyoacan 1
-- ============================================================================

DO $$
DECLARE
    v_group_id_2 UUID;
BEGIN
    -- Crear grupo empresarial para el segundo owner (tiene 3 sucursales)
    INSERT INTO core.business_groups (
        owner_id,
        name,
        legal_name,
        description,
        slug,
        is_active
    )
    VALUES (
        '328b85d1-35e3-4e55-a667-831a7b9a7ab7'::UUID,
        'Toyota Group',
        'Toyota Group',
        'Grupo empresarial que agrupa múltiples sucursales Toyota: Pachuca, Universidad y Coyoacan',
        'toyota-group',
        TRUE
    )
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        legal_name = EXCLUDED.legal_name,
        description = EXCLUDED.description,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO v_group_id_2;

    -- Asignar todas las sucursales de este owner al grupo
    UPDATE core.businesses
    SET business_group_id = v_group_id_2
    WHERE owner_id = '328b85d1-35e3-4e55-a667-831a7b9a7ab7'::UUID
      AND id IN (
        '5ed4b598-a3d2-48b5-8b6a-ab4aee8711c8'::UUID, -- Toyota Pachuca
        '688e8c01-2a77-4fbe-a55e-ed12a93af55e'::UUID, -- Toyota Universidad
        'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f'::UUID  -- Toyota Coyoacan 1
      );

    RAISE NOTICE '✅ Grupo 2 creado: Toyota Group (ID: %)', v_group_id_2;
    RAISE NOTICE '   Sucursales asignadas: Toyota Pachuca, Toyota Universidad, Toyota Coyoacan 1';
END $$;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Consulta para verificar los grupos creados y sus sucursales

SELECT 
    bg.id as "ID Grupo",
    bg.name as "Nombre Grupo",
    bg.slug as "Slug",
    bg.owner_id as "Owner ID",
    COUNT(b.id) as "Total Sucursales",
    STRING_AGG(b.name, ', ' ORDER BY b.name) as "Sucursales"
FROM core.business_groups bg
LEFT JOIN core.businesses b ON bg.id = b.business_group_id
WHERE bg.owner_id IN (
    'f7cc41d7-f407-4220-b9c4-11009cb229b7'::UUID,
    '328b85d1-35e3-4e55-a667-831a7b9a7ab7'::UUID
)
GROUP BY bg.id, bg.name, bg.slug, bg.owner_id
ORDER BY bg.name;

-- ============================================================================
-- DETALLE POR SUCURSAL
-- ============================================================================
-- Consulta detallada mostrando cada sucursal con su grupo asignado

SELECT 
    b.name as "Sucursal",
    b.slug as "Slug Sucursal",
    bg.name as "Grupo Empresarial",
    bg.slug as "Slug Grupo",
    b.is_active as "Activa",
    b.accepts_pickup as "Acepta Pickup",
    b.owner_id as "Owner ID"
FROM core.businesses b
LEFT JOIN core.business_groups bg ON b.business_group_id = bg.id
WHERE b.id IN (
    '054471c5-0ff3-4adb-8c52-24a24ef25367'::UUID, -- Toyota Satelite
    '5ed4b598-a3d2-48b5-8b6a-ab4aee8711c8'::UUID, -- Toyota Pachuca
    '688e8c01-2a77-4fbe-a55e-ed12a93af55e'::UUID, -- Toyota Universidad
    'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f'::UUID  -- Toyota Coyoacan 1
)
ORDER BY bg.name, b.name;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
-- Este script crea:
-- ✅ Grupo 1: "Toyota Satelite Group" para owner f7cc41d7-f407-4220-b9c4-11009cb229b7
--    - Sucursal: Toyota Satelite
-- ✅ Grupo 2: "Toyota Group" para owner 328b85d1-35e3-4e55-a667-831a7b9a7ab7
--    - Sucursales: Toyota Pachuca, Toyota Universidad, Toyota Coyoacan 1
-- ============================================================================

