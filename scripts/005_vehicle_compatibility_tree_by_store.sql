-- ============================================================================
-- AGORA ECOSYSTEM - Árbol JSON: compatibilidades vehículo por tienda (store_id)
-- ============================================================================
-- Descripción: A partir de automation.v_product_vehicle_compatibilities, arma un
--              JSON jerárquico por marca → modelo → lista de variantes (año,
--              body_trim, motor/transmisión) y productos que aplican. Incluye
--              bloque aparte para compatibilidades universales del catálogo en
--              esa tienda.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-25
-- Hora: 12:00:00
-- ============================================================================

SET search_path TO automation, catalog, core, public;

-- Sustituir en CTE params el UUID de core.stores (mismo canal que v_store_products).

WITH
params AS (
    SELECT 'd3803a96-63dd-4b82-983f-c0c8cdc87d56'::uuid AS store_id
),
base AS (
    SELECT v.*
    FROM automation.v_product_vehicle_compatibilities v
    CROSS JOIN params p
    WHERE v.store_id = p.store_id
),
-- Productos con compatibilidad universal en esta tienda
universal AS (
    SELECT jsonb_agg(
        jsonb_build_object(
            'product_id', b.product_id,
            'sku', b.product_sku,
            'name', b.product_name,
            'compatibility_id', b.compatibility_id
        )
        ORDER BY b.product_sku NULLS LAST
    ) AS products
    FROM base b
    WHERE b.is_universal IS TRUE
),
-- Filas con variante de vehículo (no universal)
vehicular AS (
    SELECT
        COALESCE(
            NULLIF(TRIM(b.matched_vehicle_brand_name), ''),
            NULLIF(TRIM(b.vehicle_make), ''),
            'Sin marca'
        ) AS brand,
        COALESCE(NULLIF(TRIM(b.vehicle_model), ''), 'Sin modelo') AS model,
        b.vehicle_year,
        NULLIF(TRIM(b.vehicle_body_trim), '') AS body_trim,
        NULLIF(TRIM(b.vehicle_engine_transmission), '') AS engine_transmission,
        b.product_id,
        b.product_sku,
        b.compatibility_id
    FROM base b
    WHERE COALESCE(b.is_universal, FALSE) = FALSE
      AND b.vehicle_variant_id IS NOT NULL
),
-- Una fila por (marca, modelo, año, trims) con productos que comparten esa variante
variant_leaves AS (
    SELECT
        v.brand,
        v.model,
        v.vehicle_year,
        v.body_trim,
        v.engine_transmission,
        jsonb_agg(
            DISTINCT jsonb_build_object(
                'product_id', v.product_id,
                'sku', v.product_sku,
                'compatibility_id', v.compatibility_id
            )
        ) AS products
    FROM vehicular v
    GROUP BY v.brand, v.model, v.vehicle_year, v.body_trim, v.engine_transmission
),
-- Modelo → [ { variant..., products: [...] }, ... ]
model_agg AS (
    SELECT
        vl.brand,
        vl.model,
        jsonb_agg(
            jsonb_build_object(
                'year', vl.vehicle_year,
                'body_trim', vl.body_trim,
                'engine_transmission', vl.engine_transmission,
                'products', vl.products
            )
            ORDER BY vl.vehicle_year NULLS LAST, vl.body_trim NULLS LAST, vl.engine_transmission NULLS LAST
        ) AS variants
    FROM variant_leaves vl
    GROUP BY vl.brand, vl.model
),
-- Marca → { modelo: [ variants ], ... }
brand_agg AS (
    SELECT
        ma.brand,
        jsonb_object_agg(ma.model, ma.variants ORDER BY ma.model) AS models
    FROM model_agg ma
    GROUP BY ma.brand
),
tree AS (
    SELECT COALESCE(
        jsonb_object_agg(ba.brand, ba.models ORDER BY ba.brand),
        '{}'::jsonb
    ) AS by_vehicle
    FROM brand_agg ba
)
SELECT jsonb_build_object(
    'store_id', (SELECT store_id::text FROM params),
    'universal', COALESCE((SELECT products FROM universal), '[]'::jsonb),
    'by_vehicle', (SELECT by_vehicle FROM tree)
) AS compatibility_tree;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- 1. Estructura resultante (idea):
--    {
--      "store_id": "...",
--      "universal": [ { "product_id", "sku", "name", "compatibility_id" }, ... ],
--      "by_vehicle": {
--        "Toyota": {
--          "Corolla": [
--            { "year": 2020, "body_trim": "LE", "engine_transmission": "...", "products": [...] },
--            ...
--          ]
--        },
--        ...
--      }
--    }
-- 2. Si no hay filas vehiculares, by_vehicle es {}.
-- 3. jsonb_agg(DISTINCT jsonb) requiere PostgreSQL con soporte adecuado; en PG14+
--    suele funcionar. Si falla, sustituir por subconsulta con DISTINCT en product_id.
-- 4. Para otro store_id, cambia el literal en CTE params (y la línea \set si usas psql).
-- ============================================================================
