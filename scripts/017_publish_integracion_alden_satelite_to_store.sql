-- ============================================================================
-- AGORA ECOSYSTEM - Publish data_bridge.integration_alden_satelite to store
-- ============================================================================
-- Purpose:
--   Backfill/sync rows already loaded in an Alden Satelite data_bridge table
--   so products appear in the Toyota Satelite storefront.
--
-- What it updates:
--   1) catalog.products
--      - creates missing products by SKU
--      - sets is_available = TRUE
--      - lifts base price from Alden when the current base price is 0/null
--        because automation.v_store_products filters on p.price > 0
--   2) catalog.product_branch_availability
--      - enables each product for the Toyota Satelite branch
--      - sets branch price and stock from Alden
--
-- Expected Alden columns:
--   product, descripcion, inventario, and either sale_price or price
--   fecha_importacion is optional
--
-- Source table detection:
--   1) data_bridge.integration_alden_satelite
--   2) data_bridge.integracion_alden_satelite
--
-- Review before running in production. To dry-run, change the final COMMIT to
-- ROLLBACK before executing.
-- ============================================================================

BEGIN;

CREATE TEMP TABLE tmp_alden_satelite_context AS
WITH store_match AS (
  SELECT
    s.id AS store_id,
    s.business_id AS branch_id,
    s.name AS store_name,
    b.business_group_id,
    b.name AS branch_name
  FROM core.stores s
  JOIN core.businesses b ON b.id = s.business_id
  WHERE s.type = 'branch'
    AND s.is_active = TRUE
    AND COALESCE(s.archived_at IS NULL, TRUE)
    AND (
      LOWER(BTRIM(COALESCE(s.slug, ''))) IN ('sucursal/toyota-satelite', '/sucursal/toyota-satelite')
      OR LOWER(BTRIM(COALESCE(b.slug, ''))) = 'toyota-satelite'
      OR LOWER(BTRIM(COALESCE(s.name, ''))) = 'toyota satelite'
      OR LOWER(BTRIM(COALESCE(b.name, ''))) = 'toyota satelite'
    )
)
SELECT *
FROM store_match;

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM tmp_alden_satelite_context;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'No se encontro una tienda/sucursal Toyota Satelite activa. Ajusta el resolver de tmp_alden_satelite_context.';
  END IF;
  IF v_count > 1 THEN
    RAISE EXCEPTION 'Se encontraron % coincidencias para Toyota Satelite. Deja una sola fila en tmp_alden_satelite_context antes de correr.', v_count;
  END IF;
END $$;

CREATE TEMP TABLE tmp_alden_satelite_source (
  sku text,
  name text,
  price numeric(10, 2),
  stock integer,
  fecha_importacion timestamptz,
  source_table text
);

DO $$
DECLARE
  v_source_table regclass;
  v_price_column text;
  v_fecha_expr text;
BEGIN
  v_source_table := COALESCE(
    to_regclass('data_bridge.integration_alden_satelite'),
    to_regclass('data_bridge.integracion_alden_satelite')
  );

  IF v_source_table IS NULL THEN
    RAISE EXCEPTION
      'No se encontro tabla Alden Satelite en data_bridge. Revisa con: SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = ''data_bridge'' AND table_name ILIKE ''%%alden%%'';';
  END IF;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = v_source_table AND attname = 'sale_price' AND NOT attisdropped) THEN 'sale_price'
    WHEN EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = v_source_table AND attname = 'price' AND NOT attisdropped) THEN 'price'
    ELSE NULL
  END
  INTO v_price_column;

  IF v_price_column IS NULL THEN
    RAISE EXCEPTION 'La tabla % no tiene columna sale_price ni price.', v_source_table::text;
  END IF;

  v_fecha_expr := CASE
    WHEN EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = v_source_table AND attname = 'fecha_importacion' AND NOT attisdropped)
      THEN 'fecha_importacion'
    ELSE 'NULL::timestamptz'
  END;

  EXECUTE format($sql$
    INSERT INTO tmp_alden_satelite_source (sku, name, price, stock, fecha_importacion, source_table)
    WITH raw AS (
      SELECT
        BTRIM(product::text) AS sku,
        NULLIF(BTRIM(COALESCE(descripcion::text, '')), '') AS name,
        CASE
          WHEN %1$I IS NULL THEN NULL
          WHEN %1$I::numeric > 0 THEN %1$I::numeric(10, 2)
          ELSE NULL
        END AS price,
        GREATEST(COALESCE(FLOOR(inventario::numeric)::integer, 0), 0) AS stock,
        %2$s AS fecha_importacion
      FROM %3$s
      WHERE product IS NOT NULL
        AND BTRIM(product::text) <> ''
    ),
    deduped AS (
      SELECT DISTINCT ON (LOWER(sku))
        sku,
        COALESCE(name, sku) AS name,
        price,
        stock,
        fecha_importacion
      FROM raw
      ORDER BY LOWER(sku), fecha_importacion DESC NULLS LAST
    )
    SELECT
      sku,
      name,
      price,
      stock,
      fecha_importacion,
      %4$L AS source_table
    FROM deduped
  $sql$, v_price_column, v_fecha_expr, v_source_table, v_source_table::text);
END $$;

-- Existing products matched globally by SKU. If the same SKU exists in more than
-- one business, prefer the Toyota Satelite branch's group/catalog peer.
CREATE TEMP TABLE tmp_alden_satelite_existing_products AS
WITH ctx AS (
  SELECT * FROM tmp_alden_satelite_context LIMIT 1
)
SELECT DISTINCT ON (LOWER(BTRIM(p.sku)))
  LOWER(BTRIM(p.sku)) AS sku_key,
  p.id AS product_id
FROM catalog.products p
CROSS JOIN ctx
WHERE p.sku IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM tmp_alden_satelite_source src
    WHERE LOWER(src.sku) = LOWER(BTRIM(p.sku))
  )
ORDER BY
  LOWER(BTRIM(p.sku)),
  CASE
    WHEN p.business_id = ctx.branch_id THEN 0
    WHEN EXISTS (
      SELECT 1
      FROM core.businesses pb
      WHERE pb.id = p.business_id
        AND pb.business_group_id = ctx.business_group_id
    ) THEN 1
    ELSE 2
  END,
  p.created_at ASC NULLS LAST,
  p.id;

-- Create catalog products for SKUs not found anywhere in catalog.products.
-- The owner business is the Toyota Satelite branch; availability below is still
-- what actually exposes the product in the branch storefront.
CREATE TEMP TABLE tmp_alden_satelite_inserted_products (
  product_id uuid,
  sku_key text
);

WITH ctx AS (
  SELECT * FROM tmp_alden_satelite_context LIMIT 1
),
missing AS (
  SELECT src.*
  FROM tmp_alden_satelite_source src
  LEFT JOIN tmp_alden_satelite_existing_products ep
    ON ep.sku_key = LOWER(src.sku)
  WHERE ep.product_id IS NULL
),
inserted AS (
  INSERT INTO catalog.products (
    business_id,
    name,
    sku,
    price,
    product_type,
    is_available,
    metadata
  )
  SELECT
    ctx.branch_id,
    m.name,
    m.sku,
    COALESCE(m.price, 0),
    'refaccion',
    TRUE,
    jsonb_build_object(
      'source', 'data_bridge',
    'data_bridge_table', m.source_table,
      'published_by', 'scripts/017_publish_integracion_alden_satelite_to_store.sql',
      'published_at', now()
    )
  FROM missing m
  CROSS JOIN ctx
  RETURNING id AS product_id, LOWER(BTRIM(sku)) AS sku_key
)
INSERT INTO tmp_alden_satelite_inserted_products (product_id, sku_key)
SELECT product_id, sku_key
FROM inserted;

CREATE TEMP TABLE tmp_alden_satelite_products_to_publish AS
SELECT sku_key, product_id FROM tmp_alden_satelite_existing_products
UNION ALL
SELECT sku_key, product_id FROM tmp_alden_satelite_inserted_products;

-- Make sure matched products are visible and have a positive base price when
-- Alden has a positive price. This matters for automation.v_store_products.
UPDATE catalog.products p
SET
  is_available = TRUE,
  price = CASE
    WHEN src.price IS NOT NULL AND COALESCE(p.price, 0)::numeric <= 0 THEN src.price
    ELSE p.price
  END,
  name = CASE
    WHEN (p.name IS NULL OR BTRIM(p.name) = '') THEN src.name
    ELSE p.name
  END,
  metadata = COALESCE(p.metadata, '{}'::jsonb) || jsonb_build_object(
    'last_data_bridge_publish_table', src.source_table,
    'last_data_bridge_publish_at', now()
  ),
  updated_at = CURRENT_TIMESTAMP
FROM tmp_alden_satelite_products_to_publish pub
JOIN tmp_alden_satelite_source src ON LOWER(src.sku) = pub.sku_key
WHERE p.id = pub.product_id;

-- Enable product in the Toyota Satelite branch.
INSERT INTO catalog.product_branch_availability (
  product_id,
  branch_id,
  is_enabled,
  price,
  stock,
  is_active,
  updated_at
)
SELECT
  pub.product_id,
  ctx.branch_id,
  TRUE,
  src.price,
  src.stock,
  TRUE,
  CURRENT_TIMESTAMP
FROM tmp_alden_satelite_products_to_publish pub
JOIN tmp_alden_satelite_source src ON LOWER(src.sku) = pub.sku_key
CROSS JOIN tmp_alden_satelite_context ctx
ON CONFLICT (product_id, branch_id)
DO UPDATE SET
  is_enabled = TRUE,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  is_active = TRUE,
  updated_at = CURRENT_TIMESTAMP;

-- Summary / verification.
SELECT
  ctx.store_id,
  ctx.store_name,
  ctx.branch_id,
  ctx.branch_name,
  (SELECT COUNT(*) FROM tmp_alden_satelite_source) AS source_skus,
  (SELECT COUNT(*) FROM tmp_alden_satelite_existing_products) AS matched_existing_products,
  (SELECT COUNT(*) FROM tmp_alden_satelite_inserted_products) AS inserted_products,
  COUNT(pba.*) FILTER (
    WHERE pba.is_enabled = TRUE
      AND pba.is_active = TRUE
      AND p.is_available = TRUE
      AND COALESCE(pba.price, p.price)::numeric > 0
      AND p.price::numeric > 0
  ) AS visible_in_store_candidates,
  COUNT(pba.*) FILTER (
    WHERE COALESCE(pba.price, p.price)::numeric <= 0 OR p.price::numeric <= 0
  ) AS still_hidden_due_to_zero_price
FROM tmp_alden_satelite_context ctx
JOIN catalog.product_branch_availability pba ON pba.branch_id = ctx.branch_id
JOIN catalog.products p ON p.id = pba.product_id
JOIN tmp_alden_satelite_products_to_publish pub ON pub.product_id = p.id
GROUP BY ctx.store_id, ctx.store_name, ctx.branch_id, ctx.branch_name;

COMMIT;
