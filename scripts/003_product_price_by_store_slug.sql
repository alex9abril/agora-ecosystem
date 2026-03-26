-- ============================================================================
-- AGORA ECOSYSTEM - Consulta: precio de producto por tienda (slug) / sucursal
-- ============================================================================
-- Descripción: Dado un product_id y el slug de core.stores (ej. sucursal/toyota-satelite),
--              devuelve precio de catálogo, override PBA y precio efectivo
--              COALESCE(pba.price, p.price). Ajustar UUID y slug según entorno.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-23
-- Hora: 18:00:00
-- ============================================================================

SET search_path TO core, catalog, public;

-- ----------------------------------------------------------------------------
-- Opción A: slug de TIENDA (core.stores), ej. documentación: sucursal/toyota-satelite
-- ----------------------------------------------------------------------------

SELECT
    s.id AS store_id,
    s.type AS store_type,
    s.slug AS store_slug,
    s.name AS store_name,
    b.id AS branch_id,
    b.name AS branch_name,
    b.slug AS branch_business_slug,
    p.id AS product_id,
    p.sku,
    p.name AS product_name,
    p.price AS catalog_price,
    pba.price AS branch_pba_price,
    COALESCE(pba.price, p.price) AS effective_price,
    pba.is_enabled AS pba_is_enabled,
    pba.is_active AS pba_is_active,
    pba.stock AS branch_stock
FROM core.stores s
INNER JOIN core.businesses b ON b.id = s.business_id
INNER JOIN catalog.products p ON p.id = '4e9e8ff7-245e-42ee-b213-ffcd746e04bb'::uuid
LEFT JOIN catalog.product_branch_availability pba
    ON pba.product_id = p.id
    AND pba.branch_id = s.business_id
    AND COALESCE(pba.is_active, TRUE) = TRUE
WHERE s.slug = 'sucursal/toyota-satelite'
  AND COALESCE(s.is_active, TRUE) = TRUE;

-- ----------------------------------------------------------------------------
-- Opción B: solo por slug de SUCURSAL (core.businesses.slug), si no usas stores
-- ----------------------------------------------------------------------------

/*
SELECT
    b.id AS branch_id,
    b.name AS branch_name,
    b.slug AS branch_slug,
    p.id AS product_id,
    p.sku,
    p.name AS product_name,
    p.price AS catalog_price,
    pba.price AS branch_pba_price,
    COALESCE(pba.price, p.price) AS effective_price,
    pba.is_enabled,
    pba.stock
FROM core.businesses b
INNER JOIN catalog.products p ON p.id = '4e9e8ff7-245e-42ee-b213-ffcd746e04bb'::uuid
LEFT JOIN catalog.product_branch_availability pba
    ON pba.product_id = p.id
    AND pba.branch_id = b.id
    AND COALESCE(pba.is_active, TRUE) = TRUE
WHERE b.slug = 'toyota-satelite'
  AND COALESCE(b.is_active, TRUE) = TRUE;
*/

-- ============================================================================
-- NOTAS
-- ============================================================================
-- 1. effective_price = precio PBA si existe fila y pba.price IS NOT NULL; si no, p.price.
-- 2. Si no hay fila PBA, branch_pba_price y pba_* salen NULL; effective_price = catalog_price.
-- 3. Para venta real suele exigirse pba.is_enabled = TRUE; añada AND pba.is_enabled = TRUE
--    si solo quiere precios “publicables” en esa sucursal.
-- 4. Si la tienda no es type = 'branch', business_id puede ser NULL: use Opción B u otro join.
-- ============================================================================
