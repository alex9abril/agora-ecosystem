-- ============================================================================
-- AGORA ECOSYSTEM - Seed: Vehículos Toyota (Catálogo Completo y Expandido)
-- ============================================================================
-- Descripción: Pobla el catálogo de vehículos con marcas, modelos, años y
--              especificaciones técnicas de Toyota (marca más común en México).
-- 
-- Uso: Ejecutar después de migration_vehicle_compatibility.sql
-- Nota: Este script es idempotente, puede ejecutarse múltiples veces sin errores
-- ============================================================================
-- Versión: 3.0
-- Fecha: 2025-12-02
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- 1. MARCA: TOYOTA (ya existe, solo actualizar si es necesario)
-- ============================================================================

INSERT INTO catalog.vehicle_brands (id, name, code, display_order, is_active)
VALUES ('00000001-0000-0000-0000-000000000001', 'Toyota', 'TOYOTA', 1, TRUE)
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 2. MODELOS TOYOTA (Catálogo Completo)
-- ============================================================================

INSERT INTO catalog.vehicle_models (id, brand_id, name, code, display_order, is_active)
VALUES 
  -- Modelos existentes (usar IDs exactos de la BD)
  ('00000001-0000-0000-0000-000000000010', '00000001-0000-0000-0000-000000000001', 'Corolla', 'COROLLA', 1, TRUE),
  ('00000001-0000-0000-0000-000000000020', '00000001-0000-0000-0000-000000000001', 'Camry', 'CAMRY', 2, TRUE),
  ('00000001-0000-0000-0000-000000000030', '00000001-0000-0000-0000-000000000001', 'RAV4', 'RAV4', 3, TRUE),
  ('00000001-0000-0000-0000-000000000040', '00000001-0000-0000-0000-000000000001', 'Hilux', 'HILUX', 4, TRUE),
  -- Modelos adicionales
  ('00000001-0000-0000-0000-000000000050', '00000001-0000-0000-0000-000000000001', 'Yaris', 'YARIS', 5, TRUE),
  ('00000001-0000-0000-0000-000000000060', '00000001-0000-0000-0000-000000000001', 'Prius', 'PRIUS', 6, TRUE),
  ('00000001-0000-0000-0000-000000000070', '00000001-0000-0000-0000-000000000001', 'Tacoma', 'TACOMA', 7, TRUE),
  ('00000001-0000-0000-0000-000000000080', '00000001-0000-0000-0000-000000000001', 'Highlander', 'HIGHLANDER', 8, TRUE),
  ('00000001-0000-0000-0000-000000000090', '00000001-0000-0000-0000-000000000001', '4Runner', '4RUNNER', 9, TRUE),
  ('00000001-0000-0000-0000-000000000100', '00000001-0000-0000-0000-000000000001', 'Sienna', 'SIENNA', 10, TRUE),
  ('00000001-0000-0000-0000-000000000110', '00000001-0000-0000-0000-000000000001', 'Tundra', 'TUNDRA', 11, TRUE),
  ('00000001-0000-0000-0000-000000000120', '00000001-0000-0000-0000-000000000001', 'Land Cruiser', 'LAND_CRUISER', 12, TRUE),
  ('00000001-0000-0000-0000-000000000130', '00000001-0000-0000-0000-000000000001', 'C-HR', 'CHR', 13, TRUE),
  ('00000001-0000-0000-0000-000000000140', '00000001-0000-0000-0000-000000000001', 'Sequoia', 'SEQUOIA', 14, TRUE),
  ('00000001-0000-0000-0000-000000000150', '00000001-0000-0000-0000-000000000001', 'Venza', 'VENZA', 15, TRUE),
  ('00000001-0000-0000-0000-000000000160', '00000001-0000-0000-0000-000000000001', 'Avalon', 'AVALON', 16, TRUE),
  ('00000001-0000-0000-0000-000000000170', '00000001-0000-0000-0000-000000000001', 'Supra', 'SUPRA', 17, TRUE),
  ('00000001-0000-0000-0000-000000000180', '00000001-0000-0000-0000-000000000001', 'FJ Cruiser', 'FJ_CRUISER', 18, TRUE)
ON CONFLICT (brand_id, code) DO UPDATE SET 
  name = EXCLUDED.name,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 3. AÑOS/GENERACIONES: COROLLA
-- ============================================================================

INSERT INTO catalog.vehicle_years (id, model_id, year_start, year_end, generation, is_active)
VALUES 
  ('00000001-0000-0000-0000-000000000100', '00000001-0000-0000-0000-000000000010', 2010, 2013, '10th Gen', TRUE),
  ('00000001-0000-0000-0000-000000000110', '00000001-0000-0000-0000-000000000010', 2014, 2018, '11th Gen', TRUE),
  ('00000001-0000-0000-0000-000000000120', '00000001-0000-0000-0000-000000000010', 2019, 2022, '12th Gen', TRUE),
  ('00000001-0000-0000-0000-000000000130', '00000001-0000-0000-0000-000000000010', 2023, NULL, '13th Gen', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. AÑOS/GENERACIONES: CAMRY (CORREGIDO: usar ID correcto 00000001-0000-0000-0000-000000000020)
-- ============================================================================

INSERT INTO catalog.vehicle_years (id, model_id, year_start, year_end, generation, is_active)
VALUES 
  ('00000001-0000-0000-0000-000000000201', '00000001-0000-0000-0000-000000000020', 2010, 2014, '7th Gen', TRUE),
  ('00000001-0000-0000-0000-000000000202', '00000001-0000-0000-0000-000000000020', 2015, 2017, '7th Gen (Facelift)', TRUE),
  ('00000001-0000-0000-0000-000000000203', '00000001-0000-0000-0000-000000000020', 2018, 2023, '8th Gen', TRUE),
  ('00000001-0000-0000-0000-000000000204', '00000001-0000-0000-0000-000000000020', 2024, NULL, '9th Gen', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. AÑOS/GENERACIONES: RAV4 (CORREGIDO: usar ID correcto 00000001-0000-0000-0000-000000000030)
-- ============================================================================

INSERT INTO catalog.vehicle_years (id, model_id, year_start, year_end, generation, is_active)
VALUES 
  ('00000001-0000-0000-0000-000000000301', '00000001-0000-0000-0000-000000000030', 2010, 2012, '3rd Gen', TRUE),
  ('00000001-0000-0000-0000-000000000302', '00000001-0000-0000-0000-000000000030', 2013, 2018, '4th Gen', TRUE),
  ('00000001-0000-0000-0000-000000000303', '00000001-0000-0000-0000-000000000030', 2019, 2023, '5th Gen', TRUE),
  ('00000001-0000-0000-0000-000000000304', '00000001-0000-0000-0000-000000000030', 2024, NULL, '5th Gen (Facelift)', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. AÑOS/GENERACIONES: HILUX (CORREGIDO: usar ID correcto 00000001-0000-0000-0000-000000000040)
-- ============================================================================

INSERT INTO catalog.vehicle_years (id, model_id, year_start, year_end, generation, is_active)
VALUES 
  ('00000001-0000-0000-0000-000000000401', '00000001-0000-0000-0000-000000000040', 2010, 2015, '7th Gen', TRUE),
  ('00000001-0000-0000-0000-000000000402', '00000001-0000-0000-0000-000000000040', 2016, 2023, '8th Gen', TRUE),
  ('00000001-0000-0000-0000-000000000403', '00000001-0000-0000-0000-000000000040', 2024, NULL, '8th Gen (Facelift)', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. AÑOS/GENERACIONES: YARIS
-- ============================================================================

INSERT INTO catalog.vehicle_years (id, model_id, year_start, year_end, generation, is_active)
VALUES 
  ('00000001-0000-0000-0000-000000000501', '00000001-0000-0000-0000-000000000050', 2010, 2013, '2nd Gen', TRUE),
  ('00000001-0000-0000-0000-000000000502', '00000001-0000-0000-0000-000000000050', 2014, 2019, '3rd Gen', TRUE),
  ('00000001-0000-0000-0000-000000000503', '00000001-0000-0000-0000-000000000050', 2020, 2023, '4th Gen', TRUE),
  ('00000001-0000-0000-0000-000000000504', '00000001-0000-0000-0000-000000000050', 2024, NULL, '4th Gen (Facelift)', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. AÑOS/GENERACIONES: PRIUS
-- ============================================================================

INSERT INTO catalog.vehicle_years (id, model_id, year_start, year_end, generation, is_active)
VALUES 
  ('00000001-0000-0000-0000-000000000601', '00000001-0000-0000-0000-000000000060', 2010, 2015, '3rd Gen', TRUE),
  ('00000001-0000-0000-0000-000000000602', '00000001-0000-0000-0000-000000000060', 2016, 2022, '4th Gen', TRUE),
  ('00000001-0000-0000-0000-000000000603', '00000001-0000-0000-0000-000000000060', 2023, NULL, '5th Gen', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. AÑOS/GENERACIONES: TACOMA
-- ============================================================================

INSERT INTO catalog.vehicle_years (id, model_id, year_start, year_end, generation, is_active)
VALUES 
  ('00000001-0000-0000-0000-000000000701', '00000001-0000-0000-0000-000000000070', 2010, 2015, '2nd Gen', TRUE),
  ('00000001-0000-0000-0000-000000000702', '00000001-0000-0000-0000-000000000070', 2016, 2023, '3rd Gen', TRUE),
  ('00000001-0000-0000-0000-000000000703', '00000001-0000-0000-0000-000000000070', 2024, NULL, '4th Gen', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 10. AÑOS/GENERACIONES: HIGHLANDER
-- ============================================================================

INSERT INTO catalog.vehicle_years (id, model_id, year_start, year_end, generation, is_active)
VALUES 
  ('00000001-0000-0000-0000-000000000801', '00000001-0000-0000-0000-000000000080', 2010, 2013, '3rd Gen', TRUE),
  ('00000001-0000-0000-0000-000000000802', '00000001-0000-0000-0000-000000000080', 2014, 2019, '4th Gen', TRUE),
  ('00000001-0000-0000-0000-000000000803', '00000001-0000-0000-0000-000000000080', 2020, 2023, '5th Gen', TRUE),
  ('00000001-0000-0000-0000-000000000804', '00000001-0000-0000-0000-000000000080', 2024, NULL, '5th Gen (Facelift)', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 11. AÑOS/GENERACIONES: 4RUNNER
-- ============================================================================

INSERT INTO catalog.vehicle_years (id, model_id, year_start, year_end, generation, is_active)
VALUES 
  ('00000001-0000-0000-0000-000000000901', '00000001-0000-0000-0000-000000000090', 2010, 2013, '4th Gen', TRUE),
  ('00000001-0000-0000-0000-000000000902', '00000001-0000-0000-0000-000000000090', 2014, NULL, '5th Gen', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 12. AÑOS/GENERACIONES: SIENNA
-- ============================================================================

INSERT INTO catalog.vehicle_years (id, model_id, year_start, year_end, generation, is_active)
VALUES 
  ('00000001-0000-0000-0000-000000001001', '00000001-0000-0000-0000-000000000100', 2011, 2017, '3rd Gen', TRUE),
  ('00000001-0000-0000-0000-000000001002', '00000001-0000-0000-0000-000000000100', 2018, 2020, '3rd Gen (Facelift)', TRUE),
  ('00000001-0000-0000-0000-000000001003', '00000001-0000-0000-0000-000000000100', 2021, 2023, '4th Gen', TRUE),
  ('00000001-0000-0000-0000-000000001004', '00000001-0000-0000-0000-000000000100', 2024, NULL, '4th Gen (Facelift)', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 13. AÑOS/GENERACIONES: TUNDRA
-- ============================================================================

INSERT INTO catalog.vehicle_years (id, model_id, year_start, year_end, generation, is_active)
VALUES 
  ('00000001-0000-0000-0000-000000001101', '00000001-0000-0000-0000-000000000110', 2010, 2013, '2nd Gen', TRUE),
  ('00000001-0000-0000-0000-000000001102', '00000001-0000-0000-0000-000000000110', 2014, 2021, '2nd Gen (Facelift)', TRUE),
  ('00000001-0000-0000-0000-000000001103', '00000001-0000-0000-0000-000000000110', 2022, 2023, '3rd Gen', TRUE),
  ('00000001-0000-0000-0000-000000001104', '00000001-0000-0000-0000-000000000110', 2024, NULL, '3rd Gen (Facelift)', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 14. AÑOS/GENERACIONES: LAND CRUISER
-- ============================================================================

INSERT INTO catalog.vehicle_years (id, model_id, year_start, year_end, generation, is_active)
VALUES 
  ('00000001-0000-0000-0000-000000001201', '00000001-0000-0000-0000-000000000120', 2010, 2015, '200 Series', TRUE),
  ('00000001-0000-0000-0000-000000001202', '00000001-0000-0000-0000-000000000120', 2016, 2021, '200 Series (Facelift)', TRUE),
  ('00000001-0000-0000-0000-000000001203', '00000001-0000-0000-0000-000000000120', 2022, NULL, '300 Series', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 15. AÑOS/GENERACIONES: C-HR
-- ============================================================================

INSERT INTO catalog.vehicle_years (id, model_id, year_start, year_end, generation, is_active)
VALUES 
  ('00000001-0000-0000-0000-000000001301', '00000001-0000-0000-0000-000000000130', 2017, 2023, '1st Gen', TRUE),
  ('00000001-0000-0000-0000-000000001302', '00000001-0000-0000-0000-000000000130', 2024, NULL, '1st Gen (Facelift)', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 16. AÑOS/GENERACIONES: SEQUOIA
-- ============================================================================

INSERT INTO catalog.vehicle_years (id, model_id, year_start, year_end, generation, is_active)
VALUES 
  ('00000001-0000-0000-0000-000000001401', '00000001-0000-0000-0000-000000000140', 2010, 2014, '2nd Gen', TRUE),
  ('00000001-0000-0000-0000-000000001402', '00000001-0000-0000-0000-000000000140', 2015, 2022, '2nd Gen (Facelift)', TRUE),
  ('00000001-0000-0000-0000-000000001403', '00000001-0000-0000-0000-000000000140', 2023, NULL, '3rd Gen', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 17. AÑOS/GENERACIONES: VENZA
-- ============================================================================

INSERT INTO catalog.vehicle_years (id, model_id, year_start, year_end, generation, is_active)
VALUES 
  ('00000001-0000-0000-0000-000000001501', '00000001-0000-0000-0000-000000000150', 2010, 2015, '1st Gen', TRUE),
  ('00000001-0000-0000-0000-000000001502', '00000001-0000-0000-0000-000000000150', 2020, 2023, '2nd Gen', TRUE),
  ('00000001-0000-0000-0000-000000001503', '00000001-0000-0000-0000-000000000150', 2024, NULL, '2nd Gen (Facelift)', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 18. AÑOS/GENERACIONES: AVALON
-- ============================================================================

INSERT INTO catalog.vehicle_years (id, model_id, year_start, year_end, generation, is_active)
VALUES 
  ('00000001-0000-0000-0000-000000001601', '00000001-0000-0000-0000-000000000160', 2010, 2012, '4th Gen', TRUE),
  ('00000001-0000-0000-0000-000000001602', '00000001-0000-0000-0000-000000000160', 2013, 2018, '5th Gen', TRUE),
  ('00000001-0000-0000-0000-000000001603', '00000001-0000-0000-0000-000000000160', 2019, 2022, '5th Gen (Facelift)', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 19. AÑOS/GENERACIONES: SUPRA
-- ============================================================================

INSERT INTO catalog.vehicle_years (id, model_id, year_start, year_end, generation, is_active)
VALUES 
  ('00000001-0000-0000-0000-000000001701', '00000001-0000-0000-0000-000000000170', 2019, 2023, '5th Gen', TRUE),
  ('00000001-0000-0000-0000-000000001702', '00000001-0000-0000-0000-000000000170', 2024, NULL, '5th Gen (Facelift)', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 20. AÑOS/GENERACIONES: FJ CRUISER
-- ============================================================================

INSERT INTO catalog.vehicle_years (id, model_id, year_start, year_end, generation, is_active)
VALUES 
  ('00000001-0000-0000-0000-000000001801', '00000001-0000-0000-0000-000000000180', 2010, 2014, '1st Gen', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 21. ESPECIFICACIONES TÉCNICAS: COROLLA
-- ============================================================================

-- Corolla 10th Gen (2010-2013)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000001101', '00000001-0000-0000-0000-000000000100', '2ZR-FE', '1.8L', 4, 'Manual', 5, 'FWD', 'Sedán', TRUE),
  ('00000001-0000-0000-0000-000000001102', '00000001-0000-0000-0000-000000000100', '2ZR-FE', '1.8L', 4, 'Automática', 4, 'FWD', 'Sedán', TRUE),
  ('00000001-0000-0000-0000-000000001103', '00000001-0000-0000-0000-000000000100', '2ZR-FE', '1.8L', 4, 'CVT', NULL, 'FWD', 'Sedán', TRUE)
ON CONFLICT DO NOTHING;

-- Corolla 11th Gen (2014-2018)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000001201', '00000001-0000-0000-0000-000000000110', '2ZR-FE', '1.8L', 4, 'Manual', 6, 'FWD', 'Sedán', TRUE),
  ('00000001-0000-0000-0000-000000001202', '00000001-0000-0000-0000-000000000110', '2ZR-FE', '1.8L', 4, 'CVT', NULL, 'FWD', 'Sedán', TRUE)
ON CONFLICT DO NOTHING;

-- Corolla 12th Gen (2019-2022)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000001301', '00000001-0000-0000-0000-000000000120', 'M20A-FKS', '2.0L', 4, 'Manual', 6, 'FWD', 'Sedán', TRUE),
  ('00000001-0000-0000-0000-000000001302', '00000001-0000-0000-0000-000000000120', 'M20A-FKS', '2.0L', 4, 'CVT', NULL, 'FWD', 'Sedán', TRUE),
  ('00000001-0000-0000-0000-000000001303', '00000001-0000-0000-0000-000000000120', 'M20A-FXS', '2.0L', 4, 'CVT', NULL, 'FWD', 'Sedán', TRUE) -- Híbrido
ON CONFLICT DO NOTHING;

-- Corolla 13th Gen (2023+)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000001401', '00000001-0000-0000-0000-000000000130', 'M20A-FKS', '2.0L', 4, 'Manual', 6, 'FWD', 'Sedán', TRUE),
  ('00000001-0000-0000-0000-000000001402', '00000001-0000-0000-0000-000000000130', 'M20A-FKS', '2.0L', 4, 'CVT', NULL, 'FWD', 'Sedán', TRUE),
  ('00000001-0000-0000-0000-000000001403', '00000001-0000-0000-0000-000000000130', 'M20A-FXS', '2.0L', 4, 'CVT', NULL, 'FWD', 'Sedán', TRUE) -- Híbrido
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 22. ESPECIFICACIONES TÉCNICAS: CAMRY
-- ============================================================================

-- Camry 7th Gen (2010-2017)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000002101', '00000001-0000-0000-0000-000000000201', '2AR-FE', '2.5L', 4, 'Automática', 6, 'FWD', 'Sedán', TRUE),
  ('00000001-0000-0000-0000-000000002102', '00000001-0000-0000-0000-000000000201', '1AR-FE', '2.7L', 4, 'Automática', 6, 'FWD', 'Sedán', TRUE),
  ('00000001-0000-0000-0000-000000002103', '00000001-0000-0000-0000-000000000201', '2GR-FE', '3.5L', 6, 'Automática', 6, 'FWD', 'Sedán', TRUE)
ON CONFLICT DO NOTHING;

-- Camry 8th Gen (2018-2023)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000002201', '00000001-0000-0000-0000-000000000203', 'A25A-FKS', '2.5L', 4, 'Automática', 8, 'FWD', 'Sedán', TRUE),
  ('00000001-0000-0000-0000-000000002202', '00000001-0000-0000-0000-000000000203', 'A25A-FKS', '2.5L', 4, 'CVT', NULL, 'FWD', 'Sedán', TRUE),
  ('00000001-0000-0000-0000-000000002203', '00000001-0000-0000-0000-000000000203', 'V35A-FTS', '3.5L', 6, 'Automática', 8, 'FWD', 'Sedán', TRUE),
  ('00000001-0000-0000-0000-000000002204', '00000001-0000-0000-0000-000000000203', 'A25A-FXS', '2.5L', 4, 'CVT', NULL, 'FWD', 'Sedán', TRUE) -- Híbrido
ON CONFLICT DO NOTHING;

-- Camry 9th Gen (2024+)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000002301', '00000001-0000-0000-0000-000000000204', 'A25A-FKS', '2.5L', 4, 'Automática', 8, 'FWD', 'Sedán', TRUE),
  ('00000001-0000-0000-0000-000000002302', '00000001-0000-0000-0000-000000000204', 'A25A-FXS', '2.5L', 4, 'CVT', NULL, 'FWD', 'Sedán', TRUE) -- Híbrido
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 23. ESPECIFICACIONES TÉCNICAS: RAV4
-- ============================================================================

-- RAV4 3rd Gen (2010-2012)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000003101', '00000001-0000-0000-0000-000000000301', '2AR-FE', '2.5L', 4, 'Automática', 4, 'FWD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000003102', '00000001-0000-0000-0000-000000000301', '2AR-FE', '2.5L', 4, 'Automática', 4, 'AWD', 'SUV', TRUE)
ON CONFLICT DO NOTHING;

-- RAV4 4th Gen (2013-2018)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000003201', '00000001-0000-0000-0000-000000000302', '2AR-FE', '2.5L', 4, 'Automática', 6, 'FWD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000003202', '00000001-0000-0000-0000-000000000302', '2AR-FE', '2.5L', 4, 'Automática', 6, 'AWD', 'SUV', TRUE)
ON CONFLICT DO NOTHING;

-- RAV4 5th Gen (2019-2023)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000003301', '00000001-0000-0000-0000-000000000303', 'A25A-FKS', '2.5L', 4, 'Automática', 8, 'FWD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000003302', '00000001-0000-0000-0000-000000000303', 'A25A-FKS', '2.5L', 4, 'Automática', 8, 'AWD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000003303', '00000001-0000-0000-0000-000000000303', 'A25A-FXS', '2.5L', 4, 'CVT', NULL, 'AWD', 'SUV', TRUE) -- Híbrido
ON CONFLICT DO NOTHING;

-- RAV4 5th Gen Facelift (2024+)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000003401', '00000001-0000-0000-0000-000000000304', 'A25A-FKS', '2.5L', 4, 'Automática', 8, 'FWD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000003402', '00000001-0000-0000-0000-000000000304', 'A25A-FKS', '2.5L', 4, 'Automática', 8, 'AWD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000003403', '00000001-0000-0000-0000-000000000304', 'A25A-FXS', '2.5L', 4, 'CVT', NULL, 'AWD', 'SUV', TRUE) -- Híbrido
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 24. ESPECIFICACIONES TÉCNICAS: HILUX
-- ============================================================================

-- Hilux 7th Gen (2010-2015)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000004101', '00000001-0000-0000-0000-000000000401', '2TR-FE', '2.7L', 4, 'Manual', 5, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000004102', '00000001-0000-0000-0000-000000000401', '2TR-FE', '2.7L', 4, 'Automática', 4, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000004103', '00000001-0000-0000-0000-000000000401', '1GR-FE', '4.0L', 6, 'Manual', 6, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000004104', '00000001-0000-0000-0000-000000000401', '1GR-FE', '4.0L', 6, 'Automática', 5, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000004105', '00000001-0000-0000-0000-000000000401', '1GR-FE', '4.0L', 6, 'Manual', 6, '4WD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000004106', '00000001-0000-0000-0000-000000000401', '1GR-FE', '4.0L', 6, 'Automática', 5, '4WD', 'Pickup', TRUE)
ON CONFLICT DO NOTHING;

-- Hilux 8th Gen (2016-2023)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000004201', '00000001-0000-0000-0000-000000000402', '2GD-FTV', '2.4L', 4, 'Manual', 6, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000004202', '00000001-0000-0000-0000-000000000402', '2GD-FTV', '2.4L', 4, 'Automática', 6, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000004203', '00000001-0000-0000-0000-000000000402', '2GD-FTV', '2.4L', 4, 'Manual', 6, '4WD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000004204', '00000001-0000-0000-0000-000000000402', '2GD-FTV', '2.4L', 4, 'Automática', 6, '4WD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000004205', '00000001-0000-0000-0000-000000000402', '1GD-FTV', '2.8L', 4, 'Manual', 6, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000004206', '00000001-0000-0000-0000-000000000402', '1GD-FTV', '2.8L', 4, 'Automática', 6, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000004207', '00000001-0000-0000-0000-000000000402', '1GD-FTV', '2.8L', 4, 'Manual', 6, '4WD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000004208', '00000001-0000-0000-0000-000000000402', '1GD-FTV', '2.8L', 4, 'Automática', 6, '4WD', 'Pickup', TRUE)
ON CONFLICT DO NOTHING;

-- Hilux 8th Gen Facelift (2024+)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000004301', '00000001-0000-0000-0000-000000000403', '2GD-FTV', '2.4L', 4, 'Manual', 6, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000004302', '00000001-0000-0000-0000-000000000403', '2GD-FTV', '2.4L', 4, 'Automática', 6, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000004303', '00000001-0000-0000-0000-000000000403', '1GD-FTV', '2.8L', 4, 'Automática', 6, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000004304', '00000001-0000-0000-0000-000000000403', '1GD-FTV', '2.8L', 4, 'Automática', 6, '4WD', 'Pickup', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 25. ESPECIFICACIONES TÉCNICAS: YARIS
-- ============================================================================

-- Yaris 2nd Gen (2010-2013)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000005101', '00000001-0000-0000-0000-000000000501', '1NZ-FE', '1.5L', 4, 'Manual', 5, 'FWD', 'Hatchback', TRUE),
  ('00000001-0000-0000-0000-000000005102', '00000001-0000-0000-0000-000000000501', '1NZ-FE', '1.5L', 4, 'Automática', 4, 'FWD', 'Hatchback', TRUE)
ON CONFLICT DO NOTHING;

-- Yaris 3rd Gen (2014-2019)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000005201', '00000001-0000-0000-0000-000000000502', '2NZ-FE', '1.5L', 4, 'Manual', 5, 'FWD', 'Hatchback', TRUE),
  ('00000001-0000-0000-0000-000000005202', '00000001-0000-0000-0000-000000000502', '2NZ-FE', '1.5L', 4, 'Automática', 4, 'FWD', 'Hatchback', TRUE)
ON CONFLICT DO NOTHING;

-- Yaris 4th Gen (2020-2023)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000005301', '00000001-0000-0000-0000-000000000503', 'M15A-FKS', '1.5L', 3, 'Manual', 6, 'FWD', 'Hatchback', TRUE),
  ('00000001-0000-0000-0000-000000005302', '00000001-0000-0000-0000-000000000503', 'M15A-FKS', '1.5L', 3, 'CVT', NULL, 'FWD', 'Hatchback', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 26. ESPECIFICACIONES TÉCNICAS: PRIUS
-- ============================================================================

-- Prius 3rd Gen (2010-2015)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000006101', '00000001-0000-0000-0000-000000000601', '2ZR-FXE', '1.8L', 4, 'CVT', NULL, 'FWD', 'Hatchback', TRUE) -- Híbrido
ON CONFLICT DO NOTHING;

-- Prius 4th Gen (2016-2022)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000006201', '00000001-0000-0000-0000-000000000602', '2ZR-FXE', '1.8L', 4, 'CVT', NULL, 'FWD', 'Hatchback', TRUE) -- Híbrido
ON CONFLICT DO NOTHING;

-- Prius 5th Gen (2023+)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000006301', '00000001-0000-0000-0000-000000000603', 'M20A-FXS', '2.0L', 4, 'CVT', NULL, 'FWD', 'Hatchback', TRUE) -- Híbrido
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 27. ESPECIFICACIONES TÉCNICAS: TACOMA
-- ============================================================================

-- Tacoma 2nd Gen (2010-2015)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000007101', '00000001-0000-0000-0000-000000000701', '2TR-FE', '2.7L', 4, 'Manual', 5, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000007102', '00000001-0000-0000-0000-000000000701', '2TR-FE', '2.7L', 4, 'Automática', 4, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000007103', '00000001-0000-0000-0000-000000000701', '1GR-FE', '4.0L', 6, 'Manual', 6, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000007104', '00000001-0000-0000-0000-000000000701', '1GR-FE', '4.0L', 6, 'Automática', 5, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000007105', '00000001-0000-0000-0000-000000000701', '1GR-FE', '4.0L', 6, 'Manual', 6, '4WD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000007106', '00000001-0000-0000-0000-000000000701', '1GR-FE', '4.0L', 6, 'Automática', 5, '4WD', 'Pickup', TRUE)
ON CONFLICT DO NOTHING;

-- Tacoma 3rd Gen (2016-2023)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000007201', '00000001-0000-0000-0000-000000000702', '2TR-FE', '2.7L', 4, 'Manual', 5, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000007202', '00000001-0000-0000-0000-000000000702', '2TR-FE', '2.7L', 4, 'Automática', 6, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000007203', '00000001-0000-0000-0000-000000000702', '2TR-FE', '2.7L', 4, 'Manual', 5, '4WD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000007204', '00000001-0000-0000-0000-000000000702', '2TR-FE', '2.7L', 4, 'Automática', 6, '4WD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000007205', '00000001-0000-0000-0000-000000000702', '2GR-FKS', '3.5L', 6, 'Manual', 6, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000007206', '00000001-0000-0000-0000-000000000702', '2GR-FKS', '3.5L', 6, 'Automática', 6, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000007207', '00000001-0000-0000-0000-000000000702', '2GR-FKS', '3.5L', 6, 'Manual', 6, '4WD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000007208', '00000001-0000-0000-0000-000000000702', '2GR-FKS', '3.5L', 6, 'Automática', 6, '4WD', 'Pickup', TRUE)
ON CONFLICT DO NOTHING;

-- Tacoma 4th Gen (2024+)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000007301', '00000001-0000-0000-0000-000000000703', 'T24A-FTS', '2.4L', 4, 'Automática', 8, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000007302', '00000001-0000-0000-0000-000000000703', 'T24A-FTS', '2.4L', 4, 'Automática', 8, '4WD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000007303', '00000001-0000-0000-0000-000000000703', 'T24A-FTS', '2.4L', 4, 'Manual', 6, '4WD', 'Pickup', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 28. ESPECIFICACIONES TÉCNICAS: HIGHLANDER
-- ============================================================================

-- Highlander 3rd Gen (2010-2013)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000008101', '00000001-0000-0000-0000-000000000801', '2GR-FE', '3.5L', 6, 'Automática', 5, 'FWD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000008102', '00000001-0000-0000-0000-000000000801', '2GR-FE', '3.5L', 6, 'Automática', 5, 'AWD', 'SUV', TRUE)
ON CONFLICT DO NOTHING;

-- Highlander 4th Gen (2014-2019)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000008201', '00000001-0000-0000-0000-000000000802', '2GR-FE', '3.5L', 6, 'Automática', 6, 'FWD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000008202', '00000001-0000-0000-0000-000000000802', '2GR-FE', '3.5L', 6, 'Automática', 6, 'AWD', 'SUV', TRUE)
ON CONFLICT DO NOTHING;

-- Highlander 5th Gen (2020-2023)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000008301', '00000001-0000-0000-0000-000000000803', 'V35A-FTS', '3.5L', 6, 'Automática', 8, 'FWD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000008302', '00000001-0000-0000-0000-000000000803', 'V35A-FTS', '3.5L', 6, 'Automática', 8, 'AWD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000008303', '00000001-0000-0000-0000-000000000803', 'A25A-FXS', '2.5L', 4, 'CVT', NULL, 'AWD', 'SUV', TRUE) -- Híbrido
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 29. ESPECIFICACIONES TÉCNICAS: 4RUNNER
-- ============================================================================

-- 4Runner 4th Gen (2010-2013)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000009101', '00000001-0000-0000-0000-000000000901', '1GR-FE', '4.0L', 6, 'Automática', 5, 'RWD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000009102', '00000001-0000-0000-0000-000000000901', '1GR-FE', '4.0L', 6, 'Automática', 5, '4WD', 'SUV', TRUE)
ON CONFLICT DO NOTHING;

-- 4Runner 5th Gen (2014+)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000009201', '00000001-0000-0000-0000-000000000902', '1GR-FE', '4.0L', 6, 'Automática', 5, 'RWD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000009202', '00000001-0000-0000-0000-000000000902', '1GR-FE', '4.0L', 6, 'Automática', 5, '4WD', 'SUV', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 30. ESPECIFICACIONES TÉCNICAS: SIENNA
-- ============================================================================

-- Sienna 3rd Gen (2011-2017)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000010201', '00000001-0000-0000-0000-000000001001', '2GR-FE', '3.5L', 6, 'Automática', 6, 'FWD', 'Van', TRUE),
  ('00000001-0000-0000-0000-000000010202', '00000001-0000-0000-0000-000000001001', '2GR-FE', '3.5L', 6, 'Automática', 6, 'AWD', 'Van', TRUE)
ON CONFLICT DO NOTHING;

-- Sienna 4th Gen (2021-2023)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000010301', '00000001-0000-0000-0000-000000001003', 'A25A-FXS', '2.5L', 4, 'CVT', NULL, 'FWD', 'Van', TRUE), -- Híbrido
  ('00000001-0000-0000-0000-000000010302', '00000001-0000-0000-0000-000000001003', 'A25A-FXS', '2.5L', 4, 'CVT', NULL, 'AWD', 'Van', TRUE) -- Híbrido
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 31. ESPECIFICACIONES TÉCNICAS: TUNDRA
-- ============================================================================

-- Tundra 2nd Gen (2010-2021)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000011101', '00000001-0000-0000-0000-000000001101', '1GR-FE', '4.0L', 6, 'Automática', 5, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000011102', '00000001-0000-0000-0000-000000001101', '1GR-FE', '4.0L', 6, 'Automática', 5, '4WD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000011103', '00000001-0000-0000-0000-000000001101', '3UR-FE', '5.7L', 8, 'Automática', 6, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000011104', '00000001-0000-0000-0000-000000001101', '3UR-FE', '5.7L', 8, 'Automática', 6, '4WD', 'Pickup', TRUE)
ON CONFLICT DO NOTHING;

-- Tundra 3rd Gen (2022+)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000011201', '00000001-0000-0000-0000-000000001103', 'V35A-FTS', '3.5L', 6, 'Automática', 10, 'RWD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000011202', '00000001-0000-0000-0000-000000001103', 'V35A-FTS', '3.5L', 6, 'Automática', 10, '4WD', 'Pickup', TRUE),
  ('00000001-0000-0000-0000-000000011203', '00000001-0000-0000-0000-000000001103', 'V35A-FTS', '3.5L', 6, 'Automática', 10, '4WD', 'Pickup', TRUE) -- Turbo
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 32. ESPECIFICACIONES TÉCNICAS: LAND CRUISER
-- ============================================================================

-- Land Cruiser 200 Series (2010-2021)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000012101', '00000001-0000-0000-0000-000000001201', '3UR-FE', '5.7L', 8, 'Automática', 6, '4WD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000012102', '00000001-0000-0000-0000-000000001202', '3UR-FE', '5.7L', 8, 'Automática', 8, '4WD', 'SUV', TRUE)
ON CONFLICT DO NOTHING;

-- Land Cruiser 300 Series (2022+)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000012201', '00000001-0000-0000-0000-000000001203', 'V35A-FTS', '3.5L', 6, 'Automática', 10, '4WD', 'SUV', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 33. ESPECIFICACIONES TÉCNICAS: C-HR
-- ============================================================================

-- C-HR 1st Gen (2017+)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000013101', '00000001-0000-0000-0000-000000001301', 'M20A-FKS', '2.0L', 4, 'CVT', NULL, 'FWD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000013102', '00000001-0000-0000-0000-000000001301', 'M20A-FXS', '2.0L', 4, 'CVT', NULL, 'FWD', 'SUV', TRUE) -- Híbrido
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 34. ESPECIFICACIONES TÉCNICAS: SEQUOIA
-- ============================================================================

-- Sequoia 2nd Gen (2010-2022)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000014101', '00000001-0000-0000-0000-000000001401', '3UR-FE', '5.7L', 8, 'Automática', 6, 'RWD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000014102', '00000001-0000-0000-0000-000000001401', '3UR-FE', '5.7L', 8, 'Automática', 6, '4WD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000014103', '00000001-0000-0000-0000-000000001402', '3UR-FE', '5.7L', 8, 'Automática', 6, 'RWD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000014104', '00000001-0000-0000-0000-000000001402', '3UR-FE', '5.7L', 8, 'Automática', 6, '4WD', 'SUV', TRUE)
ON CONFLICT DO NOTHING;

-- Sequoia 3rd Gen (2023+)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000014201', '00000001-0000-0000-0000-000000001403', 'V35A-FTS', '3.5L', 6, 'Automática', 10, 'RWD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000014202', '00000001-0000-0000-0000-000000001403', 'V35A-FTS', '3.5L', 6, 'Automática', 10, '4WD', 'SUV', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 35. ESPECIFICACIONES TÉCNICAS: VENZA
-- ============================================================================

-- Venza 1st Gen (2010-2015)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000015101', '00000001-0000-0000-0000-000000001501', '2AR-FE', '2.7L', 4, 'Automática', 6, 'FWD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000015102', '00000001-0000-0000-0000-000000001501', '2GR-FE', '3.5L', 6, 'Automática', 6, 'FWD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000015103', '00000001-0000-0000-0000-000000001501', '2GR-FE', '3.5L', 6, 'Automática', 6, 'AWD', 'SUV', TRUE)
ON CONFLICT DO NOTHING;

-- Venza 2nd Gen (2020+)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000015201', '00000001-0000-0000-0000-000000001502', 'A25A-FXS', '2.5L', 4, 'CVT', NULL, 'FWD', 'SUV', TRUE), -- Híbrido
  ('00000001-0000-0000-0000-000000015202', '00000001-0000-0000-0000-000000001502', 'A25A-FXS', '2.5L', 4, 'CVT', NULL, 'AWD', 'SUV', TRUE) -- Híbrido
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 36. ESPECIFICACIONES TÉCNICAS: AVALON
-- ============================================================================

-- Avalon 4th Gen (2010-2012)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000016101', '00000001-0000-0000-0000-000000001601', '2GR-FE', '3.5L', 6, 'Automática', 6, 'FWD', 'Sedán', TRUE)
ON CONFLICT DO NOTHING;

-- Avalon 5th Gen (2013-2022)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000016201', '00000001-0000-0000-0000-000000001602', '2GR-FE', '3.5L', 6, 'Automática', 6, 'FWD', 'Sedán', TRUE),
  ('00000001-0000-0000-0000-000000016202', '00000001-0000-0000-0000-000000001602', 'A25A-FXS', '2.5L', 4, 'CVT', NULL, 'FWD', 'Sedán', TRUE) -- Híbrido
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 37. ESPECIFICACIONES TÉCNICAS: SUPRA
-- ============================================================================

-- Supra 5th Gen (2019+)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000017101', '00000001-0000-0000-0000-000000001701', 'B58B30', '3.0L', 6, 'Manual', 6, 'RWD', 'Coupé', TRUE),
  ('00000001-0000-0000-0000-000000017102', '00000001-0000-0000-0000-000000001701', 'B58B30', '3.0L', 6, 'Automática', 8, 'RWD', 'Coupé', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 38. ESPECIFICACIONES TÉCNICAS: FJ CRUISER
-- ============================================================================

-- FJ Cruiser 1st Gen (2010-2014)
INSERT INTO catalog.vehicle_specs (
  id, year_id, engine_code, engine_displacement, engine_cylinders,
  transmission_type, transmission_speeds, drivetrain, body_type, is_active
)
VALUES 
  ('00000001-0000-0000-0000-000000018101', '00000001-0000-0000-0000-000000001801', '1GR-FE', '4.0L', 6, 'Manual', 6, 'RWD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000018102', '00000001-0000-0000-0000-000000001801', '1GR-FE', '4.0L', 6, 'Automática', 5, 'RWD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000018103', '00000001-0000-0000-0000-000000001801', '1GR-FE', '4.0L', 6, 'Manual', 6, '4WD', 'SUV', TRUE),
  ('00000001-0000-0000-0000-000000018104', '00000001-0000-0000-0000-000000001801', '1GR-FE', '4.0L', 6, 'Automática', 5, '4WD', 'SUV', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Verificar datos insertados
SELECT 
  'Marcas' as tipo,
  COUNT(*) as total
FROM catalog.vehicle_brands
WHERE code = 'TOYOTA' AND is_active = TRUE
UNION ALL
SELECT 
  'Modelos Toyota',
  COUNT(*)
FROM catalog.vehicle_models
WHERE brand_id = '00000001-0000-0000-0000-000000000001' AND is_active = TRUE
UNION ALL
SELECT 
  'Años/Generaciones',
  COUNT(*)
FROM catalog.vehicle_years
WHERE model_id IN (
  SELECT id FROM catalog.vehicle_models 
  WHERE brand_id = '00000001-0000-0000-0000-000000000001'
)
UNION ALL
SELECT 
  'Especificaciones',
  COUNT(*)
FROM catalog.vehicle_specs
WHERE year_id IN (
  SELECT id FROM catalog.vehicle_years
  WHERE model_id IN (
    SELECT id FROM catalog.vehicle_models 
    WHERE brand_id = '00000001-0000-0000-0000-000000000001'
  )
);

-- Mostrar resumen por modelo
SELECT 
  vm.name as modelo,
  COUNT(DISTINCT vy.id) as años,
  COUNT(DISTINCT vs.id) as especificaciones
FROM catalog.vehicle_models vm
LEFT JOIN catalog.vehicle_years vy ON vy.model_id = vm.id
LEFT JOIN catalog.vehicle_specs vs ON vs.year_id = vy.id
WHERE vm.brand_id = '00000001-0000-0000-0000-000000000001'
GROUP BY vm.id, vm.name, vm.display_order
ORDER BY vm.display_order;
