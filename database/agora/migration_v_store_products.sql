-- ============================================================================
-- AGORA ECOSYSTEM - Vista: Productos por tienda (store_id)
-- ============================================================================
-- Descripción: Expone el catálogo efectivo por canal de venta (core.stores) en el
--              esquema automation (consumo por integraciones / WhatsApp / jobs).
--              Incluye store_id, SKU, precio efectivo, stock (según alcance),
--              datos del producto y agregado JSON de imágenes activas.
--              Tipos de tienda: branch (1 sucursal), group / group_brand
--              (agregado en sucursales del grupo), global_brand (agregado en
--              cualquier sucursal activa), global (catálogo sin filtro pba).
--
--              Filtro marca (group_brand, global_brand): para product_type
--              refaccion/accesorio usa compatibilidad catalog.product_vehicle_compatibility
--              (is_universal o vehicle_variants.make = vehicle_brands.name,
--              comparación case-insensitive). Otros tipos de producto pasan
--              sin exigir compatibilidad explícita.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-19
-- Hora: 12:00:00
-- ============================================================================

SET search_path TO core, catalog, orders, automation, public;

-- ----------------------------------------------------------------------------
-- Esquema: automation (vistas y objetos para integraciones automatizadas)
-- ----------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS automation;

COMMENT ON SCHEMA automation IS
    'Objetos de lectura para automatizaciones (ej. WhatsApp, ETL): vistas que cruzan core/catalog sin duplicar datos.';

-- ----------------------------------------------------------------------------
-- Función: producto compatible con marca (variantes radical + universal)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION catalog.product_matches_vehicle_brand(
    p_product_id UUID,
    p_brand_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM catalog.product_vehicle_compatibility pvc
        WHERE pvc.product_id = p_product_id
          AND pvc.is_active = TRUE
          AND (
              pvc.is_universal = TRUE
              OR EXISTS (
                  SELECT 1
                  FROM catalog.vehicle_variants vv
                  INNER JOIN catalog.vehicle_brands vb ON vb.id = p_brand_id
                  WHERE vv.id = pvc.vehicle_variant_id
                    AND LOWER(TRIM(vv.make)) = LOWER(TRIM(vb.name))
              )
          )
    );
$$;

COMMENT ON FUNCTION catalog.product_matches_vehicle_brand(UUID, UUID) IS
    'TRUE si el producto tiene compatibilidad activa universal o por variante cuyo make coincide con el nombre de la marca (vehicle_brands).';

-- ----------------------------------------------------------------------------
-- Vista principal
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS catalog.v_store_products;
DROP VIEW IF EXISTS automation.v_store_products;

CREATE OR REPLACE VIEW automation.v_store_products AS
WITH
primary_image AS (
    SELECT DISTINCT ON (product_id)
        product_id,
        id AS primary_image_id,
        file_path AS primary_image_file_path,
        file_name AS primary_image_file_name,
        mime_type AS primary_image_mime_type,
        alt_text AS primary_image_alt_text,
        width AS primary_image_width,
        height AS primary_image_height
    FROM catalog.product_images
    WHERE is_active = TRUE
    ORDER BY
        product_id,
        is_primary DESC NULLS LAST,
        display_order ASC NULLS LAST,
        created_at ASC
),
images_agg AS (
    SELECT
        pi.product_id,
        jsonb_agg(
            jsonb_build_object(
                'id', pi.id,
                'file_path', pi.file_path,
                'file_name', pi.file_name,
                'mime_type', pi.mime_type,
                'alt_text', pi.alt_text,
                'display_order', pi.display_order,
                'is_primary', pi.is_primary,
                'width', pi.width,
                'height', pi.height
            )
            ORDER BY pi.is_primary DESC NULLS LAST, pi.display_order ASC NULLS LAST, pi.created_at ASC
        ) AS product_images_json
    FROM catalog.product_images pi
    WHERE pi.is_active = TRUE
    GROUP BY pi.product_id
),
-- Sucursal: una fila por producto habilitado en esa sucursal
branch_rows AS (
    SELECT
        s.id AS store_id,
        s.type AS store_type,
        s.slug AS store_slug,
        s.name AS store_name,
        s.is_active AS store_is_active,
        s.archived_at AS store_archived_at,
        s.business_group_id AS store_business_group_id,
        s.business_id AS store_business_id,
        s.vehicle_brand_id AS store_vehicle_brand_id,
        'branch'::text AS pricing_scope,
        p.id AS product_id,
        p.sku AS product_sku,
        COALESCE(pba.price, p.price) AS effective_price,
        p.price AS base_catalog_price,
        (pba.price IS NOT NULL) AS price_is_branch_override,
        pba.stock AS stock_quantity,
        (pba.stock IS NULL) AS stock_is_unlimited_or_not_tracked,
        pba.allow_backorder AS branch_allow_backorder,
        pba.backorder_lead_time_days AS branch_backorder_lead_time_days,
        pba.backorder_notes AS branch_backorder_notes,
        1::bigint AS branch_availability_count,
        pba.branch_id AS source_branch_id,
        b.name AS source_branch_name,
        p.business_id AS product_owner_business_id,
        p.name AS product_name,
        p.description AS product_description,
        p.image_url AS product_image_url_legacy,
        p.product_type::text AS product_type,
        p.category_id AS product_category_id,
        pc.name AS category_name,
        pc.display_order AS category_display_order,
        p.is_available AS product_is_available,
        p.is_featured AS product_is_featured,
        p.display_order AS product_display_order,
        p.variants AS product_variants,
        p.nutritional_info AS product_nutritional_info,
        p.allergens AS product_allergens,
        p.metadata AS product_metadata,
        p.created_at AS product_created_at,
        p.updated_at AS product_updated_at,
        pimg.primary_image_file_path,
        pimg.primary_image_file_name,
        pimg.primary_image_mime_type,
        pimg.primary_image_alt_text,
        pimg.primary_image_width,
        pimg.primary_image_height,
        COALESCE(ia.product_images_json, '[]'::jsonb) AS product_images_json
    FROM core.stores s
    INNER JOIN catalog.product_branch_availability pba
        ON pba.branch_id = s.business_id
        AND pba.is_active = TRUE
        AND pba.is_enabled = TRUE
    INNER JOIN catalog.products p ON p.id = pba.product_id
    INNER JOIN core.businesses b ON b.id = pba.branch_id AND b.is_active = TRUE
    LEFT JOIN catalog.product_categories pc ON pc.id = p.category_id
    LEFT JOIN primary_image pimg ON pimg.product_id = p.id
    LEFT JOIN images_agg ia ON ia.product_id = p.id
    WHERE s.type = 'branch'
      AND s.is_active = TRUE
      AND (s.archived_at IS NULL)
      AND p.is_available = TRUE
      AND (p.price)::numeric > 0
),
-- Grupo: agregado por producto en sucursales del grupo
group_rows AS (
    SELECT
        s.id AS store_id,
        s.type AS store_type,
        s.slug AS store_slug,
        s.name AS store_name,
        s.is_active AS store_is_active,
        s.archived_at AS store_archived_at,
        s.business_group_id AS store_business_group_id,
        s.business_id AS store_business_id,
        s.vehicle_brand_id AS store_vehicle_brand_id,
        'aggregated_group'::text AS pricing_scope,
        p.id AS product_id,
        p.sku AS product_sku,
        MIN(COALESCE(pba.price, p.price)) AS effective_price,
        p.price AS base_catalog_price,
        FALSE AS price_is_branch_override,
        SUM(CASE WHEN pba.stock IS NULL THEN 0 ELSE pba.stock END)::integer AS stock_quantity,
        BOOL_OR(pba.stock IS NULL) AS stock_is_unlimited_or_not_tracked,
        BOOL_OR(COALESCE(pba.allow_backorder, FALSE)) AS branch_allow_backorder,
        MIN(pba.backorder_lead_time_days) FILTER (WHERE pba.backorder_lead_time_days IS NOT NULL) AS branch_backorder_lead_time_days,
        NULL::text AS branch_backorder_notes,
        COUNT(DISTINCT pba.branch_id)::bigint AS branch_availability_count,
        NULL::uuid AS source_branch_id,
        NULL::varchar AS source_branch_name,
        p.business_id AS product_owner_business_id,
        p.name AS product_name,
        p.description AS product_description,
        p.image_url AS product_image_url_legacy,
        p.product_type::text AS product_type,
        p.category_id AS product_category_id,
        pc.name AS category_name,
        pc.display_order AS category_display_order,
        p.is_available AS product_is_available,
        p.is_featured AS product_is_featured,
        p.display_order AS product_display_order,
        p.variants AS product_variants,
        p.nutritional_info AS product_nutritional_info,
        p.allergens AS product_allergens,
        p.metadata AS product_metadata,
        p.created_at AS product_created_at,
        p.updated_at AS product_updated_at,
        pimg.primary_image_file_path,
        pimg.primary_image_file_name,
        pimg.primary_image_mime_type,
        pimg.primary_image_alt_text,
        pimg.primary_image_width,
        pimg.primary_image_height,
        COALESCE(ia.product_images_json, '[]'::jsonb) AS product_images_json
    FROM core.stores s
    INNER JOIN catalog.product_branch_availability pba
        ON pba.is_active = TRUE
        AND pba.is_enabled = TRUE
    INNER JOIN catalog.products p ON p.id = pba.product_id
    INNER JOIN core.businesses b
        ON b.id = pba.branch_id
        AND b.is_active = TRUE
        AND b.business_group_id = s.business_group_id
    LEFT JOIN catalog.product_categories pc ON pc.id = p.category_id
    LEFT JOIN primary_image pimg ON pimg.product_id = p.id
    LEFT JOIN images_agg ia ON ia.product_id = p.id
    WHERE s.type = 'group'
      AND s.is_active = TRUE
      AND (s.archived_at IS NULL)
      AND p.is_available = TRUE
      AND (p.price)::numeric > 0
    GROUP BY
        s.id, s.type, s.slug, s.name, s.is_active, s.archived_at,
        s.business_group_id, s.business_id, s.vehicle_brand_id,
        p.id, p.sku, p.price, p.business_id, p.name, p.description, p.image_url,
        p.product_type, p.category_id, pc.name, pc.display_order,
        p.is_available, p.is_featured, p.display_order,
        p.variants, p.nutritional_info, p.allergens, p.metadata,
        p.created_at, p.updated_at,
        pimg.primary_image_file_path, pimg.primary_image_file_name,
        pimg.primary_image_mime_type, pimg.primary_image_alt_text,
        pimg.primary_image_width, pimg.primary_image_height,
        ia.product_images_json
),
-- Grupo + marca: mismo agregado que group_rows pero solo tiendas group_brand y filtro marca
group_brand_rows AS (
    SELECT
        s.id AS store_id,
        s.type AS store_type,
        s.slug AS store_slug,
        s.name AS store_name,
        s.is_active AS store_is_active,
        s.archived_at AS store_archived_at,
        s.business_group_id AS store_business_group_id,
        s.business_id AS store_business_id,
        s.vehicle_brand_id AS store_vehicle_brand_id,
        'aggregated_group_brand'::text AS pricing_scope,
        p.id AS product_id,
        p.sku AS product_sku,
        MIN(COALESCE(pba.price, p.price)) AS effective_price,
        p.price AS base_catalog_price,
        FALSE AS price_is_branch_override,
        SUM(CASE WHEN pba.stock IS NULL THEN 0 ELSE pba.stock END)::integer AS stock_quantity,
        BOOL_OR(pba.stock IS NULL) AS stock_is_unlimited_or_not_tracked,
        BOOL_OR(COALESCE(pba.allow_backorder, FALSE)) AS branch_allow_backorder,
        MIN(pba.backorder_lead_time_days) FILTER (WHERE pba.backorder_lead_time_days IS NOT NULL) AS branch_backorder_lead_time_days,
        NULL::text AS branch_backorder_notes,
        COUNT(DISTINCT pba.branch_id)::bigint AS branch_availability_count,
        NULL::uuid AS source_branch_id,
        NULL::varchar AS source_branch_name,
        p.business_id AS product_owner_business_id,
        p.name AS product_name,
        p.description AS product_description,
        p.image_url AS product_image_url_legacy,
        p.product_type::text AS product_type,
        p.category_id AS product_category_id,
        pc.name AS category_name,
        pc.display_order AS category_display_order,
        p.is_available AS product_is_available,
        p.is_featured AS product_is_featured,
        p.display_order AS product_display_order,
        p.variants AS product_variants,
        p.nutritional_info AS product_nutritional_info,
        p.allergens AS product_allergens,
        p.metadata AS product_metadata,
        p.created_at AS product_created_at,
        p.updated_at AS product_updated_at,
        pimg.primary_image_file_path,
        pimg.primary_image_file_name,
        pimg.primary_image_mime_type,
        pimg.primary_image_alt_text,
        pimg.primary_image_width,
        pimg.primary_image_height,
        COALESCE(ia.product_images_json, '[]'::jsonb) AS product_images_json
    FROM core.stores s
    INNER JOIN catalog.product_branch_availability pba
        ON pba.is_active = TRUE
        AND pba.is_enabled = TRUE
    INNER JOIN catalog.products p ON p.id = pba.product_id
    INNER JOIN core.businesses b
        ON b.id = pba.branch_id
        AND b.is_active = TRUE
        AND b.business_group_id = s.business_group_id
    LEFT JOIN catalog.product_categories pc ON pc.id = p.category_id
    LEFT JOIN primary_image pimg ON pimg.product_id = p.id
    LEFT JOIN images_agg ia ON ia.product_id = p.id
    WHERE s.type = 'group_brand'
      AND s.is_active = TRUE
      AND (s.archived_at IS NULL)
      AND p.is_available = TRUE
      AND (p.price)::numeric > 0
      AND (
          p.product_type IS NULL
          OR p.product_type::text NOT IN ('refaccion', 'accesorio')
          OR catalog.product_matches_vehicle_brand(p.id, s.vehicle_brand_id)
      )
    GROUP BY
        s.id, s.type, s.slug, s.name, s.is_active, s.archived_at,
        s.business_group_id, s.business_id, s.vehicle_brand_id,
        p.id, p.sku, p.price, p.business_id, p.name, p.description, p.image_url,
        p.product_type, p.category_id, pc.name, pc.display_order,
        p.is_available, p.is_featured, p.display_order,
        p.variants, p.nutritional_info, p.allergens, p.metadata,
        p.created_at, p.updated_at,
        pimg.primary_image_file_path, pimg.primary_image_file_name,
        pimg.primary_image_mime_type, pimg.primary_image_alt_text,
        pimg.primary_image_width, pimg.primary_image_height,
        ia.product_images_json
),
-- global_brand: mismo agregado que grupo pero en todas las sucursales activas
global_brand_base AS (
    SELECT
        s.id AS store_id,
        s.type AS store_type,
        s.slug AS store_slug,
        s.name AS store_name,
        s.is_active AS store_is_active,
        s.archived_at AS store_archived_at,
        s.business_group_id AS store_business_group_id,
        s.business_id AS store_business_id,
        s.vehicle_brand_id AS store_vehicle_brand_id,
        p.id AS product_id,
        p.sku AS product_sku,
        MIN(COALESCE(pba.price, p.price)) AS effective_price,
        p.price AS base_catalog_price,
        SUM(CASE WHEN pba.stock IS NULL THEN 0 ELSE pba.stock END)::integer AS stock_quantity,
        BOOL_OR(pba.stock IS NULL) AS stock_is_unlimited_or_not_tracked,
        BOOL_OR(COALESCE(pba.allow_backorder, FALSE)) AS branch_allow_backorder,
        MIN(pba.backorder_lead_time_days) FILTER (WHERE pba.backorder_lead_time_days IS NOT NULL) AS branch_backorder_lead_time_days,
        COUNT(DISTINCT pba.branch_id)::bigint AS branch_availability_count,
        p.business_id AS product_owner_business_id,
        p.name AS product_name,
        p.description AS product_description,
        p.image_url AS product_image_url_legacy,
        p.product_type::text AS product_type,
        p.category_id AS product_category_id,
        p.is_available AS product_is_available,
        p.is_featured AS product_is_featured,
        p.display_order AS product_display_order,
        p.variants AS product_variants,
        p.nutritional_info AS product_nutritional_info,
        p.allergens AS product_allergens,
        p.metadata AS product_metadata,
        p.created_at AS product_created_at,
        p.updated_at AS product_updated_at
    FROM core.stores s
    INNER JOIN catalog.product_branch_availability pba
        ON pba.is_active = TRUE
        AND pba.is_enabled = TRUE
    INNER JOIN catalog.products p ON p.id = pba.product_id
    INNER JOIN core.businesses b ON b.id = pba.branch_id AND b.is_active = TRUE
    WHERE s.type = 'global_brand'
      AND s.is_active = TRUE
      AND (s.archived_at IS NULL)
      AND p.is_available = TRUE
      AND (p.price)::numeric > 0
      AND (
          p.product_type IS NULL
          OR p.product_type::text NOT IN ('refaccion', 'accesorio')
          OR catalog.product_matches_vehicle_brand(p.id, s.vehicle_brand_id)
      )
    GROUP BY
        s.id, s.type, s.slug, s.name, s.is_active, s.archived_at,
        s.business_group_id, s.business_id, s.vehicle_brand_id,
        p.id, p.sku, p.price, p.business_id, p.name, p.description, p.image_url,
        p.product_type, p.category_id,
        p.is_available, p.is_featured, p.display_order,
        p.variants, p.nutritional_info, p.allergens, p.metadata,
        p.created_at, p.updated_at
),
global_brand_rows AS (
    SELECT
        gb.store_id,
        gb.store_type,
        gb.store_slug,
        gb.store_name,
        gb.store_is_active,
        gb.store_archived_at,
        gb.store_business_group_id,
        gb.store_business_id,
        gb.store_vehicle_brand_id,
        'aggregated_global_brand'::text AS pricing_scope,
        gb.product_id,
        gb.product_sku,
        gb.effective_price,
        gb.base_catalog_price,
        FALSE AS price_is_branch_override,
        gb.stock_quantity,
        gb.stock_is_unlimited_or_not_tracked,
        gb.branch_allow_backorder,
        gb.branch_backorder_lead_time_days,
        NULL::text AS branch_backorder_notes,
        gb.branch_availability_count,
        NULL::uuid AS source_branch_id,
        NULL::varchar AS source_branch_name,
        gb.product_owner_business_id,
        gb.product_name,
        gb.product_description,
        gb.product_image_url_legacy,
        gb.product_type,
        gb.product_category_id,
        pc.name AS category_name,
        pc.display_order AS category_display_order,
        gb.product_is_available,
        gb.product_is_featured,
        gb.product_display_order,
        gb.product_variants,
        gb.product_nutritional_info,
        gb.product_allergens,
        gb.product_metadata,
        gb.product_created_at,
        gb.product_updated_at,
        pimg.primary_image_file_path,
        pimg.primary_image_file_name,
        pimg.primary_image_mime_type,
        pimg.primary_image_alt_text,
        pimg.primary_image_width,
        pimg.primary_image_height,
        COALESCE(ia.product_images_json, '[]'::jsonb) AS product_images_json
    FROM global_brand_base gb
    LEFT JOIN catalog.product_categories pc ON pc.id = gb.product_category_id
    LEFT JOIN primary_image pimg ON pimg.product_id = gb.product_id
    LEFT JOIN images_agg ia ON ia.product_id = gb.product_id
),
-- Global: catálogo sin filtro por sucursal (precio de lista; stock no aplica al canal)
global_rows AS (
    SELECT
        s.id AS store_id,
        s.type AS store_type,
        s.slug AS store_slug,
        s.name AS store_name,
        s.is_active AS store_is_active,
        s.archived_at AS store_archived_at,
        s.business_group_id AS store_business_group_id,
        s.business_id AS store_business_id,
        s.vehicle_brand_id AS store_vehicle_brand_id,
        'catalog_global'::text AS pricing_scope,
        p.id AS product_id,
        p.sku AS product_sku,
        p.price AS effective_price,
        p.price AS base_catalog_price,
        FALSE AS price_is_branch_override,
        NULL::integer AS stock_quantity,
        TRUE AS stock_is_unlimited_or_not_tracked,
        FALSE AS branch_allow_backorder,
        NULL::integer AS branch_backorder_lead_time_days,
        NULL::text AS branch_backorder_notes,
        NULL::bigint AS branch_availability_count,
        NULL::uuid AS source_branch_id,
        NULL::varchar AS source_branch_name,
        p.business_id AS product_owner_business_id,
        p.name AS product_name,
        p.description AS product_description,
        p.image_url AS product_image_url_legacy,
        p.product_type::text AS product_type,
        p.category_id AS product_category_id,
        pc.name AS category_name,
        pc.display_order AS category_display_order,
        p.is_available AS product_is_available,
        p.is_featured AS product_is_featured,
        p.display_order AS product_display_order,
        p.variants AS product_variants,
        p.nutritional_info AS product_nutritional_info,
        p.allergens AS product_allergens,
        p.metadata AS product_metadata,
        p.created_at AS product_created_at,
        p.updated_at AS product_updated_at,
        pimg.primary_image_file_path,
        pimg.primary_image_file_name,
        pimg.primary_image_mime_type,
        pimg.primary_image_alt_text,
        pimg.primary_image_width,
        pimg.primary_image_height,
        COALESCE(ia.product_images_json, '[]'::jsonb) AS product_images_json
    FROM core.stores s
    INNER JOIN catalog.products p ON p.is_available = TRUE AND (p.price)::numeric > 0
    LEFT JOIN catalog.product_categories pc ON pc.id = p.category_id
    LEFT JOIN primary_image pimg ON pimg.product_id = p.id
    LEFT JOIN images_agg ia ON ia.product_id = p.id
    WHERE s.type = 'global'
      AND s.is_active = TRUE
      AND (s.archived_at IS NULL)
),
combined_store_products AS (
    SELECT * FROM branch_rows
    UNION ALL
    SELECT * FROM group_rows
    UNION ALL
    SELECT * FROM group_brand_rows
    UNION ALL
    SELECT * FROM global_brand_rows
    UNION ALL
    SELECT * FROM global_rows
)
SELECT
    c.store_id,
    c.product_sku AS sku,
    c.effective_price AS price,
    c.stock_quantity AS stock,
    c.product_id,
    c.product_name,
    c.product_description,
    c.product_image_url_legacy,
    c.primary_image_file_path,
    c.primary_image_file_name,
    c.primary_image_mime_type,
    c.primary_image_alt_text,
    c.primary_image_width,
    c.primary_image_height,
    c.product_images_json,
    c.product_type,
    c.product_category_id,
    c.category_name,
    c.category_display_order,
    c.product_is_available,
    c.product_is_featured,
    c.product_display_order,
    c.product_variants,
    c.product_nutritional_info,
    c.product_allergens,
    c.product_metadata,
    c.product_created_at,
    c.product_updated_at,
    c.store_type,
    c.store_slug,
    c.store_name,
    c.store_is_active,
    c.store_archived_at,
    c.store_business_group_id,
    c.store_business_id,
    c.store_vehicle_brand_id,
    c.pricing_scope,
    c.base_catalog_price,
    c.price_is_branch_override,
    c.stock_is_unlimited_or_not_tracked,
    c.branch_allow_backorder,
    c.branch_backorder_lead_time_days,
    c.branch_backorder_notes,
    c.branch_availability_count,
    c.source_branch_id,
    c.source_branch_name,
    c.product_owner_business_id
FROM combined_store_products c;

COMMENT ON VIEW automation.v_store_products IS
    'Catálogo efectivo por core.stores. Primeras columnas: store_id, sku, price (precio efectivo), stock. pricing_scope indica branch | aggregated_group | aggregated_group_brand | aggregated_global_brand | catalog_global. Galería en product_images_json; imagen principal en primary_image_*.';

-- ============================================================================
-- NOTAS
-- ============================================================================
-- 1. Vista en esquema automation: SELECT * FROM automation.v_store_products WHERE store_id = $1;
--    Compatibilidades por tienda: migration_automation_v_product_vehicle_compatibilities.sql
--    → automation.v_product_vehicle_compatibilities (mismo store_id).
--    Combinaciones vehículo por tienda: migration_automation_v_store_vehicle_combinations.sql
--    → automation.v_store_vehicle_combinations.
-- 2. Ejecutar después de: core.stores, catalog.product_branch_availability,
--    catalog.products, catalog.product_images, migration_vehicle_variants_and_compat_radical
--    (o esquema equivalente con product_vehicle_compatibility + vehicle_variants).
-- 3. Si vehicle_variants.make no coincide con vehicle_brands.name en datos reales,
--    ajustar product_matches_vehicle_brand o enriquecer variantes con código de marca.
-- 4. En vistas agregadas (group / global_brand), effective_price es el MÍNIMO entre
--    sucursales; valide si el negocio prefiere MAX u otra regla.
-- 5. stock_quantity en agregados suma solo filas con stock numérico; si alguna sucursal
--    tiene stock NULL, stock_is_unlimited_or_not_tracked = TRUE (interpretación operativa).
-- 6. Tiendas archivadas (archived_at IS NOT NULL) no aparecen en filas; al consultar por
--    store_id histórico, usar consulta directa a tablas base si se requiere.
-- ============================================================================
