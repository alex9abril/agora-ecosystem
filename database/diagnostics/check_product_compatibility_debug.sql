-- ============================================================================
-- DIAGNÓSTICO: Verificar compatibilidad de productos con vehículos
-- ============================================================================
-- Este script ayuda a diagnosticar problemas de compatibilidad
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- 1. Verificar la función actual
-- ============================================================================

SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'catalog'
  AND p.proname = 'check_product_vehicle_compatibility';

-- ============================================================================
-- 2. Ver todos los registros de compatibilidad de un producto
-- ============================================================================
-- Reemplaza 'PRODUCT_ID_AQUI' con el ID del producto que estás verificando

-- Ejemplo: Ver compatibilidades de un producto
/*
SELECT 
    pvc.id,
    pvc.product_id,
    p.name as product_name,
    vb.name as brand_name,
    vm.name as model_name,
    vy.year_start,
    vy.year_end,
    vs.engine_code,
    vs.transmission_type,
    pvc.is_universal,
    pvc.is_active,
    pvc.notes
FROM catalog.product_vehicle_compatibility pvc
LEFT JOIN catalog.products p ON pvc.product_id = p.id
LEFT JOIN catalog.vehicle_brands vb ON pvc.vehicle_brand_id = vb.id
LEFT JOIN catalog.vehicle_models vm ON pvc.vehicle_model_id = vm.id
LEFT JOIN catalog.vehicle_years vy ON pvc.vehicle_year_id = vy.id
LEFT JOIN catalog.vehicle_specs vs ON pvc.vehicle_spec_id = vs.id
WHERE pvc.product_id = 'PRODUCT_ID_AQUI'::UUID
ORDER BY 
    pvc.is_universal DESC,
    vb.name,
    vm.name,
    vy.year_start;
*/

-- ============================================================================
-- 3. Verificar compatibilidad manualmente
-- ============================================================================
-- Reemplaza los valores con los IDs reales de tu caso

/*
-- Ejemplo: Verificar si un producto es compatible con un vehículo específico
SELECT 
    catalog.check_product_vehicle_compatibility(
        'PRODUCT_ID'::UUID,      -- ID del producto
        'BRAND_ID'::UUID,        -- ID de la marca del vehículo
        'MODEL_ID'::UUID,        -- ID del modelo del vehículo (o NULL)
        'YEAR_ID'::UUID,         -- ID del año del vehículo (o NULL)
        'SPEC_ID'::UUID          -- ID de la spec del vehículo (o NULL)
    ) as is_compatible;
*/

-- ============================================================================
-- 4. Buscar productos con compatibilidad solo por marca (sin modelo)
-- ============================================================================
-- Estos productos serán compatibles con TODOS los modelos de esa marca

SELECT 
    p.id as product_id,
    p.name as product_name,
    vb.name as brand_name,
    COUNT(*) as compatibility_records
FROM catalog.product_vehicle_compatibility pvc
JOIN catalog.products p ON pvc.product_id = p.id
JOIN catalog.vehicle_brands vb ON pvc.vehicle_brand_id = vb.id
WHERE pvc.is_active = TRUE
  AND pvc.is_universal = FALSE
  AND pvc.vehicle_brand_id IS NOT NULL
  AND pvc.vehicle_model_id IS NULL
  AND pvc.vehicle_year_id IS NULL
  AND pvc.vehicle_spec_id IS NULL
GROUP BY p.id, p.name, vb.name
ORDER BY vb.name, p.name;

-- ============================================================================
-- 5. Verificar si hay registros de compatibilidad duplicados o conflictivos
-- ============================================================================

SELECT 
    pvc.product_id,
    p.name as product_name,
    COUNT(*) as total_compatibilities,
    COUNT(CASE WHEN pvc.vehicle_model_id IS NULL THEN 1 END) as brand_only,
    COUNT(CASE WHEN pvc.vehicle_model_id IS NOT NULL THEN 1 END) as model_specific
FROM catalog.product_vehicle_compatibility pvc
JOIN catalog.products p ON pvc.product_id = p.id
WHERE pvc.is_active = TRUE
  AND pvc.is_universal = FALSE
GROUP BY pvc.product_id, p.name
HAVING COUNT(CASE WHEN pvc.vehicle_model_id IS NULL THEN 1 END) > 0
   AND COUNT(CASE WHEN pvc.vehicle_model_id IS NOT NULL THEN 1 END) > 0
ORDER BY p.name;

-- ============================================================================
-- 6. Probar la función con un caso específico
-- ============================================================================
-- Descomenta y ajusta los valores según tu caso de prueba

/*
-- Caso de prueba: Producto compatible con Corolla vs Vehículo Tacoma
-- Esto debería retornar FALSE si la función está correcta

-- Primero, necesitas obtener los IDs reales:
-- 1. ID del producto
-- 2. ID de la marca Toyota
-- 3. ID del modelo Corolla
-- 4. ID del modelo Tacoma
-- 5. ID del año (si aplica)

-- Ejemplo de consulta para obtener IDs:
SELECT id, name FROM catalog.vehicle_brands WHERE name ILIKE '%toyota%';
SELECT id, name FROM catalog.vehicle_models WHERE name ILIKE '%corolla%';
SELECT id, name FROM catalog.vehicle_models WHERE name ILIKE '%tacoma%';

-- Luego prueba:
SELECT 
    catalog.check_product_vehicle_compatibility(
        'PRODUCT_ID_COROLLA'::UUID,
        'TOYOTA_BRAND_ID'::UUID,
        'TACOMA_MODEL_ID'::UUID,  -- Modelo diferente al del producto
        NULL::UUID,
        NULL::UUID
    ) as should_be_false;
*/

