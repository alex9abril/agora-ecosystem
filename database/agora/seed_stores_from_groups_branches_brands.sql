-- ============================================================================
-- AGORA ECOSYSTEM - Seed: Poblar core.stores desde grupos, sucursales y marcas
-- ============================================================================
-- Descripción: Inserta filas en core.stores para cada canal de venta: una tienda
--              global, una por grupo, una por sucursal, una por marca global,
--              y una por cada par (grupo, marca) donde el grupo tenga sucursales
--              que comercialicen esa marca.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-02-24
-- Hora: 12:00:00
-- ============================================================================

SET search_path TO core, catalog, public;

-- Verificar que la tabla core.stores existe (ejecutar antes migration_stores.sql)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'core' AND table_name = 'stores'
    ) THEN
        RAISE EXCEPTION 'La tabla core.stores no existe. Ejecuta primero: database/agora/migration_stores.sql';
    END IF;
END $$;

-- 1. Tienda global (una sola fila)
INSERT INTO core.stores (type, slug, name, is_active)
SELECT 'global', NULL, 'Agora (Tienda global)', TRUE
WHERE NOT EXISTS (SELECT 1 FROM core.stores WHERE type = 'global');

-- 2. Tienda por grupo (una por business_groups)
INSERT INTO core.stores (type, business_group_id, slug, name, is_active)
SELECT 'group', bg.id, 'grupo/' || bg.slug, COALESCE(bg.name, 'Grupo ' || bg.slug), COALESCE(bg.is_active, TRUE)
FROM core.business_groups bg
WHERE NOT EXISTS (SELECT 1 FROM core.stores s WHERE s.type = 'group' AND s.business_group_id = bg.id);

-- 3. Tienda por sucursal (una por businesses)
INSERT INTO core.stores (type, business_id, business_group_id, slug, name, is_active)
SELECT 'branch', b.id, b.business_group_id, 'sucursal/' || COALESCE(b.slug, b.id::text), COALESCE(b.name, 'Sucursal ' || b.id::text), COALESCE(b.is_active, TRUE)
FROM core.businesses b
WHERE NOT EXISTS (SELECT 1 FROM core.stores s WHERE s.type = 'branch' AND s.business_id = b.id);

-- 4. Tienda global por marca (una por vehicle_brands)
INSERT INTO core.stores (type, vehicle_brand_id, slug, name, is_active)
SELECT 'global_brand', vb.id, 'brand/' || LOWER(vb.code), COALESCE(vb.name, vb.code), COALESCE(vb.is_active, TRUE)
FROM catalog.vehicle_brands vb
WHERE NOT EXISTS (SELECT 1 FROM core.stores s WHERE s.type = 'global_brand' AND s.vehicle_brand_id = vb.id);

-- 5. Tienda por grupo+marca (pares grupo-marca donde el grupo tiene al menos una sucursal con esa marca)
INSERT INTO core.stores (type, business_group_id, vehicle_brand_id, slug, name, is_active)
SELECT DISTINCT 'group_brand', bg.id, vb.id,
    'grupo/' || bg.slug || '/marca/' || LOWER(vb.code),
    bg.name || ' - ' || vb.name,
    TRUE
FROM core.business_groups bg
JOIN core.businesses b ON b.business_group_id = bg.id
JOIN catalog.business_vehicle_brands bvb ON bvb.business_id = b.id AND bvb.is_active = TRUE
JOIN catalog.vehicle_brands vb ON vb.id = bvb.vehicle_brand_id AND vb.is_active = TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM core.stores s
    WHERE s.type = 'group_brand' AND s.business_group_id = bg.id AND s.vehicle_brand_id = vb.id
);

-- ============================================================================
-- NOTAS
-- ============================================================================
-- 1. Ejecutar después de migration_stores.sql (y migration_orders_store_id si aplica).
-- 2. Para mantener sincronizado: al crear grupo/sucursal en backend, crear o actualizar fila en core.stores.
-- 3. group_brand se puede habilitar/desactivar por fila (is_active) desde web-local.
-- ============================================================================
