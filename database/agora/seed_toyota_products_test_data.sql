-- ============================================================================
-- AGORA ECOSYSTEM - Seed Data: Productos de Prueba para Toyota
-- ============================================================================
-- Descripción: Crea un conjunto completo de productos de refacciones y accesorios
--              para Toyota (90%) y otras marcas (10%) con stock y precios por sucursal
--              y compatibilidad con vehículos.
-- 
-- Uso: Ejecutar después de:
--      - schema.sql
--      - migration_product_branch_availability.sql
--      - migration_vehicle_compatibility.sql
--      - seed_refacciones_catalog.sql
--      - seed_toyota_vehicles.sql
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-12-04
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- VARIABLES: IDs de Sucursales Activas
-- ============================================================================
-- Toyota Satelite: 054471c5-0ff3-4adb-8c52-24a24ef25367
-- Toyota Universidad: 688e8c01-2a77-4fbe-a55e-ed12a93af55e
-- Toyota Coyoacan: ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f

-- ============================================================================
-- PRODUCTOS TOYOTA (90% - 45 productos)
-- ============================================================================

-- Usaremos Toyota Satelite como business_id principal para los productos
-- Los productos son globales pero se asignan a una sucursal base

INSERT INTO catalog.products (
    id,
    business_id,
    name,
    description,
    sku,
    price,
    category_id,
    is_available,
    is_featured,
    display_order,
    created_at,
    updated_at
) VALUES
    -- ========================================================================
    -- MOTOR - Filtros (6 productos)
    -- ========================================================================
    ('00000001-0000-0000-0000-000000000001', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Filtro de Aceite Toyota Original 90915-YZZF1', 
     'Filtro de aceite original Toyota para motores 1.8L y 2.0L. Compatible con Corolla, Camry, RAV4. Filtración superior y protección del motor.',
     '90915-YZZF1', 285.00, '00000001-0000-0000-0000-000000000011', TRUE, TRUE, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000002', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Filtro de Aire Toyota Original 17801-0V010', 
     'Filtro de aire original Toyota de alta eficiencia. Compatible con Corolla, Yaris, Prius. Mejora el rendimiento del motor.',
     '17801-0V010', 450.00, '00000001-0000-0000-0000-000000000011', TRUE, TRUE, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000003', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Filtro de Combustible Toyota 23300-0V010', 
     'Filtro de combustible original Toyota. Protege el sistema de inyección y garantiza un flujo limpio de combustible.',
     '23300-0V010', 680.00, '00000001-0000-0000-0000-000000000051', TRUE, FALSE, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000004', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Filtro de Aire de Habitáculo Toyota 87139-0V010', 
     'Filtro de aire acondicionado original Toyota. Mejora la calidad del aire interior y protege el sistema de climatización.',
     '87139-0V010', 520.00, '00000001-0000-0000-0000-000000000011', TRUE, FALSE, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000005', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Filtro de Aceite Toyota 90915-YZZJ2', 
     'Filtro de aceite Toyota para motores V6 y V8. Compatible con Highlander, 4Runner, Tundra, Sequoia.',
     '90915-YZZJ2', 320.00, '00000001-0000-0000-0000-000000000011', TRUE, FALSE, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000006', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Filtro de Aire Toyota 17801-0V020', 
     'Filtro de aire de alto flujo Toyota. Compatible con RAV4, Highlander, 4Runner. Mayor capacidad de filtrado.',
     '17801-0V020', 480.00, '00000001-0000-0000-0000-000000000011', TRUE, FALSE, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- ========================================================================
    -- MOTOR - Bujías (4 productos)
    -- ========================================================================
    ('00000001-0000-0000-0000-000000000007', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Bujía Iridium Toyota 90919-01153', 
     'Bujía de iridio original Toyota. Mayor durabilidad y mejor rendimiento. Compatible con Corolla, Camry, RAV4.',
     '90919-01153', 185.00, '00000001-0000-0000-0000-000000000012', TRUE, TRUE, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000008', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Bujía Iridium Toyota 90919-01176', 
     'Bujía de iridio Toyota para motores híbridos. Compatible con Prius, Camry Hybrid, RAV4 Hybrid.',
     '90919-01176', 195.00, '00000001-0000-0000-0000-000000000012', TRUE, FALSE, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000009', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Bujía Platino Toyota 90919-01154', 
     'Bujía de platino Toyota. Excelente rendimiento y durabilidad. Compatible con Yaris, Corolla, Camry.',
     '90919-01154', 165.00, '00000001-0000-0000-0000-000000000012', TRUE, FALSE, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000010', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Cable de Bujía Toyota 90919-02126', 
     'Cable de bujía original Toyota. Alta calidad y resistencia. Compatible con múltiples modelos.',
     '90919-02126', 450.00, '00000001-0000-0000-0000-000000000012', TRUE, FALSE, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- ========================================================================
    -- MOTOR - Aceites (3 productos)
    -- ========================================================================
    ('00000001-0000-0000-0000-000000000011', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Aceite Motor Toyota 0W-20 4 Litros', 
     'Aceite de motor sintético Toyota 0W-20. Recomendado para la mayoría de modelos Toyota modernos. 4 litros.',
     'TOY-0W20-4L', 680.00, '00000001-0000-0000-0000-000000000017', TRUE, TRUE, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000012', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Aceite Motor Toyota 5W-30 4 Litros', 
     'Aceite de motor sintético Toyota 5W-30. Ideal para climas cálidos y vehículos con mayor kilometraje. 4 litros.',
     'TOY-5W30-4L', 650.00, '00000001-0000-0000-0000-000000000017', TRUE, FALSE, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000013', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Aceite Motor Toyota 0W-20 1 Litro', 
     'Aceite de motor sintético Toyota 0W-20. Envase de 1 litro para relleno.',
     'TOY-0W20-1L', 185.00, '00000001-0000-0000-0000-000000000017', TRUE, FALSE, 13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- ========================================================================
    -- FRENOS - Pastillas (4 productos)
    -- ========================================================================
    ('00000001-0000-0000-0000-000000000014', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Pastillas de Freno Delanteras Toyota 04465-0V010', 
     'Pastillas de freno delanteras originales Toyota. Compatible con Corolla, Camry, RAV4. Alta durabilidad y rendimiento.',
     '04465-0V010', 1250.00, '00000001-0000-0000-0000-000000000021', TRUE, TRUE, 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000015', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Pastillas de Freno Traseras Toyota 04466-0V010', 
     'Pastillas de freno traseras originales Toyota. Compatible con Corolla, Camry, RAV4.',
     '04466-0V010', 980.00, '00000001-0000-0000-0000-000000000021', TRUE, FALSE, 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000016', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Pastillas de Freno Delanteras Toyota 04465-0V020', 
     'Pastillas de freno delanteras Toyota para SUV y Pickups. Compatible con Highlander, 4Runner, Tundra.',
     '04465-0V020', 1450.00, '00000001-0000-0000-0000-000000000021', TRUE, FALSE, 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000017', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Pastillas de Freno Traseras Toyota 04466-0V020', 
     'Pastillas de freno traseras Toyota para SUV y Pickups. Compatible con Highlander, 4Runner, Tundra.',
     '04466-0V020', 1120.00, '00000001-0000-0000-0000-000000000021', TRUE, FALSE, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- ========================================================================
    -- FRENOS - Discos (3 productos)
    -- ========================================================================
    ('00000001-0000-0000-0000-000000000018', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Disco de Freno Delantero Toyota 43512-0V010', 
     'Disco de freno delantero original Toyota. Compatible con Corolla, Camry, RAV4. Ventilado para mejor disipación de calor.',
     '43512-0V010', 1850.00, '00000001-0000-0000-0000-000000000022', TRUE, TRUE, 18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000019', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Disco de Freno Trasero Toyota 42431-0V010', 
     'Disco de freno trasero original Toyota. Compatible con Corolla, Camry, RAV4.',
     '42431-0V010', 1650.00, '00000001-0000-0000-0000-000000000022', TRUE, FALSE, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000020', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Disco de Freno Delantero Toyota 43512-0V020', 
     'Disco de freno delantero Toyota para SUV. Compatible con Highlander, 4Runner. Mayor diámetro y grosor.',
     '43512-0V020', 2150.00, '00000001-0000-0000-0000-000000000022', TRUE, FALSE, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- ========================================================================
    -- FRENOS - Líquido (2 productos)
    -- ========================================================================
    ('00000001-0000-0000-0000-000000000021', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Líquido de Frenos Toyota DOT 3 500ml', 
     'Líquido de frenos original Toyota DOT 3. 500ml. Compatible con todos los modelos Toyota.',
     'TOY-DOT3-500', 280.00, '00000001-0000-0000-0000-000000000024', TRUE, FALSE, 21, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000022', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Líquido de Frenos Toyota DOT 4 1 Litro', 
     'Líquido de frenos original Toyota DOT 4. 1 litro. Mayor punto de ebullición para mejor rendimiento.',
     'TOY-DOT4-1L', 450.00, '00000001-0000-0000-0000-000000000024', TRUE, FALSE, 22, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- ========================================================================
    -- SUSPENSIÓN - Amortiguadores (4 productos)
    -- ========================================================================
    ('00000001-0000-0000-0000-000000000023', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Amortiguador Delantero Toyota 48510-0V010', 
     'Amortiguador delantero original Toyota. Compatible con Corolla, Camry. Confort y durabilidad garantizados.',
     '48510-0V010', 2850.00, '00000001-0000-0000-0000-000000000031', TRUE, TRUE, 23, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000024', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Amortiguador Trasero Toyota 48530-0V010', 
     'Amortiguador trasero original Toyota. Compatible con Corolla, Camry.',
     '48530-0V010', 2450.00, '00000001-0000-0000-0000-000000000031', TRUE, FALSE, 24, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000025', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Amortiguador Delantero Toyota 48510-0V020', 
     'Amortiguador delantero Toyota para SUV. Compatible con RAV4, Highlander, 4Runner.',
     '48510-0V020', 3250.00, '00000001-0000-0000-0000-000000000031', TRUE, FALSE, 25, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000026', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Amortiguador Trasero Toyota 48530-0V020', 
     'Amortiguador trasero Toyota para SUV. Compatible con RAV4, Highlander, 4Runner.',
     '48530-0V020', 2850.00, '00000001-0000-0000-0000-000000000031', TRUE, FALSE, 26, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- ========================================================================
    -- SUSPENSIÓN - Rótulas (3 productos)
    -- ========================================================================
    ('00000001-0000-0000-0000-000000000027', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Rótula Superior Toyota 43330-0V010', 
     'Rótula superior original Toyota. Compatible con Corolla, Camry, RAV4.',
     '43330-0V010', 850.00, '00000001-0000-0000-0000-000000000032', TRUE, FALSE, 27, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000028', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Rótula Inferior Toyota 43340-0V010', 
     'Rótula inferior original Toyota. Compatible con Corolla, Camry, RAV4.',
     '43340-0V010', 950.00, '00000001-0000-0000-0000-000000000032', TRUE, FALSE, 28, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000029', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Terminal de Dirección Toyota 45470-0V010', 
     'Terminal de dirección original Toyota. Compatible con múltiples modelos.',
     '45470-0V010', 680.00, '00000001-0000-0000-0000-000000000032', TRUE, FALSE, 29, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- ========================================================================
    -- ELÉCTRICO - Baterías (3 productos)
    -- ========================================================================
    ('00000001-0000-0000-0000-000000000030', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Batería Toyota 12V 50Ah', 
     'Batería original Toyota 12V 50Ah. Compatible con Corolla, Yaris, Prius. Alta capacidad y durabilidad.',
     'TOY-BAT-50AH', 2850.00, '00000001-0000-0000-0000-000000000041', TRUE, TRUE, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000031', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Batería Toyota 12V 70Ah', 
     'Batería original Toyota 12V 70Ah. Compatible con Camry, RAV4, Highlander. Mayor capacidad para vehículos más grandes.',
     'TOY-BAT-70AH', 3850.00, '00000001-0000-0000-0000-000000000041', TRUE, FALSE, 31, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000032', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Batería Toyota 12V 100Ah', 
     'Batería original Toyota 12V 100Ah. Compatible con Tundra, Sequoia, Land Cruiser. Máxima capacidad.',
     'TOY-BAT-100AH', 4850.00, '00000001-0000-0000-0000-000000000041', TRUE, FALSE, 32, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- ========================================================================
    -- ELÉCTRICO - Alternadores (2 productos)
    -- ========================================================================
    ('00000001-0000-0000-0000-000000000033', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Alternador Toyota 27060-0V010', 
     'Alternador original Toyota 90A. Compatible con Corolla, Camry, RAV4.',
     '27060-0V010', 4850.00, '00000001-0000-0000-0000-000000000042', TRUE, FALSE, 33, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000034', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Alternador Toyota 27060-0V020', 
     'Alternador original Toyota 130A. Compatible con Highlander, 4Runner, Tundra. Mayor capacidad.',
     '27060-0V020', 5850.00, '00000001-0000-0000-0000-000000000042', TRUE, FALSE, 34, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- ========================================================================
    -- ILUMINACIÓN - Faros (4 productos)
    -- ========================================================================
    ('00000001-0000-0000-0000-000000000035', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Faro Delantero Derecho Toyota 81150-0V010', 
     'Faro delantero derecho original Toyota con LED. Compatible con Corolla 2020-2024.',
     '81150-0V010', 12500.00, '00000001-0000-0000-0000-000000000100', TRUE, TRUE, 35, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000036', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Faro Delantero Izquierdo Toyota 81160-0V010', 
     'Faro delantero izquierdo original Toyota con LED. Compatible con Corolla 2020-2024.',
     '81160-0V010', 12500.00, '00000001-0000-0000-0000-000000000100', TRUE, FALSE, 36, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000037', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Calavera Trasera Derecha Toyota 81550-0V010', 
     'Calavera trasera derecha original Toyota LED. Compatible con Camry, RAV4.',
     '81550-0V010', 3850.00, '00000001-0000-0000-0000-000000000100', TRUE, FALSE, 37, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000038', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Calavera Trasera Izquierda Toyota 81560-0V010', 
     'Calavera trasera izquierda original Toyota LED. Compatible con Camry, RAV4.',
     '81560-0V010', 3850.00, '00000001-0000-0000-0000-000000000100', TRUE, FALSE, 38, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- ========================================================================
    -- ACCESORIOS - Audio (2 productos)
    -- ========================================================================
    ('00000001-0000-0000-0000-000000000039', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Sistema de Audio Toyota Premium', 
     'Sistema de audio premium Toyota con pantalla táctil 8 pulgadas, Apple CarPlay y Android Auto. Compatible con Corolla, Camry, RAV4.',
     'TOY-AUDIO-PREM', 12500.00, '00000002-0000-0000-0000-000000000010', TRUE, TRUE, 39, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000040', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Bocinas Traseras Toyota 6x9', 
     'Bocinas traseras Toyota 6x9 pulgadas. Sonido de alta calidad. Compatible con múltiples modelos.',
     'TOY-SPK-6X9', 1850.00, '00000002-0000-0000-0000-000000000010', TRUE, FALSE, 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- ========================================================================
    -- ACCESORIOS - Seguridad (2 productos)
    -- ========================================================================
    ('00000001-0000-0000-0000-000000000041', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Cámara de Reversa Toyota', 
     'Cámara de reversa original Toyota con pantalla. Compatible con Corolla, Camry, RAV4, Highlander.',
     'TOY-CAM-REV', 3850.00, '00000002-0000-0000-0000-000000000030', TRUE, FALSE, 41, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000042', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Sensores de Estacionamiento Toyota', 
     'Kit de sensores de estacionamiento delanteros y traseros Toyota. Compatible con múltiples modelos.',
     'TOY-PARK-SENS', 2850.00, '00000002-0000-0000-0000-000000000030', TRUE, FALSE, 42, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- ========================================================================
    -- ACCESORIOS - Estética (2 productos)
    -- ========================================================================
    ('00000001-0000-0000-0000-000000000043', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Defensas Laterales Toyota RAV4', 
     'Defensas laterales originales Toyota para RAV4. Protección y estilo. Compatible con RAV4 2019-2024.',
     'TOY-RAV4-SIDE', 4850.00, '00000002-0000-0000-0000-000000000040', TRUE, FALSE, 43, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    ('00000001-0000-0000-0000-000000000044', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Alfombras Premium Toyota', 
     'Set de alfombras premium Toyota para piso y maletero. Material de alta calidad. Compatible con Corolla, Camry, RAV4.',
     'TOY-MAT-PREM', 1850.00, '00000002-0000-0000-0000-000000000040', TRUE, FALSE, 44, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- ========================================================================
    -- MANTENIMIENTO - Radiador (1 producto)
    -- ========================================================================
    ('00000001-0000-0000-0000-000000000045', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Radiador Toyota 16400-0V010', 
     'Radiador original Toyota. Compatible con Corolla, Camry, RAV4. Alta eficiencia de enfriamiento.',
     '16400-0V010', 6850.00, '00000001-0000-0000-0000-000000000015', TRUE, FALSE, 45, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ============================================================================
-- PRODUCTOS OTRAS MARCAS (10% - 5 productos)
-- ============================================================================

INSERT INTO catalog.products (
    id,
    business_id,
    name,
    description,
    sku,
    price,
    category_id,
    is_available,
    is_featured,
    display_order,
    created_at,
    updated_at
) VALUES
    -- Honda
    ('00000002-0000-0000-0000-000000000001', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Filtro de Aceite Honda Original 15400-PLM-A01', 
     'Filtro de aceite original Honda. Compatible con Civic, Accord, CR-V.',
     '15400-PLM-A01', 295.00, '00000001-0000-0000-0000-000000000011', TRUE, FALSE, 46, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- Nissan
    ('00000002-0000-0000-0000-000000000002', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Pastillas de Freno Nissan 41060-1EA0A', 
     'Pastillas de freno delanteras originales Nissan. Compatible con Sentra, Altima, Versa.',
     '41060-1EA0A', 1180.00, '00000001-0000-0000-0000-000000000021', TRUE, FALSE, 47, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- Ford
    ('00000002-0000-0000-0000-000000000003', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Batería Ford 12V 65Ah', 
     'Batería original Ford 12V 65Ah. Compatible con Focus, Fiesta, Escape.',
     'FORD-BAT-65AH', 3250.00, '00000001-0000-0000-0000-000000000041', TRUE, FALSE, 48, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- Chevrolet
    ('00000002-0000-0000-0000-000000000004', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Amortiguador Delantero Chevrolet 84400123', 
     'Amortiguador delantero original Chevrolet. Compatible con Cruze, Malibu, Equinox.',
     '84400123', 2750.00, '00000001-0000-0000-0000-000000000031', TRUE, FALSE, 49, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- Volkswagen
    ('00000002-0000-0000-0000-000000000005', '054471c5-0ff3-4adb-8c52-24a24ef25367', 
     'Filtro de Aire Volkswagen 1K0129620E', 
     'Filtro de aire original Volkswagen. Compatible con Jetta, Passat, Tiguan.',
     '1K0129620E', 480.00, '00000001-0000-0000-0000-000000000011', TRUE, FALSE, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ============================================================================
-- DISPONIBILIDAD POR SUCURSAL
-- ============================================================================
-- Asignamos stock y precios diferentes a cada sucursal para simular realidad

-- Toyota Satelite (054471c5-0ff3-4adb-8c52-24a24ef25367)
INSERT INTO catalog.product_branch_availability (
    product_id,
    branch_id,
    is_enabled,
    price,
    stock,
    is_active
) VALUES
    -- Productos destacados con buen stock
    ('00000001-0000-0000-0000-000000000001', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, 285.00, 45, TRUE),
    ('00000001-0000-0000-0000-000000000002', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, 450.00, 32, TRUE),
    ('00000001-0000-0000-0000-000000000007', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, 185.00, 28, TRUE),
    ('00000001-0000-0000-0000-000000000011', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, 680.00, 18, TRUE),
    ('00000001-0000-0000-0000-000000000014', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, 1250.00, 12, TRUE),
    ('00000001-0000-0000-0000-000000000018', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, 1850.00, 8, TRUE),
    ('00000001-0000-0000-0000-000000000023', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, 2850.00, 6, TRUE),
    ('00000001-0000-0000-0000-000000000030', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, 2850.00, 10, TRUE),
    ('00000001-0000-0000-0000-000000000035', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, 12500.00, 3, TRUE),
    ('00000001-0000-0000-0000-000000000039', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, 12500.00, 2, TRUE),
    
    -- Resto de productos Toyota
    ('00000001-0000-0000-0000-000000000003', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 15, TRUE),
    ('00000001-0000-0000-0000-000000000004', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 22, TRUE),
    ('00000001-0000-0000-0000-000000000005', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 8, TRUE),
    ('00000001-0000-0000-0000-000000000006', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 18, TRUE),
    ('00000001-0000-0000-0000-000000000008', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 15, TRUE),
    ('00000001-0000-0000-0000-000000000009', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 20, TRUE),
    ('00000001-0000-0000-0000-000000000010', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 12, TRUE),
    ('00000001-0000-0000-0000-000000000012', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 14, TRUE),
    ('00000001-0000-0000-0000-000000000013', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 25, TRUE),
    ('00000001-0000-0000-0000-000000000015', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 10, TRUE),
    ('00000001-0000-0000-0000-000000000016', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 6, TRUE),
    ('00000001-0000-0000-0000-000000000017', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 8, TRUE),
    ('00000001-0000-0000-0000-000000000019', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 7, TRUE),
    ('00000001-0000-0000-0000-000000000020', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 5, TRUE),
    ('00000001-0000-0000-0000-000000000021', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 18, TRUE),
    ('00000001-0000-0000-0000-000000000022', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 12, TRUE),
    ('00000001-0000-0000-0000-000000000024', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 5, TRUE),
    ('00000001-0000-0000-0000-000000000025', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 4, TRUE),
    ('00000001-0000-0000-0000-000000000026', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 4, TRUE),
    ('00000001-0000-0000-0000-000000000027', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 14, TRUE),
    ('00000001-0000-0000-0000-000000000028', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 12, TRUE),
    ('00000001-0000-0000-0000-000000000029', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 16, TRUE),
    ('00000001-0000-0000-0000-000000000031', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 6, TRUE),
    ('00000001-0000-0000-0000-000000000032', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 3, TRUE),
    ('00000001-0000-0000-0000-000000000033', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 4, TRUE),
    ('00000001-0000-0000-0000-000000000034', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 2, TRUE),
    ('00000001-0000-0000-0000-000000000036', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 3, TRUE),
    ('00000001-0000-0000-0000-000000000037', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 5, TRUE),
    ('00000001-0000-0000-0000-000000000038', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 5, TRUE),
    ('00000001-0000-0000-0000-000000000040', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 8, TRUE),
    ('00000001-0000-0000-0000-000000000041', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 6, TRUE),
    ('00000001-0000-0000-0000-000000000042', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 4, TRUE),
    ('00000001-0000-0000-0000-000000000043', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 3, TRUE),
    ('00000001-0000-0000-0000-000000000044', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 10, TRUE),
    ('00000001-0000-0000-0000-000000000045', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 4, TRUE),
    
    -- Productos otras marcas
    ('00000002-0000-0000-0000-000000000001', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 12, TRUE),
    ('00000002-0000-0000-0000-000000000002', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 8, TRUE),
    ('00000002-0000-0000-0000-000000000003', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 5, TRUE),
    ('00000002-0000-0000-0000-000000000004', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 4, TRUE),
    ('00000002-0000-0000-0000-000000000005', '054471c5-0ff3-4adb-8c52-24a24ef25367', TRUE, NULL, 10, TRUE);

-- Toyota Universidad (688e8c01-2a77-4fbe-a55e-ed12a93af55e)
INSERT INTO catalog.product_branch_availability (
    product_id,
    branch_id,
    is_enabled,
    price,
    stock,
    is_active
) VALUES
    -- Productos destacados con precios diferentes
    ('00000001-0000-0000-0000-000000000001', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, 275.00, 38, TRUE),
    ('00000001-0000-0000-0000-000000000002', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, 445.00, 28, TRUE),
    ('00000001-0000-0000-0000-000000000007', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, 180.00, 25, TRUE),
    ('00000001-0000-0000-0000-000000000011', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, 675.00, 15, TRUE),
    ('00000001-0000-0000-0000-000000000014', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, 1240.00, 10, TRUE),
    ('00000001-0000-0000-0000-000000000018', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, 1830.00, 7, TRUE),
    ('00000001-0000-0000-0000-000000000023', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, 2820.00, 5, TRUE),
    ('00000001-0000-0000-0000-000000000030', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, 2800.00, 8, TRUE),
    ('00000001-0000-0000-0000-000000000035', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, 12450.00, 2, TRUE),
    ('00000001-0000-0000-0000-000000000039', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, 12450.00, 1, TRUE),
    
    -- Resto de productos (usando precio global)
    ('00000001-0000-0000-0000-000000000003', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 12, TRUE),
    ('00000001-0000-0000-0000-000000000004', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 18, TRUE),
    ('00000001-0000-0000-0000-000000000005', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 6, TRUE),
    ('00000001-0000-0000-0000-000000000006', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 15, TRUE),
    ('00000001-0000-0000-0000-000000000008', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 12, TRUE),
    ('00000001-0000-0000-0000-000000000009', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 18, TRUE),
    ('00000001-0000-0000-0000-000000000010', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 10, TRUE),
    ('00000001-0000-0000-0000-000000000012', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 12, TRUE),
    ('00000001-0000-0000-0000-000000000013', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 22, TRUE),
    ('00000001-0000-0000-0000-000000000015', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 8, TRUE),
    ('00000001-0000-0000-0000-000000000016', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 5, TRUE),
    ('00000001-0000-0000-0000-000000000017', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 6, TRUE),
    ('00000001-0000-0000-0000-000000000019', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 6, TRUE),
    ('00000001-0000-0000-0000-000000000020', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 4, TRUE),
    ('00000001-0000-0000-0000-000000000021', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 15, TRUE),
    ('00000001-0000-0000-0000-000000000022', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 10, TRUE),
    ('00000001-0000-0000-0000-000000000024', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 4, TRUE),
    ('00000001-0000-0000-0000-000000000025', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 3, TRUE),
    ('00000001-0000-0000-0000-000000000026', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 3, TRUE),
    ('00000001-0000-0000-0000-000000000027', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 12, TRUE),
    ('00000001-0000-0000-0000-000000000028', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 10, TRUE),
    ('00000001-0000-0000-0000-000000000029', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 14, TRUE),
    ('00000001-0000-0000-0000-000000000031', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 5, TRUE),
    ('00000001-0000-0000-0000-000000000032', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 2, TRUE),
    ('00000001-0000-0000-0000-000000000033', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 3, TRUE),
    ('00000001-0000-0000-0000-000000000034', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 1, TRUE),
    ('00000001-0000-0000-0000-000000000036', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 2, TRUE),
    ('00000001-0000-0000-0000-000000000037', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 4, TRUE),
    ('00000001-0000-0000-0000-000000000038', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 4, TRUE),
    ('00000001-0000-0000-0000-000000000040', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 6, TRUE),
    ('00000001-0000-0000-0000-000000000041', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 5, TRUE),
    ('00000001-0000-0000-0000-000000000042', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 3, TRUE),
    ('00000001-0000-0000-0000-000000000043', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 2, TRUE),
    ('00000001-0000-0000-0000-000000000044', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 8, TRUE),
    ('00000001-0000-0000-0000-000000000045', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 3, TRUE),
    
    -- Productos otras marcas
    ('00000002-0000-0000-0000-000000000001', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 10, TRUE),
    ('00000002-0000-0000-0000-000000000002', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 6, TRUE),
    ('00000002-0000-0000-0000-000000000003', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 4, TRUE),
    ('00000002-0000-0000-0000-000000000004', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 3, TRUE),
    ('00000002-0000-0000-0000-000000000005', '688e8c01-2a77-4fbe-a55e-ed12a93af55e', TRUE, NULL, 8, TRUE);

-- Toyota Coyoacan (ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f)
INSERT INTO catalog.product_branch_availability (
    product_id,
    branch_id,
    is_enabled,
    price,
    stock,
    is_active
) VALUES
    -- Productos destacados con precios diferentes
    ('00000001-0000-0000-0000-000000000001', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, 290.00, 42, TRUE),
    ('00000001-0000-0000-0000-000000000002', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, 455.00, 30, TRUE),
    ('00000001-0000-0000-0000-000000000007', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, 190.00, 30, TRUE),
    ('00000001-0000-0000-0000-000000000011', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, 685.00, 20, TRUE),
    ('00000001-0000-0000-0000-000000000014', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, 1260.00, 14, TRUE),
    ('00000001-0000-0000-0000-000000000018', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, 1870.00, 9, TRUE),
    ('00000001-0000-0000-0000-000000000023', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, 2880.00, 7, TRUE),
    ('00000001-0000-0000-0000-000000000030', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, 2900.00, 12, TRUE),
    ('00000001-0000-0000-0000-000000000035', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, 12550.00, 4, TRUE),
    ('00000001-0000-0000-0000-000000000039', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, 12550.00, 3, TRUE),
    
    -- Resto de productos (usando precio global)
    ('00000001-0000-0000-0000-000000000003', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 18, TRUE),
    ('00000001-0000-0000-0000-000000000004', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 25, TRUE),
    ('00000001-0000-0000-0000-000000000005', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 10, TRUE),
    ('00000001-0000-0000-0000-000000000006', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 20, TRUE),
    ('00000001-0000-0000-0000-000000000008', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 18, TRUE),
    ('00000001-0000-0000-0000-000000000009', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 25, TRUE),
    ('00000001-0000-0000-0000-000000000010', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 15, TRUE),
    ('00000001-0000-0000-0000-000000000012', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 16, TRUE),
    ('00000001-0000-0000-0000-000000000013', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 30, TRUE),
    ('00000001-0000-0000-0000-000000000015', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 12, TRUE),
    ('00000001-0000-0000-0000-000000000016', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 8, TRUE),
    ('00000001-0000-0000-0000-000000000017', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 10, TRUE),
    ('00000001-0000-0000-0000-000000000019', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 8, TRUE),
    ('00000001-0000-0000-0000-000000000020', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 6, TRUE),
    ('00000001-0000-0000-0000-000000000021', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 20, TRUE),
    ('00000001-0000-0000-0000-000000000022', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 15, TRUE),
    ('00000001-0000-0000-0000-000000000024', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 6, TRUE),
    ('00000001-0000-0000-0000-000000000025', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 5, TRUE),
    ('00000001-0000-0000-0000-000000000026', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 5, TRUE),
    ('00000001-0000-0000-0000-000000000027', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 16, TRUE),
    ('00000001-0000-0000-0000-000000000028', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 14, TRUE),
    ('00000001-0000-0000-0000-000000000029', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 18, TRUE),
    ('00000001-0000-0000-0000-000000000031', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 8, TRUE),
    ('00000001-0000-0000-0000-000000000032', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 4, TRUE),
    ('00000001-0000-0000-0000-000000000033', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 5, TRUE),
    ('00000001-0000-0000-0000-000000000034', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 3, TRUE),
    ('00000001-0000-0000-0000-000000000036', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 4, TRUE),
    ('00000001-0000-0000-0000-000000000037', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 6, TRUE),
    ('00000001-0000-0000-0000-000000000038', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 6, TRUE),
    ('00000001-0000-0000-0000-000000000040', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 10, TRUE),
    ('00000001-0000-0000-0000-000000000041', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 8, TRUE),
    ('00000001-0000-0000-0000-000000000042', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 5, TRUE),
    ('00000001-0000-0000-0000-000000000043', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 4, TRUE),
    ('00000001-0000-0000-0000-000000000044', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 12, TRUE),
    ('00000001-0000-0000-0000-000000000045', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 5, TRUE),
    
    -- Productos otras marcas
    ('00000002-0000-0000-0000-000000000001', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 15, TRUE),
    ('00000002-0000-0000-0000-000000000002', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 10, TRUE),
    ('00000002-0000-0000-0000-000000000003', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 6, TRUE),
    ('00000002-0000-0000-0000-000000000004', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 5, TRUE),
    ('00000002-0000-0000-0000-000000000005', 'ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f', TRUE, NULL, 12, TRUE);

-- ============================================================================
-- COMPATIBILIDAD CON VEHÍCULOS
-- ============================================================================
-- Asignamos compatibilidad principalmente a Toyota, algunos productos universales

-- Compatibilidad por marca Toyota (para la mayoría de productos)
INSERT INTO catalog.product_vehicle_compatibility (
    product_id,
    vehicle_brand_id,
    is_universal,
    is_active
) VALUES
    -- Productos Toyota específicos
    ('00000001-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000004', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000005', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000006', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000007', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000008', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000009', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000010', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000011', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000012', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000013', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000014', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000015', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000016', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000017', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000018', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000019', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000020', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000021', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000022', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000023', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000024', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000025', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000026', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000027', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000028', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000029', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000030', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000031', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000032', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000033', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000034', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000035', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000036', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000037', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000038', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000039', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000040', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000041', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000042', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000043', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000044', '00000001-0000-0000-0000-000000000001', FALSE, TRUE),
    ('00000001-0000-0000-0000-000000000045', '00000001-0000-0000-0000-000000000001', FALSE, TRUE);

-- Compatibilidad para productos de otras marcas
INSERT INTO catalog.product_vehicle_compatibility (
    product_id,
    vehicle_brand_id,
    is_universal,
    is_active
) VALUES
    ('00000002-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000001', FALSE, TRUE), -- Honda
    ('00000002-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000001', FALSE, TRUE), -- Nissan
    ('00000002-0000-0000-0000-000000000003', '00000004-0000-0000-0000-000000000001', FALSE, TRUE), -- Ford
    ('00000002-0000-0000-0000-000000000004', '00000005-0000-0000-0000-000000000001', FALSE, TRUE), -- Chevrolet
    ('00000002-0000-0000-0000-000000000005', '00000006-0000-0000-0000-000000000001', FALSE, TRUE); -- Volkswagen

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Contar productos creados
SELECT 
    'Productos creados' AS tipo,
    COUNT(*) AS total
FROM catalog.products
WHERE business_id = '054471c5-0ff3-4adb-8c52-24a24ef25367';

-- Contar disponibilidades por sucursal
SELECT 
    'Disponibilidades por sucursal' AS tipo,
    branch_id,
    COUNT(*) AS total
FROM catalog.product_branch_availability
GROUP BY branch_id;

-- Contar compatibilidades
SELECT 
    'Compatibilidades creadas' AS tipo,
    COUNT(*) AS total
FROM catalog.product_vehicle_compatibility;

-- Mostrar algunos productos de ejemplo
SELECT 
    p.sku,
    p.name,
    p.price AS precio_global,
    b.name AS sucursal,
    pba.price AS precio_sucursal,
    pba.stock,
    pba.is_enabled
FROM catalog.products p
JOIN catalog.product_branch_availability pba ON p.id = pba.product_id
JOIN core.businesses b ON pba.branch_id = b.id
WHERE p.sku IN ('90915-YZZF1', '17801-0V010', '90919-01153')
ORDER BY p.sku, b.name;

