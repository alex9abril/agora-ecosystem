-- ============================================================================
-- DELIVERY ECOSYSTEM - Seed Data: Ciclo Completo de Delivery
-- ============================================================================
-- Descripción: Datos de ejemplo para un ciclo completo de delivery:
--              - Usuarios en Supabase auth.users (crear manualmente o vía API)
--              - Perfiles de usuario en core.user_profiles
--              - Negocio con productos y colecciones
--              - Pedido completo
--              - Entrega
--              - Evaluación y propina
-- 
-- IMPORTANTE: Este script asume que los usuarios ya existen en auth.users
--             Crea los usuarios primero usando Supabase Auth API o Dashboard
-- 
-- Uso: Ejecutar después de schema.sql y crear usuarios en Supabase Auth
-- ============================================================================
-- Versión: 2.0 (Supabase Auth)
-- Fecha: 2024-11-18
-- ============================================================================

-- Configurar search_path
SET search_path TO public, core, catalog, orders, reviews, communication, commerce, social, auth;

-- ============================================================================
-- LIMPIAR DATOS EXISTENTES (OPCIONAL - Descomentar si necesitas resetear)
-- ============================================================================
/*
DELETE FROM reviews.tips WHERE order_id IN (SELECT id FROM orders.orders WHERE business_id = '11111111-1111-1111-1111-111111111111');
DELETE FROM reviews.reviews WHERE order_id IN (SELECT id FROM orders.orders WHERE business_id = '11111111-1111-1111-1111-111111111111');
DELETE FROM orders.order_items WHERE order_id IN (SELECT id FROM orders.orders WHERE business_id = '11111111-1111-1111-1111-111111111111');
DELETE FROM orders.deliveries WHERE order_id IN (SELECT id FROM orders.orders WHERE business_id = '11111111-1111-1111-1111-111111111111');
DELETE FROM orders.orders WHERE business_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM catalog.collection_products WHERE collection_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
DELETE FROM catalog.collections WHERE business_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM catalog.products WHERE business_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM catalog.product_categories WHERE business_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM core.businesses WHERE id = '11111111-1111-1111-1111-111111111111';
DELETE FROM core.addresses WHERE user_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111');
DELETE FROM core.repartidores WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
DELETE FROM core.user_profiles WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111');
-- Nota: Los usuarios en auth.users deben eliminarse manualmente desde Supabase Dashboard
*/

-- ============================================================================
-- 1. USUARIOS Y PERFILES
-- ============================================================================
-- ⚠️ IMPORTANTE: Los usuarios DEBEN crearse PRIMERO en Supabase Auth
-- 
-- OPCIÓN 1: Usar Supabase Dashboard (Recomendado)
-- 1. Ve a Authentication > Users > Add User
-- 2. Crea estos 3 usuarios con estos IDs exactos:
--    - Email: cliente@example.com
--      ID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
--      Password: (cualquiera, ej: password123)
--    
--    - Email: repartidor@example.com
--      ID: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
--      Password: (cualquiera, ej: password123)
--    
--    - Email: local@example.com
--      ID: 11111111-1111-1111-1111-111111111111
--      Password: (cualquiera, ej: password123)
--
-- OPCIÓN 2: Usar Supabase Auth API (desde tu aplicación)
-- Usa supabase.auth.admin.createUser() con los IDs especificados
--
-- OPCIÓN 3: SQL directo (requiere permisos de service_role)
-- Ver sección al final de este archivo
--
-- ⚠️ NO ejecutes los INSERTs de abajo hasta que los usuarios existan en auth.users

-- ============================================================================
-- VERIFICAR QUE LOS USUARIOS EXISTAN EN auth.users
-- ============================================================================
-- Descomenta estas líneas para verificar antes de insertar perfiles:
/*
SELECT 
    id, 
    email, 
    email_confirmed_at IS NOT NULL as email_verified
FROM auth.users 
WHERE id IN (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111'
);
-- Debe retornar 3 filas. Si retorna menos, crea los usuarios faltantes.
*/

-- ============================================================================
-- OBTENER IDs REALES DE USUARIOS (por email)
-- ============================================================================
-- Este script busca usuarios por EMAIL y usa los IDs reales que Supabase generó
-- ⚠️ Asegúrate de que los usuarios existan en auth.users con estos emails:
--    - cliente@example.com
--    - repartidor@example.com
--    - local@example.com

DO $$
DECLARE
    v_cliente_id UUID;
    v_repartidor_id UUID;
    v_local_id UUID;
BEGIN
    -- Obtener IDs reales
    SELECT id INTO v_cliente_id FROM auth.users WHERE email = 'cliente@example.com' LIMIT 1;
    SELECT id INTO v_repartidor_id FROM auth.users WHERE email = 'repartidor@example.com' LIMIT 1;
    SELECT id INTO v_local_id FROM auth.users WHERE email = 'local@example.com' LIMIT 1;
    
    -- Verificar que todos los usuarios existan
    IF v_cliente_id IS NULL THEN
        RAISE EXCEPTION 'Usuario cliente@example.com no encontrado en auth.users';
    END IF;
    IF v_repartidor_id IS NULL THEN
        RAISE EXCEPTION 'Usuario repartidor@example.com no encontrado en auth.users';
    END IF;
    IF v_local_id IS NULL THEN
        RAISE EXCEPTION 'Usuario local@example.com no encontrado en auth.users';
    END IF;
    
    -- Guardar IDs en una tabla temporal para uso posterior
    CREATE TEMP TABLE IF NOT EXISTS seed_user_ids (
        role_type VARCHAR(20) PRIMARY KEY,
        user_id UUID NOT NULL
    );
    
    DELETE FROM seed_user_ids;
    INSERT INTO seed_user_ids VALUES 
        ('cliente', v_cliente_id),
        ('repartidor', v_repartidor_id),
        ('local', v_local_id);
    
    RAISE NOTICE 'IDs obtenidos - Cliente: %, Repartidor: %, Local: %', 
        v_cliente_id, v_repartidor_id, v_local_id;
END $$;

-- ============================================================================
-- PERFILES DE USUARIO (extienden auth.users)
-- ============================================================================

-- Cliente
INSERT INTO core.user_profiles (
    id, role, first_name, last_name, phone,
    phone_verified, is_active, wallet_user_id
)
SELECT 
    user_id,
    'client',
    'Juan',
    'Pérez',
    '+525512345678',
    TRUE,
    TRUE,
    'wallet-user-cliente-001'
FROM seed_user_ids
WHERE role_type = 'cliente'
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone;

-- Repartidor
INSERT INTO core.user_profiles (
    id, role, first_name, last_name, phone,
    phone_verified, is_active, wallet_user_id
)
SELECT 
    user_id,
    'repartidor',
    'Carlos',
    'González',
    '+525598765432',
    TRUE,
    TRUE,
    'wallet-user-repartidor-001'
FROM seed_user_ids
WHERE role_type = 'repartidor'
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone;

-- Dueño del Local
INSERT INTO core.user_profiles (
    id, role, first_name, last_name, phone,
    phone_verified, is_active, wallet_user_id
)
SELECT 
    user_id,
    'local',
    'María',
    'Rodríguez',
    '+525555555555',
    TRUE,
    TRUE,
    'wallet-user-local-001'
FROM seed_user_ids
WHERE role_type = 'local'
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone;

-- ============================================================================
-- 2. DIRECCIONES
-- ============================================================================

-- Dirección del Cliente (La Roma, CDMX)
INSERT INTO core.addresses (
    id, user_id, label, street, street_number, neighborhood,
    city, state, postal_code, country, location, is_default, is_active
)
SELECT 
    'aaaa0000-0000-0000-0000-000000000001',
    (SELECT user_id FROM seed_user_ids WHERE role_type = 'cliente'),
    'Casa',
    'Calle Orizaba',
    '123',
    'Roma Norte',
    'Ciudad de México',
    'CDMX',
    '06700',
    'México',
    ST_MakePoint(-99.1619, 19.4230)::point, -- Coordenadas La Roma
    TRUE,
    TRUE
ON CONFLICT (id) DO NOTHING;

-- Dirección del Local (La Roma, CDMX)
INSERT INTO core.addresses (
    id, user_id, label, street, street_number, neighborhood,
    city, state, postal_code, country, location, is_default, is_active
)
SELECT 
    '11110000-0000-0000-0000-000000000001',
    (SELECT user_id FROM seed_user_ids WHERE role_type = 'local'),
    'Local',
    'Avenida Álvaro Obregón',
    '45',
    'Roma Norte',
    'Ciudad de México',
    'CDMX',
    '06700',
    'México',
    ST_MakePoint(-99.1600, 19.4220)::point, -- Coordenadas cerca del cliente
    TRUE,
    TRUE
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. NEGOCIO
-- ============================================================================

INSERT INTO core.businesses (
    id, owner_id, name, legal_name, description, category,
    phone, email, address_id, location,
    is_active, is_verified, accepts_orders,
    commission_rate, uses_eco_packaging, packaging_type,
    opening_hours, rating_average, total_reviews, total_orders,
    wallet_business_id
)
SELECT 
    '11111111-1111-1111-1111-111111111111',
    (SELECT user_id FROM seed_user_ids WHERE role_type = 'local'),
    'Restaurante La Roma',
    'Restaurante La Roma S.A. de C.V.',
    'Restaurante de comida mexicana e internacional en el corazón de La Roma',
    'Restaurante',
    '+525555555555',
    'contacto@restaurantelaroma.com',
    '11110000-0000-0000-0000-000000000001',
    ST_MakePoint(-99.1600, 19.4220)::point,
    TRUE,
    TRUE,
    TRUE,
    15.00,
    TRUE,
    'biodegradable',
    '{"monday": {"open": "09:00", "close": "22:00"}, "tuesday": {"open": "09:00", "close": "22:00"}, "wednesday": {"open": "09:00", "close": "22:00"}, "thursday": {"open": "09:00", "close": "22:00"}, "friday": {"open": "09:00", "close": "23:00"}, "saturday": {"open": "10:00", "close": "23:00"}, "sunday": {"open": "10:00", "close": "21:00"}}'::jsonb,
    4.5,
    25,
    120,
    'wallet-business-001'
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- 4. CATEGORÍAS DE PRODUCTOS (Específicas del negocio)
-- ============================================================================

INSERT INTO catalog.product_categories (
    id, business_id, name, description, display_order, is_active
) VALUES
    ('00000001-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'Tacos', 'Tacos tradicionales y especiales', 1, TRUE),
    ('00000002-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'Hamburguesas', 'Hamburguesas artesanales', 2, TRUE),
    ('00000003-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'Bebidas', 'Refrescos, aguas, jugos', 3, TRUE),
    ('00000004-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'Postres', 'Dulces y postres caseros', 4, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. PRODUCTOS
-- ============================================================================

INSERT INTO catalog.products (
    id, business_id, name, description, price, category_id,
    is_available, is_featured, display_order
) VALUES
    -- Tacos
    ('00000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 
     'Tacos al Pastor', 'Tacos tradicionales de pastor con piña', 35.00,
     '00000001-0000-0000-0000-000000000010', TRUE, TRUE, 1),
    
    ('00000002-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
     'Tacos de Suadero', 'Tacos de suadero bien dorados', 30.00,
     '00000001-0000-0000-0000-000000000010', TRUE, FALSE, 2),
    
    -- Hamburguesas
    ('00000003-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
     'Hamburguesa Clásica', 'Carne, lechuga, tomate, cebolla, queso', 120.00,
     '00000002-0000-0000-0000-000000000010', TRUE, TRUE, 1),
    
    ('00000004-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
     'Hamburguesa BBQ', 'Carne, tocino, queso, cebolla caramelizada, salsa BBQ', 150.00,
     '00000002-0000-0000-0000-000000000010', TRUE, FALSE, 2),
    
    -- Bebidas
    ('00000005-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
     'Coca Cola 600ml', 'Refresco de cola', 25.00,
     '00000003-0000-0000-0000-000000000010', TRUE, FALSE, 1),
    
    ('00000006-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
     'Agua de Horchata', 'Agua fresca de horchata', 30.00,
     '00000003-0000-0000-0000-000000000010', TRUE, TRUE, 2),
    
    -- Postres
    ('00000007-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
     'Flan Napolitano', 'Flan casero con caramelo', 45.00,
     '00000004-0000-0000-0000-000000000010', TRUE, FALSE, 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. COLECCIÓN (COMBO)
-- ============================================================================

INSERT INTO catalog.collections (
    id, business_id, name, description, type, price, original_price,
    is_available, is_featured, display_order
) VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '11111111-1111-1111-1111-111111111111',
    'Combo Familiar',
    '2 Hamburguesas Clásicas + 2 Bebidas + Papas',
    'combo',
    280.00,  -- Precio del combo
    340.00,  -- Precio si se compraran por separado (2x120 + 2x25 + 50)
    TRUE,
    TRUE,
    1
) ON CONFLICT (id) DO NOTHING;

-- Productos en la colección
INSERT INTO catalog.collection_products (
    id, collection_id, product_id, quantity, display_order
) VALUES
    ('00000001-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
     '00000003-0000-0000-0000-000000000001', 2, 1), -- 2 Hamburguesas Clásicas
    ('00000002-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
     '00000005-0000-0000-0000-000000000001', 2, 2)  -- 2 Coca Colas
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. REPARTIDOR
-- ============================================================================

INSERT INTO core.repartidores (
    id, user_id, vehicle_type, vehicle_description,
    is_available, is_verified, is_active,
    current_location, last_location_update,
    is_green_repartidor, wallet_repartidor_id
)
SELECT 
    '00000001-0000-0000-0000-000000000003',
    (SELECT user_id FROM seed_user_ids WHERE role_type = 'repartidor'),
    'bicycle',
    'Bicicleta de montaña roja',
    TRUE,
    TRUE,
    TRUE,
    ST_MakePoint(-99.1590, 19.4215)::point, -- Cerca del local
    CURRENT_TIMESTAMP,
    TRUE, -- Repartidor ecológico
    'wallet-repartidor-001'
ON CONFLICT (id) DO UPDATE SET
    is_available = EXCLUDED.is_available,
    current_location = EXCLUDED.current_location;

-- ============================================================================
-- 8. PEDIDO
-- ============================================================================

INSERT INTO orders.orders (
    id, client_id, business_id, status,
    delivery_address_id, delivery_address_text, delivery_location,
    subtotal, tax_amount, delivery_fee, discount_amount, tip_amount, total_amount,
    payment_method, payment_status, payment_transaction_id,
    estimated_delivery_time, actual_delivery_time,
    packaging_type, wallet_transaction_id,
    created_at, confirmed_at, delivered_at
)
SELECT 
    '00000001-0000-0000-0000-000000000004',
    (SELECT user_id FROM seed_user_ids WHERE role_type = 'cliente'),
    '11111111-1111-1111-1111-111111111111',
    'delivered',
    'aaaa0000-0000-0000-0000-000000000001',
    'Calle Orizaba 123, Roma Norte, CDMX, 06700',
    ST_MakePoint(-99.1619, 19.4230)::point,
    280.00,  -- Subtotal (Combo Familiar)
    44.80,   -- IVA (16%)
    30.00,   -- Costo de envío
    0.00,    -- Sin descuento
    50.00,   -- Propina
    404.80,  -- Total
    'localcoins',
    'paid',
    'wallet-txn-order-001',
    25,      -- 25 minutos estimados
    22,      -- 22 minutos reales
    'biodegradable',
    'wallet-txn-order-001',
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    CURRENT_TIMESTAMP - INTERVAL '55 minutes',
    CURRENT_TIMESTAMP - INTERVAL '38 minutes'
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. ITEMS DEL PEDIDO
-- ============================================================================

-- Item 1: Combo Familiar (colección)
INSERT INTO orders.order_items (
    id, order_id, collection_id,
    item_name, item_price, quantity, item_subtotal
) VALUES (
    '00000001-0000-0000-0000-000000000005',
    '00000001-0000-0000-0000-000000000004',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Combo Familiar',
    280.00,
    1,
    280.00
) ON CONFLICT (id) DO NOTHING;

-- Item 2: Producto individual (Flan)
INSERT INTO orders.order_items (
    id, order_id, product_id,
    item_name, item_price, quantity, item_subtotal
) VALUES (
    '00000002-0000-0000-0000-000000000005',
    '00000001-0000-0000-0000-000000000004',
    '00000007-0000-0000-0000-000000000001',
    'Flan Napolitano',
    45.00,
    1,
    45.00
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 10. ENTREGA
-- ============================================================================

INSERT INTO orders.deliveries (
    id, order_id, repartidor_id, status,
    pickup_location, delivery_location,
    distance_km, estimated_time_minutes, actual_time_minutes,
    assigned_at, picked_up_at, delivered_at
) VALUES (
    '00000001-0000-0000-0000-000000000006',
    '00000001-0000-0000-0000-000000000004',
    '00000001-0000-0000-0000-000000000003',
    'delivered',
    ST_MakePoint(-99.1600, 19.4220)::point, -- Ubicación del local
    ST_MakePoint(-99.1619, 19.4230)::point, -- Ubicación del cliente
    0.8,  -- 0.8 km de distancia
    25,   -- 25 minutos estimados
    22,   -- 22 minutos reales
    CURRENT_TIMESTAMP - INTERVAL '50 minutes',
    CURRENT_TIMESTAMP - INTERVAL '45 minutes',
    CURRENT_TIMESTAMP - INTERVAL '38 minutes'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 11. EVALUACIÓN / RESEÑA
-- ============================================================================

INSERT INTO reviews.reviews (
    id, order_id, reviewer_id,
    business_rating, repartidor_rating,
    business_comment, repartidor_comment
)
SELECT 
    '00000001-0000-0000-0000-000000000007',
    '00000001-0000-0000-0000-000000000004',
    (SELECT user_id FROM seed_user_ids WHERE role_type = 'cliente'),
    5,  -- 5 estrellas al negocio
    5,  -- 5 estrellas al repartidor
    'Excelente comida, muy rica y bien presentada. El empaque ecológico es un plus.',
    'Muy puntual y amable. Llegó en bicicleta, muy ecológico. Recomendado.'
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 12. PROPINA
-- ============================================================================

INSERT INTO reviews.tips (
    id, order_id, repartidor_id, client_id,
    amount, wallet_transaction_id
)
SELECT 
    '00000001-0000-0000-0000-000000000008',
    '00000001-0000-0000-0000-000000000004',
    '00000001-0000-0000-0000-000000000003',
    (SELECT user_id FROM seed_user_ids WHERE role_type = 'cliente'),
    50.00,
    'wallet-txn-tip-001'
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICACIÓN DE DATOS INSERTADOS
-- ============================================================================

-- ============================================================================
-- OPCIÓN 3: Crear usuarios vía SQL (SOLO para desarrollo/testing)
-- ============================================================================
-- ⚠️ ADVERTENCIA: Esto requiere permisos de service_role y solo funciona
--    en entornos de desarrollo. NO usar en producción.
--
-- Para usar esta opción, necesitas conectarte con el rol service_role
-- o usar la función auth.users_admin_create() si está disponible.
--
-- Ejemplo usando Supabase Management API (desde tu aplicación):
-- 
-- const { data, error } = await supabase.auth.admin.createUser({
--   email: 'cliente@example.com',
--   password: 'password123',
--   user_metadata: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }
-- });
--
-- O usando SQL directo (requiere permisos especiales):
--
-- INSERT INTO auth.users (
--     id, 
--     instance_id, 
--     email, 
--     encrypted_password, 
--     email_confirmed_at,
--     created_at, 
--     updated_at, 
--     raw_app_meta_data, 
--     raw_user_meta_data, 
--     is_super_admin, 
--     role,
--     aud
-- ) VALUES (
--     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
--     (SELECT id FROM auth.instances LIMIT 1),
--     'cliente@example.com',
--     crypt('password123', gen_salt('bf')),
--     NOW(),
--     NOW(),
--     NOW(),
--     '{"provider": "email", "providers": ["email"]}',
--     '{}',
--     FALSE,
--     'authenticated',
--     'authenticated'
-- );
--
-- (Repetir para repartidor@example.com y local@example.com con sus IDs)
--
-- ⚠️ RECOMENDACIÓN: Usa el Dashboard de Supabase (Opción 1) para evitar problemas

-- ============================================================================
-- VERIFICACIÓN DE DATOS INSERTADOS
-- ============================================================================

-- Verificar el ciclo completo
SELECT 
    'Ciclo de Delivery Completo' as verificacion,
    (SELECT COUNT(*) FROM core.user_profiles WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111')) as perfiles,
    (SELECT COUNT(*) FROM auth.users WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111')) as usuarios_auth,
    (SELECT COUNT(*) FROM core.businesses WHERE id = '11111111-1111-1111-1111-111111111111') as negocios,
    (SELECT COUNT(*) FROM catalog.products WHERE business_id = '11111111-1111-1111-1111-111111111111') as productos,
    (SELECT COUNT(*) FROM catalog.collections WHERE business_id = '11111111-1111-1111-1111-111111111111') as colecciones,
    (SELECT COUNT(*) FROM orders.orders WHERE id = '00000001-0000-0000-0000-000000000004') as pedidos,
    (SELECT COUNT(*) FROM orders.order_items WHERE order_id = '00000001-0000-0000-0000-000000000004') as items,
    (SELECT COUNT(*) FROM orders.deliveries WHERE order_id = '00000001-0000-0000-0000-000000000004') as entregas,
    (SELECT COUNT(*) FROM reviews.reviews WHERE order_id = '00000001-0000-0000-0000-000000000004') as evaluaciones,
    (SELECT COUNT(*) FROM reviews.tips WHERE order_id = '00000001-0000-0000-0000-000000000004') as propinas;

-- ============================================================================
-- FIN DEL SCRIPT DE CICLO COMPLETO
-- ============================================================================

