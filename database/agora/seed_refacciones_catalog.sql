-- ============================================================================
-- AGORA ECOSYSTEM - Seed Data: Catálogo Completo de Refacciones
-- ============================================================================
-- Descripción: Catálogo completo de refacciones automotrices basado en estructura AutoZone
--              Incluye categorías: Refacciones, Accesorios e Instalación
--              Estructura de hasta 3 niveles (Principal → Categoría → Subcategoría)
-- 
-- Uso: Ejecutar después de schema.sql para poblar datos de refacciones
-- ============================================================================
-- Versión: 2.0
-- Fecha: 2025-12-02
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- CATEGORÍAS PRINCIPALES DE PRODUCTOS
-- ============================================================================

-- Insertar categorías principales (globales, sin business_id)
-- IMPORTANTE: Los UUIDs deben usar solo números (0-9), sin letras
-- NOTA: Este script es idempotente - puede ejecutarse múltiples veces de forma segura
-- Si ya existen categorías con los mismos IDs, se actualizarán. Si no existen, se crearán.
INSERT INTO catalog.product_categories (id, business_id, name, description, display_order, is_active)
VALUES
    -- Categoría principal: Refacciones
    ('00000001-0000-0000-0000-000000000001', NULL, 'Refacciones', 
     'Piezas de repuesto y componentes originales y alternativos para vehículos', 1, TRUE),
    
    -- Categoría principal: Accesorios
    ('00000002-0000-0000-0000-000000000001', NULL, 'Accesorios', 
     'Productos de personalización, mejora y comodidad para vehículos', 2, TRUE),
    
    -- Categoría principal: Instalación
    ('00000003-0000-0000-0000-000000000001', NULL, 'Instalación', 
     'Servicios de instalación profesional de refacciones y accesorios', 3, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 2: CATEGORÍAS PRINCIPALES DE REFACCIONES
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Motor
    ('00000001-0000-0000-0000-000000000010', NULL, 'Motor', 
     'Componentes del motor y sistema de combustión', 
     '00000001-0000-0000-0000-000000000001', 1, TRUE),
    
    -- Sistema de Frenos
    ('00000001-0000-0000-0000-000000000020', NULL, 'Sistema de Frenos', 
     'Componentes del sistema de frenos', 
     '00000001-0000-0000-0000-000000000001', 2, TRUE),
    
    -- Suspensión y Dirección
    ('00000001-0000-0000-0000-000000000030', NULL, 'Suspensión y Dirección', 
     'Componentes de suspensión, dirección y alineación', 
     '00000001-0000-0000-0000-000000000001', 3, TRUE),
    
    -- Sistema Eléctrico
    ('00000001-0000-0000-0000-000000000040', NULL, 'Sistema Eléctrico', 
     'Componentes eléctricos y electrónicos del vehículo', 
     '00000001-0000-0000-0000-000000000001', 4, TRUE),
    
    -- Combustible y Emisiones
    ('00000001-0000-0000-0000-000000000050', NULL, 'Combustible y Emisiones', 
     'Sistema de combustible, escape y control de emisiones', 
     '00000001-0000-0000-0000-000000000001', 5, TRUE),
    
    -- Transmisión y Tren Motriz
    ('00000001-0000-0000-0000-000000000060', NULL, 'Transmisión y Tren Motriz', 
     'Componentes de transmisión y tren motriz', 
     '00000001-0000-0000-0000-000000000001', 6, TRUE),
    
    -- Control de Clima
    ('00000001-0000-0000-0000-000000000070', NULL, 'Control de Clima', 
     'Sistema de aire acondicionado y calefacción', 
     '00000001-0000-0000-0000-000000000001', 7, TRUE),
    
    -- Carrocería y Exterior
    ('00000001-0000-0000-0000-000000000080', NULL, 'Carrocería y Exterior', 
     'Componentes de carrocería, cristales y exterior', 
     '00000001-0000-0000-0000-000000000001', 8, TRUE),
    
    -- Mantenimiento y Fluidos
    ('00000001-0000-0000-0000-000000000090', NULL, 'Mantenimiento y Fluidos', 
     'Aceites, fluidos y productos de mantenimiento', 
     '00000001-0000-0000-0000-000000000001', 9, TRUE),
    
    -- Iluminación
    ('00000001-0000-0000-0000-000000000100', NULL, 'Iluminación', 
     'Faros, calaveras, luces y componentes de iluminación', 
     '00000001-0000-0000-0000-000000000001', 10, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 3: SUBCATEGORÍAS DE MOTOR
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Filtros
    ('00000001-0000-0000-0000-000000000011', NULL, 'Filtros', 
     'Filtros de aceite, aire, combustible y habitáculo', 
     '00000001-0000-0000-0000-000000000010', 1, TRUE),
    
    -- Bujías y Encendido
    ('00000001-0000-0000-0000-000000000012', NULL, 'Bujías y Encendido', 
     'Bujías, cables, bobinas y componentes de encendido', 
     '00000001-0000-0000-0000-000000000010', 2, TRUE),
    
    -- Correas y Mangueras
    ('00000001-0000-0000-0000-000000000013', NULL, 'Correas y Mangueras', 
     'Correas de distribución, alternador, mangueras de radiador y calefacción', 
     '00000001-0000-0000-0000-000000000010', 3, TRUE),
    
    -- Sensores del Motor
    ('00000001-0000-0000-0000-000000000014', NULL, 'Sensores del Motor', 
     'Sensores de temperatura, presión, posición y otros sensores', 
     '00000001-0000-0000-0000-000000000010', 4, TRUE),
    
    -- Radiador y Enfriamiento
    ('00000001-0000-0000-0000-000000000015', NULL, 'Radiador y Enfriamiento', 
     'Radiadores, termostatos, bombas de agua y componentes de enfriamiento', 
     '00000001-0000-0000-0000-000000000010', 5, TRUE),
    
    -- Componentes de Sincronización
    ('00000001-0000-0000-0000-000000000016', NULL, 'Componentes de Sincronización', 
     'Cadenas, engranajes y componentes de sincronización del motor', 
     '00000001-0000-0000-0000-000000000010', 6, TRUE),
    
    -- Aceites y Lubricantes
    ('00000001-0000-0000-0000-000000000017', NULL, 'Aceites y Lubricantes', 
     'Aceites de motor, aditivos y lubricantes', 
     '00000001-0000-0000-0000-000000000010', 7, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 3: SUBCATEGORÍAS DE SISTEMA DE FRENOS
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Pastillas de Freno
    ('00000001-0000-0000-0000-000000000021', NULL, 'Pastillas de Freno', 
     'Pastillas de freno delanteras y traseras', 
     '00000001-0000-0000-0000-000000000020', 1, TRUE),
    
    -- Discos y Tambores
    ('00000001-0000-0000-0000-000000000022', NULL, 'Discos y Tambores', 
     'Discos de freno, tambores y componentes relacionados', 
     '00000001-0000-0000-0000-000000000020', 2, TRUE),
    
    -- Pinzas y Cilindros
    ('00000001-0000-0000-0000-000000000023', NULL, 'Pinzas y Cilindros', 
     'Pinzas de freno, cilindros maestros y de rueda', 
     '00000001-0000-0000-0000-000000000020', 3, TRUE),
    
    -- Líquido de Frenos
    ('00000001-0000-0000-0000-000000000024', NULL, 'Líquido de Frenos', 
     'Líquido de frenos DOT 3, DOT 4, DOT 5', 
     '00000001-0000-0000-0000-000000000020', 4, TRUE),
    
    -- Líneas y Mangueras
    ('00000001-0000-0000-0000-000000000025', NULL, 'Líneas y Mangueras', 
     'Mangueras de freno, líneas de freno y conectores', 
     '00000001-0000-0000-0000-000000000020', 5, TRUE),
    
    -- Sensores de Freno
    ('00000001-0000-0000-0000-000000000026', NULL, 'Sensores de Freno', 
     'Sensores de desgaste y sensores ABS', 
     '00000001-0000-0000-0000-000000000020', 6, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 3: SUBCATEGORÍAS DE SUSPENSIÓN Y DIRECCIÓN
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Amortiguadores y Puntales
    ('00000001-0000-0000-0000-000000000031', NULL, 'Amortiguadores y Puntales', 
     'Amortiguadores, puntales, resortes y componentes de suspensión', 
     '00000001-0000-0000-0000-000000000030', 1, TRUE),
    
    -- Rótulas y Terminales
    ('00000001-0000-0000-0000-000000000032', NULL, 'Rótulas y Terminales', 
     'Rótulas, terminales de dirección y componentes de dirección', 
     '00000001-0000-0000-0000-000000000030', 2, TRUE),
    
    -- Barras y Cremalleras
    ('00000001-0000-0000-0000-000000000033', NULL, 'Barras y Cremalleras', 
     'Barras de dirección, cremalleras y componentes de dirección asistida', 
     '00000001-0000-0000-0000-000000000030', 3, TRUE),
    
    -- Baleros y Rodamientos
    ('00000001-0000-0000-0000-000000000034', NULL, 'Baleros y Rodamientos', 
     'Baleros de rueda, rodamientos y componentes de soporte', 
     '00000001-0000-0000-0000-000000000030', 4, TRUE),
    
    -- Componentes de Alineación
    ('00000001-0000-0000-0000-000000000035', NULL, 'Componentes de Alineación', 
     'Brazos de control, bujes y componentes para alineación', 
     '00000001-0000-0000-0000-000000000030', 5, TRUE),
    
    -- Líquido de Dirección
    ('00000001-0000-0000-0000-000000000036', NULL, 'Líquido de Dirección', 
     'Líquido de dirección asistida y fluidos hidráulicos', 
     '00000001-0000-0000-0000-000000000030', 6, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 3: SUBCATEGORÍAS DE SISTEMA ELÉCTRICO
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Baterías
    ('00000001-0000-0000-0000-000000000041', NULL, 'Baterías', 
     'Baterías de auto, baterías de moto y baterías de respaldo', 
     '00000001-0000-0000-0000-000000000040', 1, TRUE),
    
    -- Alternadores
    ('00000001-0000-0000-0000-000000000042', NULL, 'Alternadores', 
     'Alternadores y reguladores de voltaje', 
     '00000001-0000-0000-0000-000000000040', 2, TRUE),
    
    -- Arrancadores
    ('00000001-0000-0000-0000-000000000043', NULL, 'Arrancadores', 
     'Motor de arranque y solenoides', 
     '00000001-0000-0000-0000-000000000040', 3, TRUE),
    
    -- Fusibles y Relés
    ('00000001-0000-0000-0000-000000000044', NULL, 'Fusibles y Relés', 
     'Fusibles, relés y cajas de fusibles', 
     '00000001-0000-0000-0000-000000000040', 4, TRUE),
    
    -- Cables y Terminales
    ('00000001-0000-0000-0000-000000000045', NULL, 'Cables y Terminales', 
     'Cables de batería, terminales y conectores eléctricos', 
     '00000001-0000-0000-0000-000000000040', 5, TRUE),
    
    -- Sensores Eléctricos
    ('00000001-0000-0000-0000-000000000046', NULL, 'Sensores Eléctricos', 
     'Sensores de velocidad, posición y otros sensores eléctricos', 
     '00000001-0000-0000-0000-000000000040', 6, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 3: SUBCATEGORÍAS DE COMBUSTIBLE Y EMISIONES
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Filtros de Combustible
    ('00000001-0000-0000-0000-000000000051', NULL, 'Filtros de Combustible', 
     'Filtros de combustible y filtros de inyector', 
     '00000001-0000-0000-0000-000000000050', 1, TRUE),
    
    -- Bombas de Combustible
    ('00000001-0000-0000-0000-000000000052', NULL, 'Bombas de Combustible', 
     'Bombas de combustible eléctricas y mecánicas', 
     '00000001-0000-0000-0000-000000000050', 2, TRUE),
    
    -- Sistema de Escape
    ('00000001-0000-0000-0000-000000000053', NULL, 'Sistema de Escape', 
     'Mofles, tubos de escape, convertidores catalíticos', 
     '00000001-0000-0000-0000-000000000050', 3, TRUE),
    
    -- Sensores de Emisiones
    ('00000001-0000-0000-0000-000000000054', NULL, 'Sensores de Emisiones', 
     'Sensores de oxígeno (O2), sensores de temperatura de escape', 
     '00000001-0000-0000-0000-000000000050', 4, TRUE),
    
    -- Inyectores
    ('00000001-0000-0000-0000-000000000055', NULL, 'Inyectores', 
     'Inyectores de combustible y componentes relacionados', 
     '00000001-0000-0000-0000-000000000050', 5, TRUE),
    
    -- Tanque y Líneas
    ('00000001-0000-0000-0000-000000000056', NULL, 'Tanque y Líneas', 
     'Tanques de combustible, líneas y válvulas', 
     '00000001-0000-0000-0000-000000000050', 6, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 3: SUBCATEGORÍAS DE TRANSMISIÓN Y TREN MOTRIZ
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Embragues
    ('00000001-0000-0000-0000-000000000061', NULL, 'Embragues', 
     'Kits de embrague, discos, platos y componentes', 
     '00000001-0000-0000-0000-000000000060', 1, TRUE),
    
    -- Líquido de Transmisión
    ('00000001-0000-0000-0000-000000000062', NULL, 'Líquido de Transmisión', 
     'Aceite de transmisión automática y manual', 
     '00000001-0000-0000-0000-000000000060', 2, TRUE),
    
    -- Filtros de Transmisión
    ('00000001-0000-0000-0000-000000000063', NULL, 'Filtros de Transmisión', 
     'Filtros de transmisión y componentes relacionados', 
     '00000001-0000-0000-0000-000000000060', 3, TRUE),
    
    -- Juntas Homocinéticas
    ('00000001-0000-0000-0000-000000000064', NULL, 'Juntas Homocinéticas', 
     'Juntas homocinéticas, semiejes y componentes del tren motriz', 
     '00000001-0000-0000-0000-000000000060', 4, TRUE),
    
    -- Componentes de Transmisión
    ('00000001-0000-0000-0000-000000000065', NULL, 'Componentes de Transmisión', 
     'Solenoides, válvulas y componentes internos de transmisión', 
     '00000001-0000-0000-0000-000000000060', 5, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 3: SUBCATEGORÍAS DE CONTROL DE CLIMA
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Compresor de Aire Acondicionado
    ('00000001-0000-0000-0000-000000000071', NULL, 'Compresor de Aire Acondicionado', 
     'Compresores, condensadores y componentes del sistema AC', 
     '00000001-0000-0000-0000-000000000070', 1, TRUE),
    
    -- Evaporador y Núcleo
    ('00000001-0000-0000-0000-000000000072', NULL, 'Evaporador y Núcleo', 
     'Evaporadores, núcleos de calefacción y componentes', 
     '00000001-0000-0000-0000-000000000070', 2, TRUE),
    
    -- Refrigerante
    ('00000001-0000-0000-0000-000000000073', NULL, 'Refrigerante', 
     'Refrigerante R134a, R1234yf y otros refrigerantes', 
     '00000001-0000-0000-0000-000000000070', 3, TRUE),
    
    -- Filtros de Aire de Cabina
    ('00000001-0000-0000-0000-000000000074', NULL, 'Filtros de Aire de Cabina', 
     'Filtros de aire de habitáculo y filtros HEPA', 
     '00000001-0000-0000-0000-000000000070', 4, TRUE),
    
    -- Ventiladores y Motores
    ('00000001-0000-0000-0000-000000000075', NULL, 'Ventiladores y Motores', 
     'Ventiladores de radiador, motores de ventilador y componentes', 
     '00000001-0000-0000-0000-000000000070', 5, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 3: SUBCATEGORÍAS DE CARROCERÍA Y EXTERIOR
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Parabrisas y Cristales
    ('00000001-0000-0000-0000-000000000081', NULL, 'Parabrisas y Cristales', 
     'Parabrisas, ventanas laterales y cristales traseros', 
     '00000001-0000-0000-0000-000000000080', 1, TRUE),
    
    -- Espejos
    ('00000001-0000-0000-0000-000000000082', NULL, 'Espejos', 
     'Espejos retrovisores exteriores e interiores', 
     '00000001-0000-0000-0000-000000000080', 2, TRUE),
    
    -- Defensas y Parachoques
    ('00000001-0000-0000-0000-000000000083', NULL, 'Defensas y Parachoques', 
     'Parachoques delanteros y traseros, defensas', 
     '00000001-0000-0000-0000-000000000080', 3, TRUE),
    
    -- Capó y Puertas
    ('00000001-0000-0000-0000-000000000084', NULL, 'Capó y Puertas', 
     'Capós, puertas, bisagras y componentes de carrocería', 
     '00000001-0000-0000-0000-000000000080', 4, TRUE),
    
    -- Emblemas y Logos
    ('00000001-0000-0000-0000-000000000085', NULL, 'Emblemas y Logos', 
     'Emblemas de marca, logos y letreros', 
     '00000001-0000-0000-0000-000000000080', 5, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 3: SUBCATEGORÍAS DE MANTENIMIENTO Y FLUIDOS
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Aceites de Motor
    ('00000001-0000-0000-0000-000000000091', NULL, 'Aceites de Motor', 
     'Aceites sintéticos, convencionales y de alto kilometraje', 
     '00000001-0000-0000-0000-000000000090', 1, TRUE),
    
    -- Aditivos
    ('00000001-0000-0000-0000-000000000092', NULL, 'Aditivos', 
     'Aditivos para motor, combustible y sistemas', 
     '00000001-0000-0000-0000-000000000090', 2, TRUE),
    
    -- Fluidos Hidráulicos
    ('00000001-0000-0000-0000-000000000093', NULL, 'Fluidos Hidráulicos', 
     'Líquido de dirección, líquido de frenos y fluidos hidráulicos', 
     '00000001-0000-0000-0000-000000000090', 3, TRUE),
    
    -- Productos de Limpieza
    ('00000001-0000-0000-0000-000000000094', NULL, 'Productos de Limpieza', 
     'Limpiadores de motor, desengrasantes y productos de mantenimiento', 
     '00000001-0000-0000-0000-000000000090', 4, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 3: SUBCATEGORÍAS DE ILUMINACIÓN
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Faros y Calaveras
    ('00000001-0000-0000-0000-000000000101', NULL, 'Faros y Calaveras', 
     'Faros delanteros, calaveras traseras y componentes', 
     '00000001-0000-0000-0000-000000000100', 1, TRUE),
    
    -- Focos y Bombillas
    ('00000001-0000-0000-0000-000000000102', NULL, 'Focos y Bombillas', 
     'Bombillas H4, H7, LED y otros tipos de focos', 
     '00000001-0000-0000-0000-000000000100', 2, TRUE),
    
    -- Luces de Señalización
    ('00000001-0000-0000-0000-000000000103', NULL, 'Luces de Señalización', 
     'Luces direccionales, intermitentes y de emergencia', 
     '00000001-0000-0000-0000-000000000100', 3, TRUE),
    
    -- Luces Interiores
    ('00000001-0000-0000-0000-000000000104', NULL, 'Luces Interiores', 
     'Luces de techo, luces de cortesía y iluminación interior', 
     '00000001-0000-0000-0000-000000000100', 4, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 2: CATEGORÍAS PRINCIPALES DE ACCESORIOS
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Audio y Multimedia
    ('00000002-0000-0000-0000-000000000010', NULL, 'Audio y Multimedia', 
     'Sistemas de audio, pantallas y multimedia', 
     '00000002-0000-0000-0000-000000000001', 1, TRUE),
    
    -- Iluminación
    ('00000002-0000-0000-0000-000000000020', NULL, 'Iluminación', 
     'Luces LED, faros auxiliares y accesorios de iluminación', 
     '00000002-0000-0000-0000-000000000001', 2, TRUE),
    
    -- Seguridad
    ('00000002-0000-0000-0000-000000000030', NULL, 'Seguridad', 
     'Alarmas, sistemas de seguridad y protección', 
     '00000002-0000-0000-0000-000000000001', 3, TRUE),
    
    -- Estética y Personalización
    ('00000002-0000-0000-0000-000000000040', NULL, 'Estética y Personalización', 
     'Accesorios decorativos y de personalización', 
     '00000002-0000-0000-0000-000000000001', 4, TRUE),
    
    -- Confort e Interior
    ('00000002-0000-0000-0000-000000000050', NULL, 'Confort e Interior', 
     'Accesorios de comodidad y organización interior', 
     '00000002-0000-0000-0000-000000000001', 5, TRUE),
    
    -- Performance
    ('00000002-0000-0000-0000-000000000060', NULL, 'Performance', 
     'Accesorios para mejorar el rendimiento del vehículo', 
     '00000002-0000-0000-0000-000000000001', 6, TRUE),
    
    -- Carga y Transporte
    ('00000002-0000-0000-0000-000000000070', NULL, 'Carga y Transporte', 
     'Portaequipajes, remolques y accesorios de carga', 
     '00000002-0000-0000-0000-000000000001', 7, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 3: SUBCATEGORÍAS DE AUDIO Y MULTIMEDIA
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Sistemas de Audio
    ('00000002-0000-0000-0000-000000000011', NULL, 'Sistemas de Audio', 
     'Estéreos, pantallas táctiles y sistemas multimedia', 
     '00000002-0000-0000-0000-000000000010', 1, TRUE),
    
    -- Bocinas y Altavoces
    ('00000002-0000-0000-0000-000000000012', NULL, 'Bocinas y Altavoces', 
     'Bocinas, tweeters, subwoofers y sistemas de sonido', 
     '00000002-0000-0000-0000-000000000010', 2, TRUE),
    
    -- Amplificadores
    ('00000002-0000-0000-0000-000000000013', NULL, 'Amplificadores', 
     'Amplificadores de audio y procesadores de señal', 
     '00000002-0000-0000-0000-000000000010', 3, TRUE),
    
    -- Accesorios de Audio
    ('00000002-0000-0000-0000-000000000014', NULL, 'Accesorios de Audio', 
     'Cables, adaptadores y accesorios para sistemas de audio', 
     '00000002-0000-0000-0000-000000000010', 4, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 3: SUBCATEGORÍAS DE ILUMINACIÓN (ACCESORIOS)
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Luces LED
    ('00000002-0000-0000-0000-000000000021', NULL, 'Luces LED', 
     'Kits de luces LED, tiras LED y accesorios LED', 
     '00000002-0000-0000-0000-000000000020', 1, TRUE),
    
    -- Faros Auxiliares
    ('00000002-0000-0000-0000-000000000022', NULL, 'Faros Auxiliares', 
     'Faros de niebla, faros de trabajo y luces auxiliares', 
     '00000002-0000-0000-0000-000000000020', 2, TRUE),
    
    -- Luces de Neón
    ('00000002-0000-0000-0000-000000000023', NULL, 'Luces de Neón', 
     'Tubos de neón, luces de ambiente y efectos de iluminación', 
     '00000002-0000-0000-0000-000000000020', 3, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 3: SUBCATEGORÍAS DE SEGURIDAD
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Alarmas
    ('00000002-0000-0000-0000-000000000031', NULL, 'Alarmas', 
     'Sistemas de alarma, inmovilizadores y seguridad', 
     '00000002-0000-0000-0000-000000000030', 1, TRUE),
    
    -- Cámaras y Sensores
    ('00000002-0000-0000-0000-000000000032', NULL, 'Cámaras y Sensores', 
     'Cámaras de reversa, sensores de estacionamiento y sistemas de visión', 
     '00000002-0000-0000-0000-000000000030', 2, TRUE),
    
    -- Cerraduras y Seguridad
    ('00000002-0000-0000-0000-000000000033', NULL, 'Cerraduras y Seguridad', 
     'Cerraduras eléctricas, bloqueadores y sistemas de seguridad', 
     '00000002-0000-0000-0000-000000000030', 3, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 3: SUBCATEGORÍAS DE ESTÉTICA Y PERSONALIZACIÓN
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Calcomanías y Vinilos
    ('00000002-0000-0000-0000-000000000041', NULL, 'Calcomanías y Vinilos', 
     'Calcomanías decorativas, vinilos y gráficos', 
     '00000002-0000-0000-0000-000000000040', 1, TRUE),
    
    -- Spoilers y Alerones
    ('00000002-0000-0000-0000-000000000042', NULL, 'Spoilers y Alerones', 
     'Spoilers traseros, alerones y componentes aerodinámicos', 
     '00000002-0000-0000-0000-000000000040', 2, TRUE),
    
    -- Emblemas y Logos Personalizados
    ('00000002-0000-0000-0000-000000000043', NULL, 'Emblemas y Logos Personalizados', 
     'Emblemas personalizados, logos y letreros decorativos', 
     '00000002-0000-0000-0000-000000000040', 3, TRUE),
    
    -- Accesorios Decorativos
    ('00000002-0000-0000-0000-000000000044', NULL, 'Accesorios Decorativos', 
     'Molduras, protectores y accesorios de estilo', 
     '00000002-0000-0000-0000-000000000040', 4, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 3: SUBCATEGORÍAS DE CONFORT E INTERIOR
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Tapetes y Alfombras
    ('00000002-0000-0000-0000-000000000051', NULL, 'Tapetes y Alfombras', 
     'Tapetes de piso, alfombras y protectores', 
     '00000002-0000-0000-0000-000000000050', 1, TRUE),
    
    -- Fundas para Asientos
    ('00000002-0000-0000-0000-000000000052', NULL, 'Fundas para Asientos', 
     'Fundas para asientos, protectores y cobertores', 
     '00000002-0000-0000-0000-000000000050', 2, TRUE),
    
    -- Organizadores
    ('00000002-0000-0000-0000-000000000053', NULL, 'Organizadores', 
     'Organizadores de consola, portaobjetos y accesorios de organización', 
     '00000002-0000-0000-0000-000000000050', 3, TRUE),
    
    -- Accesorios de Limpieza
    ('00000002-0000-0000-0000-000000000054', NULL, 'Accesorios de Limpieza', 
     'Aspiradoras, productos de limpieza y cuidado interior', 
     '00000002-0000-0000-0000-000000000050', 4, TRUE),
    
    -- Ambientadores
    ('00000002-0000-0000-0000-000000000055', NULL, 'Ambientadores', 
     'Ambientadores, purificadores y aromatizantes', 
     '00000002-0000-0000-0000-000000000050', 5, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 3: SUBCATEGORÍAS DE PERFORMANCE
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Filtros de Alto Flujo
    ('00000002-0000-0000-0000-000000000061', NULL, 'Filtros de Alto Flujo', 
     'Filtros de aire de alto rendimiento y filtros de aceite', 
     '00000002-0000-0000-0000-000000000060', 1, TRUE),
    
    -- Escape Deportivo
    ('00000002-0000-0000-0000-000000000062', NULL, 'Escape Deportivo', 
     'Sistemas de escape deportivo y componentes de rendimiento', 
     '00000002-0000-0000-0000-000000000060', 2, TRUE),
    
    -- Chips y Módulos
    ('00000002-0000-0000-0000-000000000063', NULL, 'Chips y Módulos', 
     'Chips de potencia, módulos de rendimiento y reprogramación', 
     '00000002-0000-0000-0000-000000000060', 3, TRUE),
    
    -- Componentes de Rendimiento
    ('00000002-0000-0000-0000-000000000064', NULL, 'Componentes de Rendimiento', 
     'Turbos, supercargadores y componentes de potencia', 
     '00000002-0000-0000-0000-000000000060', 4, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 3: SUBCATEGORÍAS DE CARGA Y TRANSPORTE
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Portaequipajes
    ('00000002-0000-0000-0000-000000000071', NULL, 'Portaequipajes', 
     'Barras de techo, portaequipajes y sistemas de carga', 
     '00000002-0000-0000-0000-000000000070', 1, TRUE),
    
    -- Remolques y Accesorios
    ('00000002-0000-0000-0000-000000000072', NULL, 'Remolques y Accesorios', 
     'Bolas de remolque, enganches y accesorios para remolque', 
     '00000002-0000-0000-0000-000000000070', 2, TRUE),
    
    -- Portabicicletas
    ('00000002-0000-0000-0000-000000000073', NULL, 'Portabicicletas', 
     'Portabicicletas de techo y traseros', 
     '00000002-0000-0000-0000-000000000070', 3, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 2: CATEGORÍAS PRINCIPALES DE INSTALACIÓN
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Instalación de Refacciones
    ('00000003-0000-0000-0000-000000000010', NULL, 'Instalación de Refacciones', 
     'Servicio profesional de instalación de componentes y piezas de repuesto', 
     '00000003-0000-0000-0000-000000000001', 1, TRUE),
    
    -- Instalación de Accesorios
    ('00000003-0000-0000-0000-000000000020', NULL, 'Instalación de Accesorios', 
     'Instalación profesional de accesorios de audio, iluminación y personalización', 
     '00000003-0000-0000-0000-000000000001', 2, TRUE),
    
    -- Servicios de Mantenimiento
    ('00000003-0000-0000-0000-000000000030', NULL, 'Servicios de Mantenimiento', 
     'Cambio de aceite, alineación, balanceo y mantenimiento preventivo', 
     '00000003-0000-0000-0000-000000000001', 3, TRUE),
    
    -- Diagnóstico y Reparación
    ('00000003-0000-0000-0000-000000000040', NULL, 'Diagnóstico y Reparación', 
     'Escaneo computarizado, diagnóstico de fallas y servicios de reparación', 
     '00000003-0000-0000-0000-000000000001', 4, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 3: SUBCATEGORÍAS DE INSTALACIÓN DE REFACCIONES
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Instalación de Motor
    ('00000003-0000-0000-0000-000000000011', NULL, 'Instalación de Motor', 
     'Instalación de componentes del motor: filtros, bujías, correas, sensores', 
     '00000003-0000-0000-0000-000000000010', 1, TRUE),
    
    -- Instalación de Frenos
    ('00000003-0000-0000-0000-000000000012', NULL, 'Instalación de Frenos', 
     'Instalación de pastillas, discos, pinzas y componentes de frenos', 
     '00000003-0000-0000-0000-000000000010', 2, TRUE),
    
    -- Instalación de Suspensión
    ('00000003-0000-0000-0000-000000000013', NULL, 'Instalación de Suspensión', 
     'Instalación de amortiguadores, puntales y componentes de suspensión', 
     '00000003-0000-0000-0000-000000000010', 3, TRUE),
    
    -- Instalación Eléctrica
    ('00000003-0000-0000-0000-000000000014', NULL, 'Instalación Eléctrica', 
     'Instalación de baterías, alternadores, arrancadores y componentes eléctricos', 
     '00000003-0000-0000-0000-000000000010', 4, TRUE),
    
    -- Instalación de Transmisión
    ('00000003-0000-0000-0000-000000000015', NULL, 'Instalación de Transmisión', 
     'Instalación de embragues y componentes de transmisión', 
     '00000003-0000-0000-0000-000000000010', 5, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 3: SUBCATEGORÍAS DE INSTALACIÓN DE ACCESORIOS
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Instalación de Audio
    ('00000003-0000-0000-0000-000000000021', NULL, 'Instalación de Audio', 
     'Instalación de sistemas de audio, bocinas y amplificadores', 
     '00000003-0000-0000-0000-000000000020', 1, TRUE),
    
    -- Instalación de Iluminación
    ('00000003-0000-0000-0000-000000000022', NULL, 'Instalación de Iluminación', 
     'Instalación de luces LED, faros auxiliares y sistemas de iluminación', 
     '00000003-0000-0000-0000-000000000020', 2, TRUE),
    
    -- Instalación de Seguridad
    ('00000003-0000-0000-0000-000000000023', NULL, 'Instalación de Seguridad', 
     'Instalación de alarmas, cámaras y sistemas de seguridad', 
     '00000003-0000-0000-0000-000000000020', 3, TRUE),
    
    -- Instalación de Accesorios Estéticos
    ('00000003-0000-0000-0000-000000000024', NULL, 'Instalación de Accesorios Estéticos', 
     'Instalación de spoilers, alerones y accesorios de personalización', 
     '00000003-0000-0000-0000-000000000020', 4, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 3: SUBCATEGORÍAS DE SERVICIOS DE MANTENIMIENTO
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Cambio de Aceite
    ('00000003-0000-0000-0000-000000000031', NULL, 'Cambio de Aceite', 
     'Servicio de cambio de aceite y filtro', 
     '00000003-0000-0000-0000-000000000030', 1, TRUE),
    
    -- Alineación y Balanceo
    ('00000003-0000-0000-0000-000000000032', NULL, 'Alineación y Balanceo', 
     'Alineación de dirección y balanceo de llantas', 
     '00000003-0000-0000-0000-000000000030', 2, TRUE),
    
    -- Mantenimiento Preventivo
    ('00000003-0000-0000-0000-000000000033', NULL, 'Mantenimiento Preventivo', 
     'Revisión general, mantenimiento programado y servicios preventivos', 
     '00000003-0000-0000-0000-000000000030', 3, TRUE),
    
    -- Servicio de Fluidos
    ('00000003-0000-0000-0000-000000000034', NULL, 'Servicio de Fluidos', 
     'Cambio de fluidos: transmisión, dirección, frenos, refrigerante', 
     '00000003-0000-0000-0000-000000000030', 4, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- NIVEL 3: SUBCATEGORÍAS DE DIAGNÓSTICO Y REPARACIÓN
-- ============================================================================

INSERT INTO catalog.product_categories (id, business_id, name, description, parent_category_id, display_order, is_active)
VALUES
    -- Escaneo Computarizado
    ('00000003-0000-0000-0000-000000000041', NULL, 'Escaneo Computarizado', 
     'Escaneo OBD-II, lectura de códigos y diagnóstico electrónico', 
     '00000003-0000-0000-0000-000000000040', 1, TRUE),
    
    -- Diagnóstico de Fallas
    ('00000003-0000-0000-0000-000000000042', NULL, 'Diagnóstico de Fallas', 
     'Diagnóstico de problemas mecánicos y eléctricos', 
     '00000003-0000-0000-0000-000000000040', 2, TRUE),
    
    -- Reparación Mecánica
    ('00000003-0000-0000-0000-000000000043', NULL, 'Reparación Mecánica', 
     'Servicios de reparación de motor, transmisión y sistemas mecánicos', 
     '00000003-0000-0000-0000-000000000040', 3, TRUE),
    
    -- Reparación Eléctrica
    ('00000003-0000-0000-0000-000000000044', NULL, 'Reparación Eléctrica', 
     'Reparación de sistemas eléctricos y electrónicos', 
     '00000003-0000-0000-0000-000000000040', 4, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- VERIFICACIÓN DE DATOS INSERTADOS
-- ============================================================================

-- Consulta para verificar las categorías creadas con su jerarquía completa
SELECT 
    pc.id,
    pc.name as categoria,
    pc.description,
    pc.display_order,
    parent.name as categoria_padre,
    grandparent.name as categoria_principal,
    pc.is_active,
    CASE 
        WHEN pc.parent_category_id IS NULL THEN 'Nivel 1 - Principal'
        WHEN parent.parent_category_id IS NULL THEN 'Nivel 2 - Categoría'
        ELSE 'Nivel 3 - Subcategoría'
    END as nivel
FROM catalog.product_categories pc
LEFT JOIN catalog.product_categories parent ON pc.parent_category_id = parent.id
LEFT JOIN catalog.product_categories grandparent ON parent.parent_category_id = grandparent.id
WHERE pc.business_id IS NULL -- Solo categorías globales
ORDER BY 
    COALESCE(grandparent.id, parent.id, pc.id),
    COALESCE(parent.display_order, pc.display_order),
    pc.display_order,
    pc.name;

-- Contar categorías por nivel
SELECT 
    CASE 
        WHEN pc.parent_category_id IS NULL THEN 'Nivel 1 - Principal'
        WHEN parent.parent_category_id IS NULL THEN 'Nivel 2 - Categoría'
        ELSE 'Nivel 3 - Subcategoría'
    END as nivel,
    COUNT(*) as total
FROM catalog.product_categories pc
LEFT JOIN catalog.product_categories parent ON pc.parent_category_id = parent.id
WHERE pc.business_id IS NULL
GROUP BY 
    CASE 
        WHEN pc.parent_category_id IS NULL THEN 'Nivel 1 - Principal'
        WHEN parent.parent_category_id IS NULL THEN 'Nivel 2 - Categoría'
        ELSE 'Nivel 3 - Subcategoría'
    END
ORDER BY nivel;

-- Resumen por categoría principal
SELECT 
    grandparent.name as categoria_principal,
    parent.name as categoria,
    COUNT(pc.id) as subcategorias
FROM catalog.product_categories pc
JOIN catalog.product_categories parent ON pc.parent_category_id = parent.id
JOIN catalog.product_categories grandparent ON parent.parent_category_id = grandparent.id
WHERE pc.business_id IS NULL
GROUP BY grandparent.name, parent.name, grandparent.display_order, parent.display_order
ORDER BY grandparent.display_order, parent.display_order;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
