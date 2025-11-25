-- ============================================================================
-- DELIVERY ECOSYSTEM - Database Schema
-- ============================================================================
-- Descripción: Modelo de base de datos normalizado y estandarizado para
--              ecosistema de delivery hiperlocal (radio 3 km)
-- 
-- Plataforma: Supabase (PostgreSQL)
-- Autenticación: Supabase Auth (auth.users)
-- 
-- Nota: El sistema de Wallet (LocalCoins) es un proyecto separado.
--       Este schema incluye referencias externas al wallet mediante user_id.
-- ============================================================================
-- Versión: 2.0 (Supabase Auth)
-- Fecha: 2024-11-18
-- ============================================================================

-- Extensiones PostgreSQL
-- IMPORTANTE: Estas extensiones deben crearse con permisos de superusuario
-- En Supabase, estas extensiones ya están disponibles o se pueden habilitar desde el Dashboard
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public; -- Opcional: para gen_random_uuid()
-- CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA public; -- Requerido para geolocalización
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA public;

-- ============================================================================
-- SCHEMAS (Organización por dominio)
-- ============================================================================

-- Schema principal (core): Usuarios, negocios, productos, categorías
CREATE SCHEMA IF NOT EXISTS core;

-- Schema de pedidos: Pedidos, items, entregas
CREATE SCHEMA IF NOT EXISTS orders;

-- Schema de catálogo: Productos, categorías, colecciones
CREATE SCHEMA IF NOT EXISTS catalog;

-- Schema de red social: Publicaciones, likes, comentarios, perfiles ecológicos
CREATE SCHEMA IF NOT EXISTS social;

-- Schema de comercio: Promociones, suscripciones, publicidad
CREATE SCHEMA IF NOT EXISTS commerce;

-- Schema de comunicación: Notificaciones, mensajes
CREATE SCHEMA IF NOT EXISTS communication;

-- Schema de evaluaciones: Reseñas, propinas
CREATE SCHEMA IF NOT EXISTS reviews;

-- Configurar search_path para usar los schemas (public debe estar primero para las funciones de extensiones)
SET search_path TO public, core, orders, catalog, social, commerce, communication, reviews;

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Roles de usuario
CREATE TYPE user_role AS ENUM (
    'client',      -- Cliente
    'repartidor',  -- Repartidor
    'local',       -- Dueño/Gerente de local
    'admin'        -- Administrador del sistema
);

-- Estados de pedido
CREATE TYPE order_status AS ENUM (
    'pending',         -- Pendiente (creado, esperando confirmación del local)
    'confirmed',       -- Confirmado por el local
    'preparing',       -- En preparación
    'ready',           -- Listo para recoger
    'assigned',        -- Asignado a repartidor
    'picked_up',       -- Recogido por repartidor
    'in_transit',      -- En camino
    'delivered',       -- Entregado
    'cancelled',       -- Cancelado
    'refunded'         -- Reembolsado
);

-- Estados de entrega
CREATE TYPE delivery_status AS ENUM (
    'available',       -- Disponible para asignar
    'assigned',        -- Asignado a repartidor
    'picked_up',       -- Recogido
    'in_transit',      -- En camino
    'delivered',       -- Entregado
    'cancelled'         -- Cancelado
);

-- Tipos de vehículo
CREATE TYPE vehicle_type AS ENUM (
    'bicycle',         -- Bicicleta
    'electric_motorcycle', -- Moto eléctrica
    'electric_scooter',    -- Scooter eléctrico
    'hybrid_motorcycle',   -- Moto híbrida
    'traditional_motorcycle' -- Moto tradicional
);

-- Tipos de empaque
CREATE TYPE packaging_type AS ENUM (
    'biodegradable',   -- Biodegradable
    'reusable',        -- Reutilizable
    'kraft',           -- Kraft/Papel
    'traditional'      -- Tradicional
);

-- Estados de suscripción
CREATE TYPE subscription_status AS ENUM (
    'active',          -- Activa
    'cancelled',       -- Cancelada
    'expired',         -- Expirada
    'pending'          -- Pendiente de pago
);

-- Tipos de notificación
CREATE TYPE notification_type AS ENUM (
    'order_created',
    'order_confirmed',
    'order_ready',
    'order_assigned',
    'order_delivered',
    'order_cancelled',
    'message_received',
    'review_received',
    'tip_received',
    'promotion_available',
    'social_interaction',
    'system_announcement'
);

-- Estados de mensaje
CREATE TYPE message_status AS ENUM (
    'sent',            -- Enviado
    'delivered',       -- Entregado
    'read'             -- Leído
);

-- Tipos de promoción
CREATE TYPE promotion_type AS ENUM (
    'discount_percentage',  -- Descuento porcentual
    'discount_fixed',       -- Descuento fijo
    'free_delivery',        -- Envío gratis
    'buy_one_get_one',      -- Compra 1 lleva 1
    'cashback'              -- Cashback en LCs
);

-- Estados de promoción
CREATE TYPE promotion_status AS ENUM (
    'active',          -- Activa
    'scheduled',        -- Programada
    'expired',         -- Expirada
    'cancelled'         -- Cancelada
);

-- ============================================================================
-- TABLAS PRINCIPALES
-- ============================================================================

-- ============================================================================
-- SCHEMA: core
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PERFILES DE USUARIO (Relacionado con Supabase auth.users)
-- ----------------------------------------------------------------------------
-- Nota: Esta tabla extiende la información de auth.users de Supabase
--       El id debe coincidir con auth.users.id
CREATE TABLE core.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Rol del usuario en la plataforma
    role user_role NOT NULL DEFAULT 'client',
    
    -- Información personal
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20) UNIQUE,
    profile_image_url TEXT,
    
    -- Verificación adicional (email ya está verificado en auth.users)
    phone_verified BOOLEAN DEFAULT FALSE,
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    
    -- Referencia externa al Wallet (Proyecto Wallet separado)
    wallet_user_id VARCHAR(255), -- ID del usuario en el sistema Wallet (puede ser UUID o string)
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_profiles_role ON core.user_profiles(role);
CREATE INDEX idx_user_profiles_phone ON core.user_profiles(phone);
CREATE INDEX idx_user_profiles_wallet_user_id ON core.user_profiles(wallet_user_id);
CREATE INDEX idx_user_profiles_is_active ON core.user_profiles(is_active);

-- ----------------------------------------------------------------------------
-- DIRECCIONES
-- ----------------------------------------------------------------------------
CREATE TABLE core.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Información de dirección
    label VARCHAR(100), -- Casa, Trabajo, etc.
    street VARCHAR(255) NOT NULL,
    street_number VARCHAR(20),
    interior_number VARCHAR(20),
    neighborhood VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Ciudad de México',
    state VARCHAR(100) NOT NULL DEFAULT 'CDMX',
    postal_code VARCHAR(10) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'México',
    
    -- Geolocalización (PostGIS)
    location POINT, -- (longitude, latitude)
    
    -- Referencias adicionales
    additional_references TEXT, -- Referencias adicionales para encontrar el lugar
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_addresses_user_id ON core.addresses(user_id);
CREATE INDEX idx_addresses_location ON core.addresses USING GIST(location);
CREATE INDEX idx_addresses_is_default ON core.addresses(user_id, is_default) WHERE is_default = TRUE;

-- ----------------------------------------------------------------------------
-- LOCALES / NEGOCIOS
-- ----------------------------------------------------------------------------
CREATE TABLE core.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    
    -- Información del negocio
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255), -- Razón social
    description TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    
    -- Categoría
    category VARCHAR(100) NOT NULL, -- Restaurante, Café, Tienda, etc.
    tags TEXT[], -- Array de tags: ['vegano', 'orgánico', 'sin-gluten']
    
    -- Información de contacto
    phone VARCHAR(20),
    email VARCHAR(255),
    website_url TEXT,
    
    -- Dirección principal
    address_id UUID REFERENCES core.addresses(id) ON DELETE SET NULL,
    
    -- Geolocalización
    location POINT NOT NULL, -- (longitude, latitude)
    
    -- Configuración operativa
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    accepts_orders BOOLEAN DEFAULT TRUE,
    
    -- Configuración de comisiones
    commission_rate DECIMAL(5,2) DEFAULT 15.00, -- Porcentaje de comisión (15%)
    is_pilot_social BOOLEAN DEFAULT FALSE, -- Si es piloto social (5-8% comisión)
    
    -- Configuración de empaques
    uses_eco_packaging BOOLEAN DEFAULT FALSE,
    packaging_type packaging_type DEFAULT 'traditional',
    
    -- Horarios (JSON almacenado como TEXT, o usar tabla separada)
    opening_hours JSONB, -- {"monday": {"open": "09:00", "close": "22:00"}, ...}
    
    -- Métricas
    rating_average DECIMAL(3,2) DEFAULT 0.00, -- Promedio de calificaciones (0-5)
    total_reviews INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    
    -- Referencia externa al Wallet
    wallet_business_id VARCHAR(255), -- ID del negocio en el sistema Wallet (puede ser UUID o string)
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_businesses_owner_id ON core.businesses(owner_id);
CREATE INDEX idx_businesses_location ON core.businesses USING GIST(location);
CREATE INDEX idx_businesses_is_active ON core.businesses(is_active);
CREATE INDEX idx_businesses_category ON core.businesses(category);
CREATE INDEX idx_businesses_tags ON core.businesses USING GIN(tags);
CREATE INDEX idx_businesses_rating ON core.businesses(rating_average DESC);

-- ============================================================================
-- SCHEMA: catalog
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CATEGORÍAS DE PRODUCTOS
-- ----------------------------------------------------------------------------
CREATE TABLE catalog.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES core.businesses(id) ON DELETE CASCADE, -- NULL = categoría global
    
    -- Información de la categoría
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    
    -- Jerarquía (categorías padre/hijo)
    parent_category_id UUID REFERENCES catalog.product_categories(id) ON DELETE SET NULL,
    
    -- Orden de visualización
    display_order INTEGER DEFAULT 0,
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: nombre único por negocio (o global si business_id es NULL)
    UNIQUE(business_id, name)
);

CREATE INDEX idx_product_categories_business_id ON catalog.product_categories(business_id);
CREATE INDEX idx_product_categories_parent_id ON catalog.product_categories(parent_category_id);
CREATE INDEX idx_product_categories_is_active ON catalog.product_categories(is_active);

-- ----------------------------------------------------------------------------
-- PRODUCTOS / MENÚ
-- ----------------------------------------------------------------------------
CREATE TABLE catalog.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
    
    -- Información del producto
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    
    -- Precio
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    
    -- Categoría del producto (normalizada)
    category_id UUID REFERENCES catalog.product_categories(id) ON DELETE SET NULL,
    
    -- Disponibilidad
    is_available BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Opciones y variantes (JSON)
    variants JSONB, -- {"size": ["pequeño", "mediano", "grande"], "toppings": [...]}
    
    -- Información nutricional y alérgenos
    nutritional_info JSONB,
    allergens TEXT[],
    
    -- Orden de visualización
    display_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_business_id ON catalog.products(business_id);
CREATE INDEX idx_products_category_id ON catalog.products(category_id);
CREATE INDEX idx_products_is_available ON catalog.products(business_id, is_available);
CREATE INDEX idx_products_is_featured ON catalog.products(business_id, is_featured);

-- ----------------------------------------------------------------------------
-- COLECCIONES (COMBOS, MENÚS, PAQUETES)
-- ----------------------------------------------------------------------------
CREATE TYPE catalog.collection_type AS ENUM (
    'combo',           -- Combo fijo de productos
    'menu_del_dia',    -- Menú del día
    'paquete',         -- Paquete promocional
    'promocion_bundle' -- Bundle promocional
);

CREATE TABLE catalog.collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
    
    -- Información de la colección
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    
    -- Tipo de colección
    type collection_type NOT NULL DEFAULT 'combo',
    
    -- Precio
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    original_price DECIMAL(10,2), -- Precio original (si hay descuento)
    
    -- Disponibilidad
    is_available BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Fechas (para menús del día, promociones temporales)
    valid_from DATE,
    valid_until DATE,
    
    -- Orden de visualización
    display_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_collections_business_id ON catalog.collections(business_id);
CREATE INDEX idx_collections_type ON catalog.collections(type);
CREATE INDEX idx_collections_is_available ON catalog.collections(business_id, is_available);
CREATE INDEX idx_collections_valid_dates ON catalog.collections(valid_from, valid_until);

-- ----------------------------------------------------------------------------
-- PRODUCTOS EN COLECCIONES (Relación muchos-a-muchos)
-- ----------------------------------------------------------------------------
CREATE TABLE catalog.collection_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES catalog.collections(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    
    -- Cantidad del producto en la colección
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    
    -- Precio específico en esta colección (opcional, si difiere del precio normal)
    price_override DECIMAL(10,2),
    
    -- Orden de visualización dentro de la colección
    display_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Un producto puede aparecer múltiples veces en una colección (con diferentes cantidades)
    -- pero evitamos duplicados exactos
    UNIQUE(collection_id, product_id, quantity)
);

CREATE INDEX idx_collection_products_collection_id ON catalog.collection_products(collection_id);
CREATE INDEX idx_collection_products_product_id ON catalog.collection_products(product_id);

-- ============================================================================
-- SCHEMA: orders
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PEDIDOS
-- ----------------------------------------------------------------------------
CREATE TABLE orders.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relaciones principales
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE RESTRICT,
    
    -- Estado
    status order_status NOT NULL DEFAULT 'pending',
    
    -- Direcciones
    delivery_address_id UUID REFERENCES core.addresses(id) ON DELETE SET NULL,
    delivery_address_text TEXT, -- Dirección completa como texto
    
    -- Geolocalización de entrega
    delivery_location POINT,
    
    -- Montos
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    tax_amount DECIMAL(10,2) DEFAULT 0.00 CHECK (tax_amount >= 0), -- IVA
    delivery_fee DECIMAL(10,2) DEFAULT 0.00 CHECK (delivery_fee >= 0),
    discount_amount DECIMAL(10,2) DEFAULT 0.00 CHECK (discount_amount >= 0),
    tip_amount DECIMAL(10,2) DEFAULT 0.00 CHECK (tip_amount >= 0),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    
    -- Pago
    payment_method VARCHAR(50), -- 'localcoins', 'card', 'cash'
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
    payment_transaction_id VARCHAR(255), -- ID de transacción del Wallet o fintech
    
    -- Información de entrega
    estimated_delivery_time INTEGER, -- Minutos estimados
    actual_delivery_time INTEGER, -- Minutos reales
    delivery_notes TEXT, -- Notas especiales para la entrega
    
    -- Empaque
    packaging_type packaging_type DEFAULT 'traditional',
    
    -- Referencias externas
    wallet_transaction_id VARCHAR(255), -- ID de transacción en el Wallet (puede ser UUID o string)
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT
);

CREATE INDEX idx_orders_client_id ON orders.orders(client_id);
CREATE INDEX idx_orders_business_id ON orders.orders(business_id);
CREATE INDEX idx_orders_status ON orders.orders(status);
CREATE INDEX idx_orders_created_at ON orders.orders(created_at DESC);
CREATE INDEX idx_orders_delivery_location ON orders.orders USING GIST(delivery_location);
CREATE INDEX idx_orders_payment_status ON orders.orders(payment_status);

-- ----------------------------------------------------------------------------
-- ITEMS DE PEDIDO
-- ----------------------------------------------------------------------------
CREATE TABLE orders.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
    
    -- Relación: puede ser un producto individual O una colección
    product_id UUID REFERENCES catalog.products(id) ON DELETE SET NULL,
    collection_id UUID REFERENCES catalog.collections(id) ON DELETE SET NULL,
    
    -- Constraint: debe ser producto O colección, no ambos ni ninguno
    CONSTRAINT order_items_item_check CHECK (
        (product_id IS NOT NULL AND collection_id IS NULL) OR
        (product_id IS NULL AND collection_id IS NOT NULL)
    ),
    
    -- Información del item (snapshot al momento del pedido)
    item_name VARCHAR(255) NOT NULL, -- Nombre del producto o colección
    item_price DECIMAL(10,2) NOT NULL CHECK (item_price >= 0),
    
    -- Cantidad y variantes
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    variant_selection JSONB, -- Selección de variantes del producto (solo para productos)
    
    -- Montos
    item_subtotal DECIMAL(10,2) NOT NULL CHECK (item_subtotal >= 0),
    
    -- Notas especiales
    special_instructions TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order_id ON orders.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON orders.order_items(product_id);
CREATE INDEX idx_order_items_collection_id ON orders.order_items(collection_id);

-- ----------------------------------------------------------------------------
-- REPARTIDORES
-- ----------------------------------------------------------------------------
CREATE TABLE core.repartidores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Información del repartidor
    vehicle_type vehicle_type NOT NULL,
    vehicle_description VARCHAR(255), -- Marca, modelo, color
    license_plate VARCHAR(20),
    
    -- Documentación
    id_document_url TEXT, -- URL de identificación oficial
    license_document_url TEXT, -- URL de licencia de conducir
    
    -- Estado operativo
    is_available BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Ubicación actual
    current_location POINT,
    last_location_update TIMESTAMP,
    
    -- Métricas
    total_deliveries INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    
    -- Configuración ecológica
    is_green_repartidor BOOLEAN DEFAULT FALSE, -- Repartidor ecológico (bicicleta, eléctrico)
    
    -- Referencia externa al Wallet
    wallet_repartidor_id VARCHAR(255), -- ID del repartidor en el sistema Wallet (puede ser UUID o string)
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_repartidores_user_id ON core.repartidores(user_id);
CREATE INDEX idx_repartidores_is_available ON core.repartidores(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_repartidores_current_location ON core.repartidores USING GIST(current_location);
CREATE INDEX idx_repartidores_is_green ON core.repartidores(is_green_repartidor);

-- ----------------------------------------------------------------------------
-- ENTREGAS
-- ----------------------------------------------------------------------------
CREATE TABLE orders.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders.orders(id) ON DELETE CASCADE,
    repartidor_id UUID REFERENCES core.repartidores(id) ON DELETE SET NULL,
    
    -- Estado
    status delivery_status NOT NULL DEFAULT 'available',
    
    -- Ubicaciones
    pickup_location POINT NOT NULL, -- Ubicación del local
    delivery_location POINT NOT NULL, -- Ubicación de entrega
    
    -- Distancia y tiempo
    distance_km DECIMAL(8,2), -- Distancia en kilómetros
    estimated_time_minutes INTEGER,
    actual_time_minutes INTEGER,
    
    -- Información de entrega
    pickup_instructions TEXT,
    delivery_instructions TEXT,
    
    -- Timestamps
    assigned_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    delivered_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deliveries_order_id ON orders.deliveries(order_id);
CREATE INDEX idx_deliveries_repartidor_id ON orders.deliveries(repartidor_id);
CREATE INDEX idx_deliveries_status ON orders.deliveries(status);
CREATE INDEX idx_deliveries_pickup_location ON orders.deliveries USING GIST(pickup_location);
CREATE INDEX idx_deliveries_delivery_location ON orders.deliveries USING GIST(delivery_location);

-- ============================================================================
-- SCHEMA: reviews
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EVALUACIONES / RESEÑAS
-- ----------------------------------------------------------------------------
CREATE TABLE reviews.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relaciones
    order_id UUID NOT NULL UNIQUE REFERENCES orders.orders(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    
    -- Tipos de evaluación
    business_rating INTEGER CHECK (business_rating >= 1 AND business_rating <= 5),
    repartidor_rating INTEGER CHECK (repartidor_rating >= 1 AND repartidor_rating <= 5),
    
    -- Comentarios
    business_comment TEXT,
    repartidor_comment TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_order_id ON reviews.reviews(order_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews.reviews(reviewer_id);
CREATE INDEX idx_reviews_business_rating ON reviews.reviews(business_rating);
CREATE INDEX idx_reviews_repartidor_rating ON reviews.reviews(repartidor_rating);

-- ----------------------------------------------------------------------------
-- PROPINAS
-- ----------------------------------------------------------------------------
CREATE TABLE reviews.tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
    repartidor_id UUID NOT NULL REFERENCES core.repartidores(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    
    -- Monto
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    
    -- Referencia externa al Wallet
    wallet_transaction_id VARCHAR(255), -- ID de transacción en el Wallet (puede ser UUID o string)
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tips_order_id ON reviews.tips(order_id);
CREATE INDEX idx_tips_repartidor_id ON reviews.tips(repartidor_id);
CREATE INDEX idx_tips_client_id ON reviews.tips(client_id);

-- ============================================================================
-- SCHEMA: communication
-- ============================================================================

-- ----------------------------------------------------------------------------
-- NOTIFICACIONES
-- ----------------------------------------------------------------------------
CREATE TABLE communication.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Tipo y contenido
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Datos adicionales (order_id, etc.)
    
    -- Estado
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON communication.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON communication.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON communication.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_type ON communication.notifications(type);

-- ----------------------------------------------------------------------------
-- MENSAJES / CHAT
-- ----------------------------------------------------------------------------
CREATE TABLE communication.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relaciones (chat entre usuarios)
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    
    -- Contexto (opcional, puede ser relacionado a un pedido)
    order_id UUID REFERENCES orders.orders(id) ON DELETE SET NULL,
    
    -- Contenido
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'location'
    attachment_url TEXT,
    
    -- Estado
    status message_status DEFAULT 'sent',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

CREATE INDEX idx_messages_sender_id ON communication.messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON communication.messages(recipient_id);
CREATE INDEX idx_messages_order_id ON communication.messages(order_id);
CREATE INDEX idx_messages_created_at ON communication.messages(created_at DESC);

-- ============================================================================
-- SCHEMA: commerce
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PROMOCIONES
-- ----------------------------------------------------------------------------
CREATE TABLE commerce.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES core.businesses(id) ON DELETE CASCADE,
    
    -- Información
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    
    -- Tipo y configuración
    type promotion_type NOT NULL,
    discount_value DECIMAL(10,2), -- Valor del descuento o cashback
    discount_percentage DECIMAL(5,2), -- Porcentaje de descuento
    
    -- Condiciones
    minimum_order_amount DECIMAL(10,2),
    maximum_discount_amount DECIMAL(10,2),
    max_uses_per_user INTEGER,
    total_max_uses INTEGER,
    
    -- Fechas
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    
    -- Estado
    status promotion_status DEFAULT 'scheduled',
    
    -- Código de promoción (opcional)
    promo_code VARCHAR(50) UNIQUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_promotions_business_id ON commerce.promotions(business_id);
CREATE INDEX idx_promotions_status ON commerce.promotions(status);
CREATE INDEX idx_promotions_dates ON commerce.promotions(start_date, end_date);
CREATE INDEX idx_promotions_promo_code ON commerce.promotions(promo_code);

-- ----------------------------------------------------------------------------
-- USO DE PROMOCIONES
-- ----------------------------------------------------------------------------
CREATE TABLE commerce.promotion_uses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL REFERENCES commerce.promotions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES orders.orders(id) ON DELETE SET NULL,
    
    -- Monto aplicado
    discount_applied DECIMAL(10,2) NOT NULL,
    
    -- Metadata
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_promotion_uses_promotion_id ON commerce.promotion_uses(promotion_id);
CREATE INDEX idx_promotion_uses_user_id ON commerce.promotion_uses(user_id);
CREATE INDEX idx_promotion_uses_order_id ON commerce.promotion_uses(order_id);

-- ----------------------------------------------------------------------------
-- SUSCRIPCIONES PREMIUM
-- ----------------------------------------------------------------------------
CREATE TABLE commerce.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Tipo de suscripción
    subscription_type VARCHAR(50) NOT NULL, -- 'client_premium', 'local_premium', 'repartidor_premium'
    
    -- Estado
    status subscription_status NOT NULL DEFAULT 'pending',
    
    -- Fechas
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    -- Monto
    monthly_price DECIMAL(10,2) NOT NULL,
    
    -- Referencia externa al Wallet
    wallet_subscription_id VARCHAR(255), -- ID de suscripción en el Wallet (puede ser UUID o string)
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_user_id ON commerce.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON commerce.subscriptions(status);
CREATE INDEX idx_subscriptions_type ON commerce.subscriptions(subscription_type);

-- ----------------------------------------------------------------------------
-- PUBLICIDAD / ADS INTERNOS
-- ----------------------------------------------------------------------------
CREATE TABLE commerce.ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
    
    -- Tipo de anuncio
    ad_type VARCHAR(50) NOT NULL, -- 'banner', 'featured', 'positioning'
    
    -- Contenido
    title VARCHAR(255),
    description TEXT,
    image_url TEXT,
    link_url TEXT,
    
    -- Configuración
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Posicionamiento
    position INTEGER, -- Orden de visualización
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ads_business_id ON commerce.ads(business_id);
CREATE INDEX idx_ads_is_active ON commerce.ads(is_active);
CREATE INDEX idx_ads_dates ON commerce.ads(start_date, end_date);

-- ============================================================================
-- RED SOCIAL ECOLÓGICA
-- ============================================================================

-- ============================================================================
-- SCHEMA: social
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PUBLICACIONES SOCIALES
-- ----------------------------------------------------------------------------
CREATE TABLE social.social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Contexto (opcional, relacionado a un pedido)
    order_id UUID REFERENCES orders.orders(id) ON DELETE SET NULL,
    
    -- Contenido
    content TEXT,
    media_type VARCHAR(50) NOT NULL, -- 'photo', 'video'
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    
    -- Tags ecológicos (automáticos)
    co2_saved_kg DECIMAL(8,3) DEFAULT 0.000, -- CO₂ evitado en kg
    plastic_saved_g DECIMAL(8,2) DEFAULT 0.00, -- Plástico evitado en gramos
    tags TEXT[], -- Array de hashtags: ['#0EmisionesCO2', '#SinPlástico', ...]
    
    -- Métricas de engagement
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    
    -- Estado
    is_visible BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_social_posts_user_id ON social.social_posts(user_id);
CREATE INDEX idx_social_posts_order_id ON social.social_posts(order_id);
CREATE INDEX idx_social_posts_created_at ON social.social_posts(created_at DESC);
CREATE INDEX idx_social_posts_tags ON social.social_posts USING GIN(tags);
CREATE INDEX idx_social_posts_is_visible ON social.social_posts(is_visible) WHERE is_visible = TRUE;

-- ----------------------------------------------------------------------------
-- LIKES EN PUBLICACIONES
-- ----------------------------------------------------------------------------
CREATE TABLE social.social_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES social.social_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(post_id, user_id) -- Un usuario solo puede dar like una vez
);

CREATE INDEX idx_social_likes_post_id ON social.social_likes(post_id);
CREATE INDEX idx_social_likes_user_id ON social.social_likes(user_id);

-- ----------------------------------------------------------------------------
-- COMENTARIOS EN PUBLICACIONES
-- ----------------------------------------------------------------------------
CREATE TABLE social.social_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES social.social_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES social.social_comments(id) ON DELETE CASCADE, -- Para respuestas
    
    -- Contenido
    content TEXT NOT NULL,
    
    -- Estado
    is_visible BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_social_comments_post_id ON social.social_comments(post_id);
CREATE INDEX idx_social_comments_user_id ON social.social_comments(user_id);
CREATE INDEX idx_social_comments_parent_comment_id ON social.social_comments(parent_comment_id);

-- ----------------------------------------------------------------------------
-- SEGUIDORES (FOLLOWERS)
-- ----------------------------------------------------------------------------
CREATE TABLE social.social_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(follower_id, following_id), -- Un usuario solo puede seguir a otro una vez
    CHECK (follower_id != following_id) -- No se puede seguir a sí mismo
);

CREATE INDEX idx_social_follows_follower_id ON social.social_follows(follower_id);
CREATE INDEX idx_social_follows_following_id ON social.social_follows(following_id);

-- ----------------------------------------------------------------------------
-- PERFIL ECOLÓGICO DEL USUARIO
-- ----------------------------------------------------------------------------
CREATE TABLE social.user_eco_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Métricas acumuladas
    total_co2_saved_kg DECIMAL(10,3) DEFAULT 0.000,
    total_plastic_saved_g DECIMAL(10,2) DEFAULT 0.00,
    total_eco_orders INTEGER DEFAULT 0,
    
    -- Badges y logros
    badges TEXT[], -- Array de badges obtenidos
    current_level VARCHAR(50) DEFAULT 'bronze', -- bronze, silver, gold, platinum
    
    -- Streak (racha)
    current_streak_days INTEGER DEFAULT 0,
    longest_streak_days INTEGER DEFAULT 0,
    last_eco_order_date DATE,
    
    -- Ranking
    neighborhood_rank INTEGER,
    city_rank INTEGER,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_eco_profile_user_id ON social.user_eco_profile(user_id);
CREATE INDEX idx_user_eco_profile_current_level ON social.user_eco_profile(current_level);
CREATE INDEX idx_user_eco_profile_total_co2 ON social.user_eco_profile(total_co2_saved_kg DESC);

-- ============================================================================
-- TRIGGERS Y FUNCIONES
-- ============================================================================

-- Función para crear perfil automáticamente cuando se crea un usuario en Supabase
-- Esta función debe ejecutarse como trigger en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO core.user_profiles (id, role, is_active)
    VALUES (NEW.id, 'client', TRUE)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nota: El trigger debe crearse manualmente en Supabase Dashboard o ejecutar:
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a tablas con updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON core.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON core.businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON catalog.product_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON catalog.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON catalog.collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders.orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repartidores_updated_at BEFORE UPDATE ON core.repartidores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON orders.deliveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews.reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON commerce.promotions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON commerce.subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ads_updated_at BEFORE UPDATE ON commerce.ads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_posts_updated_at BEFORE UPDATE ON social.social_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_comments_updated_at BEFORE UPDATE ON social.social_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_eco_profile_updated_at BEFORE UPDATE ON social.user_eco_profile
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar rating promedio de negocios
CREATE OR REPLACE FUNCTION update_business_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE core.businesses
    SET 
        rating_average = (
            SELECT AVG(business_rating)::DECIMAL(3,2)
            FROM reviews.reviews
            WHERE order_id IN (
                SELECT id FROM orders.orders WHERE business_id = (
                    SELECT business_id FROM orders.orders WHERE id = NEW.order_id
                )
            )
            AND business_rating IS NOT NULL
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews.reviews
            WHERE order_id IN (
                SELECT id FROM orders.orders WHERE business_id = (
                    SELECT business_id FROM orders.orders WHERE id = NEW.order_id
                )
            )
            AND business_rating IS NOT NULL
            )
    WHERE id = (SELECT business_id FROM orders.orders WHERE id = NEW.order_id);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_business_rating_trigger
    AFTER INSERT OR UPDATE ON reviews.reviews
    FOR EACH ROW
    WHEN (NEW.business_rating IS NOT NULL)
    EXECUTE FUNCTION update_business_rating();

-- Función para actualizar rating promedio de repartidores
CREATE OR REPLACE FUNCTION update_repartidor_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE core.repartidores
    SET 
        rating_average = (
            SELECT AVG(repartidor_rating)::DECIMAL(3,2)
            FROM reviews.reviews
            WHERE order_id IN (
                SELECT id FROM orders.orders WHERE id IN (
                    SELECT order_id FROM orders.deliveries WHERE repartidor_id = (
                        SELECT repartidor_id FROM orders.deliveries WHERE order_id = NEW.order_id
                    )
                )
            )
            AND repartidor_rating IS NOT NULL
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews.reviews
            WHERE order_id IN (
                SELECT id FROM orders.orders WHERE id IN (
                    SELECT order_id FROM orders.deliveries WHERE repartidor_id = (
                        SELECT repartidor_id FROM orders.deliveries WHERE order_id = NEW.order_id
                    )
                )
            )
            AND repartidor_rating IS NOT NULL
        )
    WHERE id = (SELECT repartidor_id FROM orders.deliveries WHERE order_id = NEW.order_id);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_repartidor_rating_trigger
    AFTER INSERT OR UPDATE ON reviews.reviews
    FOR EACH ROW
    WHEN (NEW.repartidor_rating IS NOT NULL)
    EXECUTE FUNCTION update_repartidor_rating();

-- Función para actualizar contadores de likes/comentarios en posts
CREATE OR REPLACE FUNCTION update_social_post_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF TG_TABLE_NAME = 'social_likes' THEN
            UPDATE social.social_posts
            SET likes_count = likes_count + 1
            WHERE id = NEW.post_id;
        ELSIF TG_TABLE_NAME = 'social_comments' THEN
            UPDATE social.social_posts
            SET comments_count = comments_count + 1
            WHERE id = NEW.post_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF TG_TABLE_NAME = 'social_likes' THEN
            UPDATE social.social_posts
            SET likes_count = GREATEST(0, likes_count - 1)
            WHERE id = OLD.post_id;
        ELSIF TG_TABLE_NAME = 'social_comments' THEN
            UPDATE social.social_posts
            SET comments_count = GREATEST(0, comments_count - 1)
            WHERE id = OLD.post_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER update_social_post_likes_count
    AFTER INSERT OR DELETE ON social.social_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_social_post_counts();

CREATE TRIGGER update_social_post_comments_count
    AFTER INSERT OR DELETE ON social.social_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_social_post_counts();

-- ============================================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================================================

COMMENT ON SCHEMA core IS 'Schema principal: usuarios, negocios, repartidores, direcciones';
COMMENT ON SCHEMA catalog IS 'Schema de catálogo: productos, categorías, colecciones';
COMMENT ON SCHEMA orders IS 'Schema de pedidos: órdenes, items, entregas';
COMMENT ON SCHEMA reviews IS 'Schema de evaluaciones: reseñas, propinas';
COMMENT ON SCHEMA communication IS 'Schema de comunicación: notificaciones, mensajes';
COMMENT ON SCHEMA commerce IS 'Schema de comercio: promociones, suscripciones, publicidad';
COMMENT ON SCHEMA social IS 'Schema de red social ecológica: posts, likes, comentarios, perfiles';

COMMENT ON TABLE core.user_profiles IS 'Perfiles de usuario que extienden auth.users de Supabase (roles, información personal)';
COMMENT ON TABLE core.businesses IS 'Locales/negocios registrados en la plataforma';
COMMENT ON TABLE core.repartidores IS 'Información específica de repartidores';
COMMENT ON TABLE core.addresses IS 'Direcciones de usuarios con geolocalización';
COMMENT ON TABLE catalog.product_categories IS 'Categorías de productos (normalizadas, con jerarquía)';
COMMENT ON TABLE catalog.products IS 'Productos del menú de cada local';
COMMENT ON TABLE catalog.collections IS 'Colecciones de productos (combos, menús del día, paquetes)';
COMMENT ON TABLE catalog.collection_products IS 'Relación muchos-a-muchos entre colecciones y productos';
COMMENT ON TABLE orders.orders IS 'Pedidos realizados por clientes';
COMMENT ON TABLE orders.order_items IS 'Items individuales dentro de un pedido (productos o colecciones)';
COMMENT ON TABLE orders.deliveries IS 'Entregas asignadas a repartidores';
COMMENT ON TABLE reviews.reviews IS 'Evaluaciones y reseñas de clientes';
COMMENT ON TABLE reviews.tips IS 'Propinas dadas a repartidores';
COMMENT ON TABLE communication.notifications IS 'Notificaciones push del sistema';
COMMENT ON TABLE communication.messages IS 'Mensajes de chat entre usuarios';
COMMENT ON TABLE commerce.promotions IS 'Promociones y ofertas de locales';
COMMENT ON TABLE commerce.promotion_uses IS 'Historial de uso de promociones';
COMMENT ON TABLE commerce.subscriptions IS 'Suscripciones premium de usuarios';
COMMENT ON TABLE commerce.ads IS 'Publicidad interna de locales';
COMMENT ON TABLE social.social_posts IS 'Publicaciones en la red social ecológica';
COMMENT ON TABLE social.social_likes IS 'Likes en publicaciones sociales';
COMMENT ON TABLE social.social_comments IS 'Comentarios en publicaciones sociales';
COMMENT ON TABLE social.social_follows IS 'Relaciones de seguimiento entre usuarios';
COMMENT ON TABLE social.user_eco_profile IS 'Perfil ecológico y métricas de impacto de usuarios';

COMMENT ON COLUMN core.user_profiles.wallet_user_id IS 'Referencia externa al sistema Wallet (proyecto separado)';
COMMENT ON COLUMN core.businesses.wallet_business_id IS 'Referencia externa al sistema Wallet (proyecto separado)';
COMMENT ON COLUMN core.repartidores.wallet_repartidor_id IS 'Referencia externa al sistema Wallet (proyecto separado)';
COMMENT ON COLUMN orders.orders.wallet_transaction_id IS 'Referencia externa a transacción en el Wallet';
COMMENT ON COLUMN reviews.tips.wallet_transaction_id IS 'Referencia externa a transacción en el Wallet';
COMMENT ON COLUMN commerce.subscriptions.wallet_subscription_id IS 'Referencia externa a suscripción en el Wallet';

-- ============================================================================
-- FIN DEL SCHEMA
-- ============================================================================

