-- ============================================================================
-- AGORA ECOSYSTEM - Insert: productos Dalton inventario demo
-- ============================================================================
-- Descripción:
--   Registra en catalog.products los 6 SKU del inventario Dalton demo
--   (GET /inventario) si aún no existen. Asigna business_id y disponibilidad
--   de sucursal a Dalton Toyota Lopez Mateos. Precio y stock salen del
--   payload de inventario. product_type = refaccion.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-08-17
-- Hora: 12:45:00
-- ============================================================================

SET search_path TO catalog, core, public;

-- ============================================================================
-- 1. Upsert de productos (idempotente por business_id + sku)
-- ============================================================================

WITH src (
  sku, name, description, price, stock, categoria, marca_producto, moneda, tipo
) AS (
  VALUES
    ('04466AZ213', 'PASTILLAS DE FRENO RR', 'PASTILLAS DE FRENO RR', 1019.32, 1, 'REF > RME', 'TOYOTA', 'MXN', 'refaccion'),
    ('4260308030', 'SUBCONJUNTO DE ADORNO, W', 'SUBCONJUNTO DE ADORNO, W', 479.24, 1, 'REF > TYM', 'TOYOTA', 'MXN', 'refaccion'),
    ('5215903901', 'DEFENSA TRAS.', 'DEFENSA TRAS.', 6497.30, 1, 'REF > LYP', 'TOYOTA', 'MXN', 'refaccion'),
    ('6900502A30', 'JUEGO DE CILINDRO Y LLAVE', 'JUEGO DE CILINDRO Y LLAVE', 3619.53, 2, 'REF > TYM', 'TOYOTA', 'MXN', 'refaccion'),
    ('6905202280', 'CYLINDER & KEY SET,', 'CYLINDER & KEY SET,', 3926.33, 1, 'REF > TYM', 'TOYOTA', 'MXN', 'refaccion'),
    ('9098205054', 'CONJUNTO DE TERMINALES, BATERÍA', 'CONJUNTO DE TERMINALES, BATERÍA', 717.67, 3, 'REF > RME', 'TOYOTA', 'MXN', 'refaccion')
),
biz AS (
  SELECT 'ae9e7666-b7de-44ed-b367-8c100715260c'::uuid AS id
),
ins AS (
  INSERT INTO catalog.products (
    business_id,
    name,
    description,
    sku,
    price,
    product_type,
    is_available,
    metadata
  )
  SELECT
    biz.id,
    s.name,
    s.description,
    s.sku,
    s.price,
    'refaccion'::catalog.product_type,
    TRUE,
    jsonb_build_object(
      'source', 'manual_dalton_inventario',
      'categoria', s.categoria,
      'marca_producto', s.marca_producto,
      'moneda', s.moneda,
      'tipo', s.tipo
    )
  FROM src s
  CROSS JOIN biz
  WHERE NOT EXISTS (
    SELECT 1
    FROM catalog.products p
    WHERE p.business_id = biz.id
      AND p.sku IS NOT NULL
      AND LOWER(TRIM(p.sku)) = LOWER(TRIM(s.sku))
  )
  RETURNING id, sku, price
)
SELECT * FROM ins;

-- ============================================================================
-- 2. Disponibilidad por sucursal (precio + stock del inventario)
-- ============================================================================

WITH src (
  sku, price, stock
) AS (
  VALUES
    ('04466AZ213', 1019.32, 1),
    ('4260308030', 479.24, 1),
    ('5215903901', 6497.30, 1),
    ('6900502A30', 3619.53, 2),
    ('6905202280', 3926.33, 1),
    ('9098205054', 717.67, 3)
)
INSERT INTO catalog.product_branch_availability (
  product_id,
  branch_id,
  is_enabled,
  price,
  stock,
  is_active
)
SELECT
  p.id,
  'ae9e7666-b7de-44ed-b367-8c100715260c'::uuid,
  TRUE,
  s.price,
  s.stock,
  TRUE
FROM src s
INNER JOIN catalog.products p
  ON p.business_id = 'ae9e7666-b7de-44ed-b367-8c100715260c'::uuid
 AND p.sku IS NOT NULL
 AND LOWER(TRIM(p.sku)) = LOWER(TRIM(s.sku))
ON CONFLICT (product_id, branch_id) DO UPDATE SET
  is_enabled = TRUE,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  is_active = TRUE,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 3. Verificación
-- ============================================================================

SELECT
  p.sku,
  p.name,
  p.price AS catalog_price,
  p.product_type,
  p.is_available,
  a.stock,
  a.is_enabled
FROM catalog.products p
LEFT JOIN catalog.product_branch_availability a
  ON a.product_id = p.id
 AND a.branch_id = 'ae9e7666-b7de-44ed-b367-8c100715260c'::uuid
WHERE p.business_id = 'ae9e7666-b7de-44ed-b367-8c100715260c'::uuid
  AND p.sku IN (
    '04466AZ213',
    '4260308030',
    '5215903901',
    '6900502A30',
    '6905202280',
    '9098205054'
  )
ORDER BY p.sku;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - Negocio / sucursal: Dalton Toyota Lopez Mateos
--   (ae9e7666-b7de-44ed-b367-8c100715260c). Es el único peer del grupo.
-- - No se asigna category_id: las etiquetas REF > RME / TYM / LYP no coinciden
--   1:1 con catalog.product_categories; quedan en metadata.
-- - Reejecutable: no duplica SKU ya existentes; sí actualiza stock/precio
--   de sucursal.
-- ============================================================================
