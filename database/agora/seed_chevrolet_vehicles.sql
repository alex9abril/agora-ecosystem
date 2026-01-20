-- ============================================================================
-- AGORA ECOSYSTEM - Seed: Vehículos Chevrolet (Catálogo Completo)
-- ============================================================================
-- Descripción: Pobla el catálogo de vehículos con marcas, modelos, años y
--              especificaciones técnicas de Chevrolet (marca popular en México).
-- 
-- Uso: Ejecutar después de migration_vehicle_compatibility.sql
-- Nota: Este script es idempotente, puede ejecutarse múltiples veces sin errores
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-01-27
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- FUNCIÓN HELPER: Insertar año para un modelo
-- ============================================================================

CREATE OR REPLACE FUNCTION insert_vehicle_year(
  p_brand_code VARCHAR,
  p_model_code VARCHAR,
  p_year_start INTEGER,
  p_year_end INTEGER DEFAULT NULL,
  p_generation VARCHAR DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO catalog.vehicle_years (model_id, year_start, year_end, generation, is_active)
  SELECT vm.id, p_year_start, p_year_end, p_generation, TRUE
  FROM catalog.vehicle_models vm
  INNER JOIN catalog.vehicle_brands vb ON vm.brand_id = vb.id
  WHERE vb.code = p_brand_code AND vm.code = p_model_code
    AND NOT EXISTS (
      SELECT 1 FROM catalog.vehicle_years vy 
      WHERE vy.model_id = vm.id 
        AND vy.year_start = p_year_start 
        AND (
          (vy.year_end = p_year_end) OR 
          (vy.year_end IS NULL AND p_year_end IS NULL)
        )
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. MARCA: CHEVROLET
-- ============================================================================

INSERT INTO catalog.vehicle_brands (name, code, display_order, is_active)
VALUES ('Chevrolet', 'CHEVROLET', 2, TRUE)
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 2. MODELOS CHEVROLET (Catálogo Completo - Modelos Populares en México)
-- ============================================================================

INSERT INTO catalog.vehicle_models (brand_id, name, code, display_order, is_active)
SELECT 
  (SELECT id FROM catalog.vehicle_brands WHERE code = 'CHEVROLET' LIMIT 1),
  name,
  code,
  display_order,
  is_active
FROM (VALUES 
  -- Modelos compactos y subcompactos
  ('Spark', 'SPARK', 1, TRUE),
  ('Aveo', 'AVEO', 2, TRUE),
  ('Sonic', 'SONIC', 3, TRUE),
  ('Cruze', 'CRUZE', 4, TRUE),
  ('Malibu', 'MALIBU', 5, TRUE),
  ('Impala', 'IMPALA', 6, TRUE),
  
  -- SUVs y Crossovers
  ('Trax', 'TRAX', 7, TRUE),
  ('Equinox', 'EQUINOX', 8, TRUE),
  ('Blazer', 'BLAZER', 9, TRUE),
  ('Traverse', 'TRAVERSE', 10, TRUE),
  ('Tahoe', 'TAHOE', 11, TRUE),
  ('Suburban', 'SUBURBAN', 12, TRUE),
  
  -- Pickups
  ('Colorado', 'COLORADO', 13, TRUE),
  ('Silverado', 'SILVERADO', 14, TRUE),
  
  -- Deportivos
  ('Camaro', 'CAMARO', 15, TRUE),
  ('Corvette', 'CORVETTE', 16, TRUE),
  
  -- Vans
  ('Express', 'EXPRESS', 17, TRUE)
) AS v(name, code, display_order, is_active)
ON CONFLICT (brand_id, code) DO UPDATE SET 
  name = EXCLUDED.name,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 3. AÑOS/GENERACIONES: SPARK
-- ============================================================================

SELECT insert_vehicle_year('CHEVROLET', 'SPARK', 2010, 2015, '2nd Gen');
SELECT insert_vehicle_year('CHEVROLET', 'SPARK', 2016, 2022, '3rd Gen');
SELECT insert_vehicle_year('CHEVROLET', 'SPARK', 2023, NULL, '3rd Gen (Facelift)');

-- ============================================================================
-- 4. AÑOS/GENERACIONES: AVEO
-- ============================================================================

SELECT insert_vehicle_year('CHEVROLET', 'AVEO', 2006, 2011, '1st Gen');
SELECT insert_vehicle_year('CHEVROLET', 'AVEO', 2012, 2015, '2nd Gen');
SELECT insert_vehicle_year('CHEVROLET', 'AVEO', 2016, 2020, '2nd Gen (Facelift)');

-- ============================================================================
-- 5. AÑOS/GENERACIONES: SONIC
-- ============================================================================

SELECT insert_vehicle_year('CHEVROLET', 'SONIC', 2012, 2016, '1st Gen');
SELECT insert_vehicle_year('CHEVROLET', 'SONIC', 2017, 2020, '1st Gen (Facelift)');

-- ============================================================================
-- 6. AÑOS/GENERACIONES: CRUZE
-- ============================================================================

SELECT insert_vehicle_year('CHEVROLET', 'CRUZE', 2009, 2015, '1st Gen');
SELECT insert_vehicle_year('CHEVROLET', 'CRUZE', 2016, 2019, '2nd Gen');
SELECT insert_vehicle_year('CHEVROLET', 'CRUZE', 2020, 2023, '2nd Gen (Facelift)');

-- ============================================================================
-- 7. AÑOS/GENERACIONES: MALIBU
-- ============================================================================

SELECT insert_vehicle_year('CHEVROLET', 'MALIBU', 2010, 2012, '7th Gen');
SELECT insert_vehicle_year('CHEVROLET', 'MALIBU', 2013, 2015, '8th Gen');
SELECT insert_vehicle_year('CHEVROLET', 'MALIBU', 2016, 2023, '9th Gen');

-- ============================================================================
-- 8. AÑOS/GENERACIONES: IMPALA
-- ============================================================================

SELECT insert_vehicle_year('CHEVROLET', 'IMPALA', 2010, 2013, '9th Gen');
SELECT insert_vehicle_year('CHEVROLET', 'IMPALA', 2014, 2020, '10th Gen');

-- ============================================================================
-- 9. AÑOS/GENERACIONES: TRAX
-- ============================================================================

SELECT insert_vehicle_year('CHEVROLET', 'TRAX', 2013, 2016, '1st Gen');
SELECT insert_vehicle_year('CHEVROLET', 'TRAX', 2017, 2022, '1st Gen (Facelift)');
SELECT insert_vehicle_year('CHEVROLET', 'TRAX', 2023, NULL, '2nd Gen');

-- ============================================================================
-- 10. AÑOS/GENERACIONES: EQUINOX
-- ============================================================================

SELECT insert_vehicle_year('CHEVROLET', 'EQUINOX', 2010, 2016, '1st Gen');
SELECT insert_vehicle_year('CHEVROLET', 'EQUINOX', 2017, 2022, '2nd Gen');
SELECT insert_vehicle_year('CHEVROLET', 'EQUINOX', 2023, NULL, '3rd Gen');

-- ============================================================================
-- 11. AÑOS/GENERACIONES: BLAZER
-- ============================================================================

SELECT insert_vehicle_year('CHEVROLET', 'BLAZER', 2019, 2023, '5th Gen');
SELECT insert_vehicle_year('CHEVROLET', 'BLAZER', 2024, NULL, '5th Gen (Facelift)');

-- ============================================================================
-- 12. AÑOS/GENERACIONES: TRAVERSE
-- ============================================================================

SELECT insert_vehicle_year('CHEVROLET', 'TRAVERSE', 2009, 2017, '1st Gen');
SELECT insert_vehicle_year('CHEVROLET', 'TRAVERSE', 2018, 2023, '2nd Gen');
SELECT insert_vehicle_year('CHEVROLET', 'TRAVERSE', 2024, NULL, '2nd Gen (Facelift)');

-- ============================================================================
-- 13. AÑOS/GENERACIONES: TAHOE
-- ============================================================================

SELECT insert_vehicle_year('CHEVROLET', 'TAHOE', 2010, 2014, '4th Gen');
SELECT insert_vehicle_year('CHEVROLET', 'TAHOE', 2015, 2020, '4th Gen (Facelift)');
SELECT insert_vehicle_year('CHEVROLET', 'TAHOE', 2021, 2023, '5th Gen');
SELECT insert_vehicle_year('CHEVROLET', 'TAHOE', 2024, NULL, '5th Gen (Facelift)');

-- ============================================================================
-- 14. AÑOS/GENERACIONES: SUBURBAN
-- ============================================================================

SELECT insert_vehicle_year('CHEVROLET', 'SUBURBAN', 2010, 2014, '11th Gen');
SELECT insert_vehicle_year('CHEVROLET', 'SUBURBAN', 2015, 2020, '11th Gen (Facelift)');
SELECT insert_vehicle_year('CHEVROLET', 'SUBURBAN', 2021, 2023, '12th Gen');
SELECT insert_vehicle_year('CHEVROLET', 'SUBURBAN', 2024, NULL, '12th Gen (Facelift)');

-- ============================================================================
-- 15. AÑOS/GENERACIONES: COLORADO
-- ============================================================================

SELECT insert_vehicle_year('CHEVROLET', 'COLORADO', 2010, 2012, '1st Gen');
SELECT insert_vehicle_year('CHEVROLET', 'COLORADO', 2013, 2022, '2nd Gen');
SELECT insert_vehicle_year('CHEVROLET', 'COLORADO', 2023, NULL, '3rd Gen');

-- ============================================================================
-- 16. AÑOS/GENERACIONES: SILVERADO
-- ============================================================================

SELECT insert_vehicle_year('CHEVROLET', 'SILVERADO', 2010, 2013, '2nd Gen');
SELECT insert_vehicle_year('CHEVROLET', 'SILVERADO', 2014, 2018, '3rd Gen');
SELECT insert_vehicle_year('CHEVROLET', 'SILVERADO', 2019, 2023, '4th Gen');
SELECT insert_vehicle_year('CHEVROLET', 'SILVERADO', 2024, NULL, '4th Gen (Facelift)');

-- ============================================================================
-- 17. AÑOS/GENERACIONES: CAMARO
-- ============================================================================

SELECT insert_vehicle_year('CHEVROLET', 'CAMARO', 2010, 2015, '5th Gen');
SELECT insert_vehicle_year('CHEVROLET', 'CAMARO', 2016, 2023, '6th Gen');
SELECT insert_vehicle_year('CHEVROLET', 'CAMARO', 2024, NULL, '6th Gen (Facelift)');

-- ============================================================================
-- 18. AÑOS/GENERACIONES: CORVETTE
-- ============================================================================

SELECT insert_vehicle_year('CHEVROLET', 'CORVETTE', 2010, 2013, 'C6');
SELECT insert_vehicle_year('CHEVROLET', 'CORVETTE', 2014, 2019, 'C7');
SELECT insert_vehicle_year('CHEVROLET', 'CORVETTE', 2020, 2023, 'C8');
SELECT insert_vehicle_year('CHEVROLET', 'CORVETTE', 2024, NULL, 'C8 (Facelift)');

-- ============================================================================
-- 19. AÑOS/GENERACIONES: EXPRESS
-- ============================================================================

SELECT insert_vehicle_year('CHEVROLET', 'EXPRESS', 2010, 2020, '3rd Gen');
SELECT insert_vehicle_year('CHEVROLET', 'EXPRESS', 2021, NULL, '3rd Gen (Facelift)');

-- ============================================================================
-- LIMPIAR FUNCIÓN HELPER
-- ============================================================================

DROP FUNCTION IF EXISTS insert_vehicle_year(VARCHAR, VARCHAR, INTEGER, INTEGER, VARCHAR);

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Verificar datos insertados
SELECT 
  'Marcas' as tipo,
  COUNT(*) as total
FROM catalog.vehicle_brands
WHERE code = 'CHEVROLET' AND is_active = TRUE
UNION ALL
SELECT 
  'Modelos Chevrolet',
  COUNT(*)
FROM catalog.vehicle_models vm
INNER JOIN catalog.vehicle_brands vb ON vm.brand_id = vb.id
WHERE vb.code = 'CHEVROLET' AND vm.is_active = TRUE
UNION ALL
SELECT 
  'Años/Generaciones',
  COUNT(*)
FROM catalog.vehicle_years vy
INNER JOIN catalog.vehicle_models vm ON vy.model_id = vm.id
INNER JOIN catalog.vehicle_brands vb ON vm.brand_id = vb.id
WHERE vb.code = 'CHEVROLET';

-- Mostrar resumen por modelo
SELECT 
  vm.name as modelo,
  COUNT(DISTINCT vy.id) as años,
  COUNT(DISTINCT vs.id) as especificaciones
FROM catalog.vehicle_models vm
INNER JOIN catalog.vehicle_brands vb ON vm.brand_id = vb.id
LEFT JOIN catalog.vehicle_years vy ON vy.model_id = vm.id
LEFT JOIN catalog.vehicle_specs vs ON vs.year_id = vy.id
WHERE vb.code = 'CHEVROLET'
GROUP BY vm.id, vm.name, vm.display_order
ORDER BY vm.display_order;

