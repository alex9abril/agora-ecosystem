-- ============================================================================
-- AGORA ECOSYSTEM - Insert masivo: catálogo → disponibilidad por distribuidor
-- ============================================================================
-- Descripción: Toma todos los productos del catálogo marcados como disponibles
--              (catalog.products.is_available = TRUE) y crea o actualiza filas
--              en catalog.product_branch_availability para una sucursal
--              (core.businesses = distribuidor): is_enabled = TRUE, precio y
--              stock configurables. UNIQUE (product_id, branch_id); si ya existe
--              la fila, se actualizan precio y banderas.
--
--              Sin tablas TEMP: compatible con editores SQL que ejecutan cada
--              sentencia en una sesión distinta (p. ej. Supabase).
-- ============================================================================
-- Versión: 1.6
-- Fecha: 2026-04-19
-- Hora: 12:00:00
-- ============================================================================

SET search_path TO catalog, core, public;

-- ============================================================================
-- PASO 0 (opcional): listar sucursales
-- ============================================================================
--   SELECT id, name, business_group_id
--   FROM core.businesses
--   WHERE archived_at IS NULL
--   ORDER BY name;
-- ============================================================================

-- ============================================================================
-- PASO 1 — Sustituya el UUID en los TRES bloques siguientes (mismo valor)
--          Por defecto: Distribuidor Demo
-- ============================================================================

DO $$
DECLARE
  v_branch UUID := '574d7a92-9979-421d-aef5-6af4673e46de'::UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM core.businesses b WHERE b.id = v_branch) THEN
    RAISE EXCEPTION
      'No existe core.businesses.id = %. Use PASO 0 y copie un id real (edite v_branch en este bloque y el subquery del INSERT).',
      v_branch;
  END IF;
  RAISE NOTICE 'Usando sucursal (branch_id): %', v_branch;
END $$;

-- ============================================================================
-- 2. UPSERT masivo
-- ============================================================================
-- Precio: p.price | NULL (heredar) | ROUND((p.price*1.05)::numeric,2)
-- Mismo UUID que en el bloque DO anterior (subquery branch_pick).
-- ============================================================================

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
  br.branch_id,
  TRUE,
  p.price,
  NULL,
  TRUE
FROM catalog.products p
CROSS JOIN (
  SELECT b.id AS branch_id
  FROM core.businesses b
  WHERE b.id = '574d7a92-9979-421d-aef5-6af4673e46de'::UUID
) br
WHERE p.is_available = TRUE
  AND COALESCE((p.price)::numeric, 0) >= 0
ON CONFLICT (product_id, branch_id) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  price      = EXCLUDED.price,
  stock      = EXCLUDED.stock,
  is_active  = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 3. VERIFICACIÓN (SELECT puro: evita conflictos de nombres con el schema catalog)
-- ============================================================================
-- Mismo UUID que en PASO 1 / INSERT (Distribuidor Demo por defecto).
-- ============================================================================

SELECT
  '574d7a92-9979-421d-aef5-6af4673e46de'::UUID AS branch_id_usado,
  (SELECT COUNT(*)::bigint FROM catalog.products p WHERE p.is_available = TRUE) AS productos_disponibles_en_catalogo,
  (
    SELECT COUNT(*)::bigint
    FROM catalog.product_branch_availability pba
    WHERE pba.branch_id = '574d7a92-9979-421d-aef5-6af4673e46de'::UUID
      AND pba.is_active = TRUE
  ) AS filas_product_branch_availability_en_sucursal;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- 1. UUID por defecto: Distribuidor Demo (574d7a92-9979-421d-aef5-6af4673e46de).
--    Reemplácelo en: DO de validación, subquery del INSERT, y SELECT de verificación
--    (cuatro apariciones del literal).
-- 2. No use variables PL/pgSQL llamadas v_catalog con search_path que incluya el
--    schema catalog; puede provocar error "relation v_catalog does not exist".
-- 3. Tabla destino: catalog.product_branch_availability.
-- 4. Ejecutar solo con autorización explícita del responsable de BD.
-- ============================================================================
