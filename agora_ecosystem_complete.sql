-- ============================================================================
-- AGORA ECOSYSTEM - SCRIPT COMPLETO PARA SUPABASE
-- ============================================================================
-- 
-- INSTRUCCIONES:
-- 1. Copia TODO este archivo completo
-- 2. Pégalo en el SQL Editor de Supabase (supabase.com)
-- 3. Ejecuta el script completo
-- 
-- Este script incluye:
-- - Schema base completo
-- - Sistema de API Keys
-- - Catálogo de categorías de negocios
-- - Sistema de regiones de servicio
-- - Roles de negocio y múltiples tiendas
-- - Sistema avanzado de catálogos
-- - Sistema de impuestos
-- - Sistema de carrito de compras
-- 
-- IMPORTANTE: Asegúrate de que PostGIS esté habilitado en Supabase
-- Dashboard > Database > Extensions > PostGIS
-- ============================================================================
-- Versión: 2.1 (AGORA - Refacciones)
-- Fecha: 2025-01-XX
-- ============================================================================

-- ============================================================================
-- SECCIÓN 1: SCHEMA BASE
-- ============================================================================
-- AGORA ECOSYSTEM - Database Schema
-- ============================================================================
-- Descripción: Modelo de base de datos normalizado y estandarizado para
--              ecosistema de delivery hiperlocal (radio 3 km)
--              Plataforma AGORA - Venta de refacciones y productos en línea
-- 
-- Plataforma: Supabase (PostgreSQL)
-- Autenticación: Supabase Auth (auth.users)
-- 
-- Nota: El sistema de Wallet (LocalCoins) es un proyecto separado.
--       Este schema incluye referencias externas al wallet mediante user_id.
-- ============================================================================
-- Versión: 2.1 (AGORA - Refacciones)
-- Fecha: 2025-01-XX
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
--- Implementado hhasta aqui
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
--- Implementado hhasta aqui
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
    slug VARCHAR(120) NOT NULL,
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
    UNIQUE(business_id, name),
    UNIQUE(business_id, slug)
);

CREATE INDEX idx_product_categories_business_id ON catalog.product_categories(business_id);
CREATE INDEX idx_product_categories_parent_id ON catalog.product_categories(parent_category_id);
CREATE INDEX idx_product_categories_is_active ON catalog.product_categories(is_active);

-- ----------------------------------------------------------------------------
-- CLASIFICACIONES DE PRODUCTOS (por sucursal)
-- ----------------------------------------------------------------------------
-- Clasificaciones internas por sucursal. No afecta las categorías globales.
CREATE TABLE IF NOT EXISTS catalog.product_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES core.businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_id, name),
    UNIQUE(business_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_product_classifications_business_id ON catalog.product_classifications(business_id);

-- RelaciÃ³n producto-clasificaciÃ³n por sucursal
CREATE TABLE IF NOT EXISTS catalog.product_classification_assignments (
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    classification_id UUID NOT NULL REFERENCES catalog.product_classifications(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, classification_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_pca_business ON catalog.product_classification_assignments(business_id);

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
    type catalog.collection_type NOT NULL DEFAULT 'combo',
    
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

-- ============================================================================
-- ESQUEMA DE API KEYS Y TRACKING DE PETICIONES
-- ============================================================================
-- Descripción: Sistema de autenticación por API Keys para aplicaciones
--              separado de la autenticación de usuarios
-- 
-- Uso: Ejecutar este script después de crear el schema principal
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2024-11-13
-- ============================================================================

-- Configurar search_path
SET search_path TO public, core, commerce;

-- ============================================================================
-- TABLA: API APPLICATIONS
-- ============================================================================
-- Almacena información de las aplicaciones que consumen la API

CREATE TABLE IF NOT EXISTS core.api_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    app_type VARCHAR(50) NOT NULL, -- 'mobile-client', 'mobile-repartidor', 'web-local', 'web-admin', 'external'
    platform VARCHAR(50), -- 'ios', 'android', 'web', 'desktop'
    version VARCHAR(50), -- Versión de la app
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id), -- Usuario que creó la aplicación
    metadata JSONB, -- Información adicional (URL, contactos, etc.)
    
    CONSTRAINT api_applications_name_unique UNIQUE (name)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_api_applications_app_type ON core.api_applications(app_type);
CREATE INDEX IF NOT EXISTS idx_api_applications_is_active ON core.api_applications(is_active);
CREATE INDEX IF NOT EXISTS idx_api_applications_created_by ON core.api_applications(created_by);

-- ============================================================================
-- TABLA: API KEYS
-- ============================================================================
-- Almacena las API Keys para autenticación de aplicaciones

CREATE TABLE IF NOT EXISTS core.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES core.api_applications(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL, -- Hash de la API key (SHA-256)
    key_prefix VARCHAR(20) NOT NULL, -- Primeros caracteres para identificación (ej: "loca_abc123...")
    name VARCHAR(255) NOT NULL, -- Nombre descriptivo de la key
    description TEXT,
    scopes TEXT[], -- Permisos/alcances de la key (ej: ['read:orders', 'write:orders'])
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP, -- Fecha de expiración (NULL = sin expiración)
    last_used_at TIMESTAMP, -- Última vez que se usó
    usage_count BIGINT DEFAULT 0, -- Contador de usos
    rate_limit_per_minute INTEGER DEFAULT 100, -- Límite de requests por minuto
    rate_limit_per_hour INTEGER DEFAULT 1000, -- Límite de requests por hora
    rate_limit_per_day INTEGER DEFAULT 10000, -- Límite de requests por día
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    revoked_at TIMESTAMP, -- Fecha de revocación
    revoked_reason TEXT,
    
    CONSTRAINT api_keys_key_hash_unique UNIQUE (key_hash),
    CONSTRAINT api_keys_key_prefix_unique UNIQUE (key_prefix)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_api_keys_application_id ON core.api_keys(application_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON core.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON core.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON core.api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON core.api_keys(expires_at);

-- ============================================================================
-- TABLA: API REQUEST LOGS
-- ============================================================================
-- Registro de todas las peticiones a la API para estadísticas y auditoría

CREATE TABLE IF NOT EXISTS core.api_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES core.api_keys(id) ON DELETE SET NULL,
    application_id UUID REFERENCES core.api_applications(id) ON DELETE SET NULL,
    method VARCHAR(10) NOT NULL, -- GET, POST, PUT, DELETE, etc.
    endpoint VARCHAR(500) NOT NULL, -- Ruta del endpoint
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER, -- Tiempo de respuesta en milisegundos
    request_size_bytes INTEGER, -- Tamaño del request
    response_size_bytes INTEGER, -- Tamaño de la respuesta
    ip_address INET, -- IP de origen
    user_agent TEXT, -- User agent del cliente
    request_body JSONB, -- Body del request (opcional, para debugging)
    response_body JSONB, -- Body de la respuesta (opcional, para debugging)
    error_message TEXT, -- Mensaje de error si hubo
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Campos adicionales para análisis
    country_code VARCHAR(2), -- Código de país (si se puede determinar)
    city VARCHAR(100), -- Ciudad (si se puede determinar)
    device_type VARCHAR(50), -- 'mobile', 'desktop', 'tablet', 'unknown'
    
    CONSTRAINT api_request_logs_status_code_check CHECK (status_code >= 100 AND status_code < 600)
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_api_request_logs_api_key_id ON core.api_request_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_application_id ON core.api_request_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_created_at ON core.api_request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_endpoint ON core.api_request_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_status_code ON core.api_request_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_method ON core.api_request_logs(method);

-- Índice compuesto para estadísticas por aplicación y fecha
CREATE INDEX IF NOT EXISTS idx_api_request_logs_app_date ON core.api_request_logs(application_id, created_at DESC);

-- ============================================================================
-- TABLA: API RATE LIMITS
-- ============================================================================
-- Tracking de rate limits por API key (para control en tiempo real)

CREATE TABLE IF NOT EXISTS core.api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES core.api_keys(id) ON DELETE CASCADE,
    window_type VARCHAR(20) NOT NULL, -- 'minute', 'hour', 'day'
    window_start TIMESTAMP NOT NULL, -- Inicio de la ventana de tiempo
    request_count INTEGER DEFAULT 0, -- Contador de requests en esta ventana
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT api_rate_limits_unique UNIQUE (api_key_id, window_type, window_start)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_api_key_id ON core.api_rate_limits(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window ON core.api_rate_limits(window_type, window_start);

-- ============================================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_api_applications_updated_at
    BEFORE UPDATE ON core.api_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON core.api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar last_used_at y usage_count en api_keys
CREATE OR REPLACE FUNCTION update_api_key_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.api_key_id IS NOT NULL THEN
        UPDATE core.api_keys
        SET 
            last_used_at = CURRENT_TIMESTAMP,
            usage_count = usage_count + 1
        WHERE id = NEW.api_key_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar uso de API key cuando se registra un request
CREATE TRIGGER update_api_key_usage_on_request
    AFTER INSERT ON core.api_request_logs
    FOR EACH ROW
    WHEN (NEW.api_key_id IS NOT NULL)
    EXECUTE FUNCTION update_api_key_usage();

-- ============================================================================
-- VISTAS ÚTILES
-- ============================================================================

-- Vista: Estadísticas de uso por aplicación
CREATE OR REPLACE VIEW core.api_application_stats AS
SELECT 
    aa.id AS application_id,
    aa.name AS application_name,
    aa.app_type,
    COUNT(DISTINCT ak.id) AS total_api_keys,
    COUNT(DISTINCT CASE WHEN ak.is_active THEN ak.id END) AS active_api_keys,
    COUNT(arl.id) AS total_requests,
    COUNT(CASE WHEN arl.created_at >= CURRENT_DATE THEN arl.id END) AS requests_today,
    COUNT(CASE WHEN arl.created_at >= DATE_TRUNC('hour', CURRENT_TIMESTAMP) THEN arl.id END) AS requests_last_hour,
    AVG(arl.response_time_ms) AS avg_response_time_ms,
    COUNT(CASE WHEN arl.status_code >= 400 THEN 1 END) AS error_count,
    ROUND(
        COUNT(CASE WHEN arl.status_code >= 400 THEN 1 END)::NUMERIC / 
        NULLIF(COUNT(arl.id), 0) * 100, 
        2
    ) AS error_rate_percentage,
    MAX(arl.created_at) AS last_request_at
FROM core.api_applications aa
LEFT JOIN core.api_keys ak ON ak.application_id = aa.id
LEFT JOIN core.api_request_logs arl ON arl.application_id = aa.id
GROUP BY aa.id, aa.name, aa.app_type;

-- Vista: Estadísticas de uso por API key
CREATE OR REPLACE VIEW core.api_key_stats AS
SELECT 
    ak.id AS api_key_id,
    ak.key_prefix,
    ak.name AS key_name,
    aa.name AS application_name,
    ak.usage_count,
    ak.last_used_at,
    COUNT(arl.id) AS total_requests,
    COUNT(CASE WHEN arl.created_at >= CURRENT_DATE THEN arl.id END) AS requests_today,
    AVG(arl.response_time_ms) AS avg_response_time_ms,
    COUNT(CASE WHEN arl.status_code >= 400 THEN 1 END) AS error_count,
    MAX(arl.created_at) AS last_request_at
FROM core.api_keys ak
LEFT JOIN core.api_applications aa ON aa.id = ak.application_id
LEFT JOIN core.api_request_logs arl ON arl.api_key_id = ak.id
GROUP BY ak.id, ak.key_prefix, ak.name, aa.name, ak.usage_count, ak.last_used_at;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON TABLE core.api_applications IS 'Aplicaciones que consumen la API';
COMMENT ON TABLE core.api_keys IS 'API Keys para autenticación de aplicaciones';
COMMENT ON TABLE core.api_request_logs IS 'Log de todas las peticiones a la API para estadísticas';
COMMENT ON TABLE core.api_rate_limits IS 'Tracking de rate limits por API key';

COMMENT ON COLUMN core.api_keys.key_hash IS 'Hash SHA-256 de la API key (nunca almacenar la key en texto plano)';
COMMENT ON COLUMN core.api_keys.key_prefix IS 'Primeros caracteres de la key para identificación (ej: "loca_abc123")';
COMMENT ON COLUMN core.api_keys.scopes IS 'Array de permisos/alcances (ej: ["read:orders", "write:orders"])';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

-- ============================================================================
-- CATÁLOGO DE CATEGORÍAS DE NEGOCIOS
-- ============================================================================
-- Descripción: Catálogo normalizado de categorías de negocios
-- 
-- Uso: Ejecutar después de schema.sql para crear el catálogo
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2024-11-18
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- CREAR TABLA DE CATÁLOGO DE CATEGORÍAS DE NEGOCIOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.business_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Información de la categoría
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    
    -- Orden de visualización
    display_order INTEGER DEFAULT 0,
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_business_categories_is_active ON core.business_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_business_categories_display_order ON core.business_categories(display_order);

-- ============================================================================
-- INSERTAR CATEGORÍAS PREDEFINIDAS (DEBE IR ANTES DE LA MIGRACIÓN)
-- ============================================================================

INSERT INTO core.business_categories (name, description, display_order, is_active) VALUES
    ('Restaurante', 'Restaurantes con menú completo', 1, TRUE),
    ('Cafetería', 'Cafeterías y lugares de café', 2, TRUE),
    ('Pizzería', 'Pizzerías y comida italiana', 3, TRUE),
    ('Taquería', 'Taquerías y comida mexicana tradicional', 4, TRUE),
    ('Panadería', 'Panaderías y pastelerías', 5, TRUE),
    ('Heladería', 'Heladerías y postrerías', 6, TRUE),
    ('Comida Rápida', 'Restaurantes de comida rápida', 7, TRUE),
    ('Asiático', 'Restaurantes de comida asiática (sushi, thai, chino, etc.)', 8, TRUE),
    ('Saludable/Vegano', 'Restaurantes saludables, veganos y vegetarianos', 9, TRUE),
    ('Pollería', 'Pollerías y rosticerías', 10, TRUE),
    ('Sandwich Shop', 'Tiendas de sandwiches y delis', 11, TRUE),
    ('Repostería', 'Repostería fina y pastelerías gourmet', 12, TRUE),
    ('Otro', 'Otras categorías de negocios', 13, TRUE)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- MIGRAR TABLA BUSINESSES PARA AGREGAR RELACIÓN CON CATÁLOGO
-- ============================================================================

-- Paso 1: Agregar columna category_id como FK opcional (mantiene compatibilidad)
-- Esta columna almacena la relación normalizada con el catálogo
ALTER TABLE core.businesses 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES core.business_categories(id) ON DELETE SET NULL;

-- Paso 2: Crear índice para la nueva FK (mejora el rendimiento de las consultas)
CREATE INDEX IF NOT EXISTS idx_businesses_category_id ON core.businesses(category_id);

-- Paso 3: Migrar datos existentes: actualizar category_id basado en el nombre de category
-- Esto asume que los nombres en businesses.category coinciden con business_categories.name
-- Solo actualiza los registros que aún no tienen category_id asignado
UPDATE core.businesses b
SET category_id = bc.id
FROM core.business_categories bc
WHERE b.category = bc.name
  AND b.category_id IS NULL;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

-- Por ahora mantenemos ambas columnas:
-- - category (VARCHAR): Mantiene compatibilidad con código existente
-- - category_id (UUID FK): Relación normalizada recomendada

-- En el futuro, cuando todos los negocios tengan category_id:
-- 1. Asegúrate de que todos los businesses tengan category_id:
--    UPDATE core.businesses SET category_id = (SELECT id FROM core.business_categories WHERE name = category) WHERE category_id IS NULL;
--
-- 2. Hacer category_id obligatorio:
--    ALTER TABLE core.businesses ALTER COLUMN category_id SET NOT NULL;
--
-- 3. (Opcional) Eliminar la columna category si ya no se necesita:
--    ALTER TABLE core.businesses DROP COLUMN category;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

-- ============================================================================
-- GESTIÓN DE REGIONES/ZONAS DE COBERTURA
-- ============================================================================
-- Descripción: Sistema para gestionar las zonas geográficas donde el servicio
--              está disponible. Permite definir polígonos de cobertura y
--              validar si una ubicación está dentro de la zona activa.
-- 
-- Uso: Ejecutar después de schema.sql para crear el sistema de regiones
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2024-11-18
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- CREAR TABLA DE REGIONES DE SERVICIO
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.service_regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Información de la región
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'México',
    
    -- Polígono de cobertura (usando PostGIS)
    -- ST_Polygon o ST_MultiPolygon para definir el área de cobertura
    coverage_area GEOMETRY(POLYGON, 4326) NOT NULL, -- SRID 4326 = WGS84
    
    -- Centro de la región (para centrar mapas)
    center_point POINT NOT NULL, -- (longitude, latitude)
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE, -- Solo una región puede ser default
    
    -- Configuración operativa
    max_delivery_radius_meters INTEGER DEFAULT 3000, -- Radio máximo de entrega en metros
    min_order_amount DECIMAL(10,2) DEFAULT 0.00, -- Monto mínimo de pedido para esta región
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices espaciales para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_service_regions_coverage_area ON core.service_regions USING GIST(coverage_area);
CREATE INDEX IF NOT EXISTS idx_service_regions_center_point ON core.service_regions USING GIST(center_point);
CREATE INDEX IF NOT EXISTS idx_service_regions_is_active ON core.service_regions(is_active);
CREATE INDEX IF NOT EXISTS idx_service_regions_is_default ON core.service_regions(is_default);

-- Constraint: Solo una región puede ser default
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_regions_single_default 
ON core.service_regions(is_default) 
WHERE is_default = TRUE;

-- ============================================================================
-- FUNCIÓN PARA VALIDAR SI UN PUNTO ESTÁ DENTRO DE UNA REGIÓN
-- ============================================================================

CREATE OR REPLACE FUNCTION core.is_location_in_region(
    p_longitude DOUBLE PRECISION,
    p_latitude DOUBLE PRECISION,
    p_region_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_region_id UUID;
    v_point GEOMETRY;
    v_result BOOLEAN;
BEGIN
    -- Convertir coordenadas a punto geográfico (SRID 4326)
    v_point := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326);
    
    -- Si no se especifica región, usar la región activa por defecto
    IF p_region_id IS NULL THEN
        SELECT id INTO v_region_id
        FROM core.service_regions
        WHERE is_default = TRUE AND is_active = TRUE
        LIMIT 1;
    ELSE
        v_region_id := p_region_id;
    END IF;
    
    -- Si no hay región activa, retornar false
    IF v_region_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar si el punto está dentro del polígono de cobertura
    SELECT ST_Within(v_point, coverage_area) INTO v_result
    FROM core.service_regions
    WHERE id = v_region_id AND is_active = TRUE;
    
    RETURN COALESCE(v_result, FALSE);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN PARA OBTENER LA REGIÓN ACTIVA POR DEFECTO
-- ============================================================================

CREATE OR REPLACE FUNCTION core.get_active_region()
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    city VARCHAR,
    state VARCHAR,
    country VARCHAR,
    center_longitude DOUBLE PRECISION,
    center_latitude DOUBLE PRECISION,
    max_delivery_radius_meters INTEGER,
    min_order_amount DECIMAL,
    coverage_area_geojson TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sr.id,
        sr.name,
        sr.description,
        sr.city,
        sr.state,
        sr.country,
        (sr.center_point)[0]::DOUBLE PRECISION as center_longitude,
        (sr.center_point)[1]::DOUBLE PRECISION as center_latitude,
        sr.max_delivery_radius_meters,
        sr.min_order_amount,
        ST_AsGeoJSON(sr.coverage_area)::TEXT as coverage_area_geojson
    FROM core.service_regions sr
    WHERE sr.is_default = TRUE AND sr.is_active = TRUE
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INSERTAR REGIÓN DE LA ROMA CDMX
-- ============================================================================

-- Coordenadas aproximadas de La Roma (Roma Norte y Roma Sur)
-- Centro: Avenida Álvaro Obregón y Calle Orizaba
-- Polígono aproximado que cubre La Roma
-- NOTA: Estos son valores aproximados, deberías ajustarlos con coordenadas exactas

INSERT INTO core.service_regions (
    name,
    description,
    city,
    state,
    country,
    coverage_area,
    center_point,
    is_active,
    is_default,
    max_delivery_radius_meters,
    min_order_amount
) VALUES (
    'La Roma',
    'Zona de cobertura inicial: Colonia Roma Norte y Roma Sur, CDMX',
    'Ciudad de México',
    'CDMX',
    'México',
    -- Polígono aproximado de La Roma (ajustar con coordenadas exactas)
    -- Formato: POLYGON((lon1 lat1, lon2 lat2, lon3 lat3, lon4 lat4, lon1 lat1))
    -- Coordenadas aproximadas (deberías usar un servicio de geocodificación para obtener el polígono exacto)
    -- Esquina suroeste: -99.1700 19.4150
    -- Esquina sureste: -99.1500 19.4150
    -- Esquina noreste: -99.1500 19.4300
    -- Esquina noroeste: -99.1700 19.4300
    ST_SetSRID(
        ST_GeomFromText(
            'POLYGON((
                -99.1700 19.4150,
                -99.1500 19.4150,
                -99.1500 19.4300,
                -99.1700 19.4300,
                -99.1700 19.4150
            ))'
        ),
        4326
    ),
    ST_MakePoint(-99.1600, 19.4220)::point, -- Centro: Avenida Álvaro Obregón
    TRUE,
    TRUE,
    3000, -- 3 km de radio máximo
    0.00  -- Sin monto mínimo
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    coverage_area = EXCLUDED.coverage_area,
    center_point = EXCLUDED.center_point,
    is_active = EXCLUDED.is_active,
    is_default = EXCLUDED.is_default,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- ACTUALIZAR TABLA BUSINESSES PARA AGREGAR VALIDACIÓN DE REGIÓN
-- ============================================================================

-- Agregar columna para almacenar la región del negocio
ALTER TABLE core.businesses 
ADD COLUMN IF NOT EXISTS service_region_id UUID REFERENCES core.service_regions(id) ON DELETE SET NULL;

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_businesses_service_region_id ON core.businesses(service_region_id);

-- Función para validar y asignar región al crear/actualizar un negocio
CREATE OR REPLACE FUNCTION core.validate_business_location()
RETURNS TRIGGER AS $$
DECLARE
    v_region_id UUID;
    v_is_in_region BOOLEAN;
BEGIN
    -- Obtener la región activa por defecto
    SELECT id INTO v_region_id
    FROM core.service_regions
    WHERE is_default = TRUE AND is_active = TRUE
    LIMIT 1;
    
    -- Si no hay región activa, permitir el negocio pero marcar como fuera de zona
    IF v_region_id IS NULL THEN
        NEW.service_region_id := NULL;
        RETURN NEW;
    END IF;
    
    -- Validar si la ubicación está dentro de la región
    SELECT core.is_location_in_region(
        (NEW.location)[0]::DOUBLE PRECISION,
        (NEW.location)[1]::DOUBLE PRECISION,
        v_region_id
    ) INTO v_is_in_region;
    
    -- Si está dentro de la región, asignar la región
    IF v_is_in_region THEN
        NEW.service_region_id := v_region_id;
    ELSE
        -- Si no está en la región, no asignar región (el negocio quedará fuera de zona)
        NEW.service_region_id := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para validar automáticamente la ubicación
DROP TRIGGER IF EXISTS trigger_validate_business_location ON core.businesses;
CREATE TRIGGER trigger_validate_business_location
    BEFORE INSERT OR UPDATE OF location ON core.businesses
    FOR EACH ROW
    EXECUTE FUNCTION core.validate_business_location();

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

-- 1. El polígono de La Roma es aproximado. Para obtener coordenadas exactas:
--    - Usa Google Maps API para obtener el polígono de la colonia
--    - O usa herramientas como geojson.io para dibujar el área exacta
--    - Las coordenadas deben estar en formato WGS84 (SRID 4326)

-- 2. Para actualizar el polígono de La Roma con coordenadas exactas:
--    UPDATE core.service_regions
--    SET coverage_area = ST_SetSRID(ST_GeomFromText('POLYGON((...))'), 4326)
--    WHERE name = 'La Roma';

-- 3. Para agregar más regiones en el futuro:
--    INSERT INTO core.service_regions (name, coverage_area, center_point, ...)
--    VALUES (...);

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

-- ============================================================================
-- FUNCIÓN: Obtener la región en la que está un punto
-- ============================================================================
-- Esta función retorna la región (zona) en la que está ubicado un punto.
-- Si el punto está en múltiples regiones (solapadas), retorna la primera encontrada.
-- Si no está en ninguna región, retorna NULL.
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- Función para obtener la región en la que está un punto
CREATE OR REPLACE FUNCTION core.get_location_region(
    p_longitude DOUBLE PRECISION,
    p_latitude DOUBLE PRECISION
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    city VARCHAR,
    state VARCHAR,
    country VARCHAR,
    center_longitude DOUBLE PRECISION,
    center_latitude DOUBLE PRECISION,
    max_delivery_radius_meters INTEGER,
    min_order_amount DECIMAL,
    coverage_area_geojson TEXT,
    is_valid BOOLEAN
) AS $$
DECLARE
    v_point GEOMETRY;
BEGIN
    -- Convertir coordenadas a punto geográfico (SRID 4326)
    v_point := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326);
    
    -- Buscar todas las regiones activas donde el punto está dentro del polígono
    RETURN QUERY
    SELECT 
        sr.id,
        sr.name,
        sr.description,
        sr.city,
        sr.state,
        sr.country,
        (sr.center_point)[0]::DOUBLE PRECISION as center_longitude,
        (sr.center_point)[1]::DOUBLE PRECISION as center_latitude,
        sr.max_delivery_radius_meters,
        sr.min_order_amount,
        ST_AsGeoJSON(sr.coverage_area)::TEXT as coverage_area_geojson,
        TRUE as is_valid
    FROM core.service_regions sr
    WHERE sr.is_active = TRUE
      AND ST_Within(v_point, sr.coverage_area)
    ORDER BY 
        -- Priorizar región por defecto
        CASE WHEN sr.is_default = TRUE THEN 0 ELSE 1 END,
        sr.name
    LIMIT 1;
    
    -- Si no se encontró ninguna región, retornar NULL con is_valid = FALSE
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            NULL::UUID as id,
            NULL::VARCHAR as name,
            NULL::TEXT as description,
            NULL::VARCHAR as city,
            NULL::VARCHAR as state,
            NULL::VARCHAR as country,
            NULL::DOUBLE PRECISION as center_longitude,
            NULL::DOUBLE PRECISION as center_latitude,
            NULL::INTEGER as max_delivery_radius_meters,
            NULL::DECIMAL as min_order_amount,
            NULL::TEXT as coverage_area_geojson,
            FALSE as is_valid;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Comentario de la función
COMMENT ON FUNCTION core.get_location_region(DOUBLE PRECISION, DOUBLE PRECISION) IS 
'Retorna la región (zona) en la que está ubicado un punto. Si el punto está en múltiples regiones, retorna la primera (priorizando la región por defecto). Si no está en ninguna región, retorna NULL con is_valid = FALSE.';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

-- ============================================================================
-- ROLES DE NEGOCIO Y MÚLTIPLES TIENDAS POR CUENTA
-- ============================================================================
-- Descripción: Sistema de roles para usuarios de negocios y soporte para
--              múltiples tiendas por cuenta (sucursales o tiendas diferentes)
-- 
-- Características:
-- 1. Roles de negocio: superadmin, admin, operations_staff, kitchen_staff
-- 2. Múltiples tiendas por cuenta: Un usuario puede ser dueño/administrador de varias tiendas
-- 3. Roles por tienda: Cada usuario puede tener diferentes roles en diferentes tiendas
-- 
-- Uso: Ejecutar después de schema.sql para agregar estas funcionalidades
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-01-16
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- TIPOS ENUM: Roles de Negocio
-- ============================================================================

-- Rol que un usuario tiene dentro de un negocio específico
-- Crear el tipo solo si no existe (idempotente)
-- IMPORTANTE: Crear el tipo en el schema 'core' explícitamente
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'core' AND t.typname = 'business_role'
    ) THEN
        CREATE TYPE core.business_role AS ENUM (
            'superadmin',              -- Super Administrador: Ve todo, crea usuarios, acceso completo
            'admin',                   -- Administrador: Crea productos, modifica precios, crea promociones
            'operations_staff',        -- Operations Staff: Acepta pedidos, los pone en marcha, hace entregas cuando llega el repartidor
            'kitchen_staff'           -- Kitchen Staff (opcional): Para órdenes aceptadas, las pone en preparación y luego en preparada
        );
        
        COMMENT ON TYPE core.business_role IS 'Roles que un usuario puede tener dentro de un negocio específico';
    END IF;
END $$;

-- ============================================================================
-- TABLA: Relación Usuarios-Negocios (Muchos a Muchos)
-- ============================================================================
-- Esta tabla permite que:
-- 1. Un usuario pueda tener múltiples tiendas (sucursales o tiendas diferentes)
-- 2. Un usuario pueda tener diferentes roles en diferentes tiendas
-- 3. Múltiples usuarios puedan trabajar en la misma tienda con diferentes roles

CREATE TABLE IF NOT EXISTS core.business_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relaciones
    business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Rol del usuario en este negocio específico
    role core.business_role NOT NULL DEFAULT 'operations_staff',
    
    -- Permisos específicos (JSONB para flexibilidad futura)
    -- Ejemplo: {"can_edit_prices": true, "can_create_promotions": true}
    permissions JSONB DEFAULT '{}'::jsonb,
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Quién asignó este rol
    
    -- Constraints
    UNIQUE(business_id, user_id) -- Un usuario solo puede tener un rol por negocio
    -- Nota: La validación de un solo superadmin por negocio se maneja mediante trigger
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_business_users_business_id ON core.business_users(business_id);
CREATE INDEX IF NOT EXISTS idx_business_users_user_id ON core.business_users(user_id);
CREATE INDEX IF NOT EXISTS idx_business_users_role ON core.business_users(role);
CREATE INDEX IF NOT EXISTS idx_business_users_is_active ON core.business_users(is_active);
CREATE INDEX IF NOT EXISTS idx_business_users_business_user_active ON core.business_users(business_id, user_id, is_active);

-- Índice compuesto para consultas frecuentes: "¿Qué negocios tiene este usuario?"
CREATE INDEX IF NOT EXISTS idx_business_users_user_business ON core.business_users(user_id, business_id) WHERE is_active = TRUE;

-- Índice compuesto para consultas frecuentes: "¿Qué usuarios tiene este negocio?"
CREATE INDEX IF NOT EXISTS idx_business_users_business_role ON core.business_users(business_id, role) WHERE is_active = TRUE;

-- ============================================================================
-- TRIGGER: Actualizar updated_at automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION core.update_business_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_business_users_updated_at ON core.business_users;
CREATE TRIGGER trigger_update_business_users_updated_at
    BEFORE UPDATE ON core.business_users
    FOR EACH ROW
    EXECUTE FUNCTION core.update_business_users_updated_at();

-- ============================================================================
-- TRIGGER: Validar que solo haya un superadmin activo por negocio
-- ============================================================================

CREATE OR REPLACE FUNCTION core.validate_single_superadmin()
RETURNS TRIGGER AS $$
DECLARE
    superadmin_count INTEGER;
BEGIN
    -- Si se está insertando o actualizando a superadmin
    IF NEW.role = 'superadmin' AND NEW.is_active = TRUE THEN
        -- Contar superadmins activos en el mismo negocio (excluyendo el registro actual si es UPDATE)
        SELECT COUNT(*) INTO superadmin_count
        FROM core.business_users
        WHERE business_id = NEW.business_id
        AND role = 'superadmin'
        AND is_active = TRUE
        AND (TG_OP = 'INSERT' OR id != NEW.id);
        
        -- Si ya hay un superadmin activo, lanzar error
        IF superadmin_count > 0 THEN
            RAISE EXCEPTION 'Solo puede haber un superadmin activo por negocio. Desactiva el superadmin existente primero.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_single_superadmin ON core.business_users;
CREATE TRIGGER trigger_validate_single_superadmin
    BEFORE INSERT OR UPDATE ON core.business_users
    FOR EACH ROW
    EXECUTE FUNCTION core.validate_single_superadmin();

-- ============================================================================
-- FUNCIÓN: Verificar si un usuario tiene un rol específico en un negocio
-- ============================================================================

CREATE OR REPLACE FUNCTION core.user_has_business_role(
    p_user_id UUID,
    p_business_id UUID,
    p_role core.business_role
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM core.business_users 
        WHERE user_id = p_user_id 
        AND business_id = p_business_id 
        AND role = p_role 
        AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.user_has_business_role IS 'Verifica si un usuario tiene un rol específico en un negocio';

-- ============================================================================
-- FUNCIÓN: Obtener todos los negocios de un usuario con sus roles
-- ============================================================================

DROP FUNCTION IF EXISTS core.get_user_businesses(UUID);
CREATE OR REPLACE FUNCTION core.get_user_businesses(p_user_id UUID)
RETURNS TABLE (
    business_id UUID,
    business_name VARCHAR(255),
    role core.business_role,
    is_active BOOLEAN,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.name,
        bu.role,
        bu.is_active,
        bu.created_at
    FROM core.business_users bu
    INNER JOIN core.businesses b ON bu.business_id = b.id
    WHERE bu.user_id = p_user_id
    AND bu.is_active = TRUE
    ORDER BY bu.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_user_businesses IS 'Obtiene todos los negocios activos de un usuario con sus roles';

-- ============================================================================
-- FUNCIÓN: Obtener todos los usuarios de un negocio con sus roles
-- ============================================================================

DROP FUNCTION IF EXISTS core.get_business_users(UUID);
CREATE OR REPLACE FUNCTION core.get_business_users(p_business_id UUID)
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role core.business_role,
    is_active BOOLEAN,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bu.user_id,
        au.email::TEXT,
        up.first_name,
        up.last_name,
        bu.role,
        bu.is_active,
        bu.created_at
    FROM core.business_users bu
    INNER JOIN auth.users au ON bu.user_id = au.id
    LEFT JOIN core.user_profiles up ON bu.user_id = up.id
    WHERE bu.business_id = p_business_id
    AND bu.is_active = TRUE
    ORDER BY 
        CASE bu.role
            WHEN 'superadmin' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'operations_staff' THEN 3
            WHEN 'kitchen_staff' THEN 4
        END,
        bu.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_business_users IS 'Obtiene todos los usuarios activos de un negocio con sus roles';

-- ============================================================================
-- FUNCIÓN: Obtener todas las tiendas de un superadmin
-- ============================================================================
-- Permite al superadmin ver todas sus tiendas para configurarlas

DROP FUNCTION IF EXISTS core.get_superadmin_businesses(UUID);
CREATE OR REPLACE FUNCTION core.get_superadmin_businesses(p_superadmin_id UUID)
RETURNS TABLE (
    business_id UUID,
    business_name VARCHAR(255),
    business_email VARCHAR(255),
    business_phone VARCHAR(20),
    business_address TEXT,
    is_active BOOLEAN,
    total_users INTEGER,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.name,
        b.email,
        b.phone,
        COALESCE(
            TRIM(
                CONCAT_WS(', ',
                    NULLIF(TRIM(CONCAT_WS(' ', 
                        NULLIF(a.street, ''), 
                        NULLIF(a.street_number, '')
                    )), ''),
                    NULLIF(TRIM(a.neighborhood), ''),
                    NULLIF(TRIM(a.city), ''),
                    NULLIF(TRIM(a.state), '')
                )
            ),
            'Sin dirección'
        ) AS business_address,
        b.is_active,
        COUNT(DISTINCT bu.id) FILTER (WHERE bu.is_active = TRUE)::INTEGER AS total_users,
        b.created_at
    FROM core.businesses b
    INNER JOIN core.business_users bu ON b.id = bu.business_id
    LEFT JOIN core.addresses a ON b.address_id = a.id AND a.is_active = TRUE
    WHERE bu.user_id = p_superadmin_id
    AND bu.role = 'superadmin'
    AND bu.is_active = TRUE
    GROUP BY b.id, b.name, b.email, b.phone, b.is_active, b.created_at,
             a.street, a.street_number, a.neighborhood, a.city, a.state
    ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_superadmin_businesses IS 'Obtiene todas las tiendas donde un usuario es superadmin';

-- ============================================================================
-- FUNCIÓN: Asignar usuario a tienda (solo superadmin)
-- ============================================================================
-- Permite al superadmin asignar usuarios a sus tiendas con un rol específico

CREATE OR REPLACE FUNCTION core.assign_user_to_business(
    p_superadmin_id UUID,
    p_business_id UUID,
    p_user_id UUID,
    p_role core.business_role,
    p_permissions JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_assignment_id UUID;
    v_is_superadmin BOOLEAN;
BEGIN
    -- Verificar que el usuario que hace la asignación es superadmin de la tienda
    SELECT EXISTS (
        SELECT 1 
        FROM core.business_users 
        WHERE business_id = p_business_id 
        AND user_id = p_superadmin_id 
        AND role = 'superadmin' 
        AND is_active = TRUE
    ) INTO v_is_superadmin;
    
    IF NOT v_is_superadmin THEN
        RAISE EXCEPTION 'Solo el superadmin de la tienda puede asignar usuarios';
    END IF;
    
    -- Verificar que no se intente asignar otro superadmin (solo puede haber uno)
    IF p_role = 'superadmin' THEN
        IF EXISTS (
            SELECT 1 
            FROM core.business_users 
            WHERE business_id = p_business_id 
            AND role = 'superadmin' 
            AND is_active = TRUE
        ) THEN
            RAISE EXCEPTION 'Solo puede haber un superadmin activo por tienda';
        END IF;
    END IF;
    
    -- Insertar o actualizar la asignación
    INSERT INTO core.business_users (
        business_id, 
        user_id, 
        role, 
        permissions, 
        is_active, 
        created_by
    )
    VALUES (
        p_business_id,
        p_user_id,
        p_role,
        p_permissions,
        TRUE,
        p_superadmin_id
    )
    ON CONFLICT (business_id, user_id) DO UPDATE SET
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        is_active = TRUE,
        updated_at = CURRENT_TIMESTAMP,
        created_by = p_superadmin_id
    RETURNING id INTO v_assignment_id;
    
    RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.assign_user_to_business IS 'Asigna un usuario a una tienda con un rol específico. Solo puede ser ejecutado por el superadmin de la tienda.';

-- ============================================================================
-- FUNCIÓN: Remover usuario de tienda (solo superadmin)
-- ============================================================================
-- Permite al superadmin remover usuarios de sus tiendas

CREATE OR REPLACE FUNCTION core.remove_user_from_business(
    p_superadmin_id UUID,
    p_business_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_superadmin BOOLEAN;
    v_target_is_superadmin BOOLEAN;
BEGIN
    -- Verificar que el usuario que hace la remoción es superadmin de la tienda
    SELECT EXISTS (
        SELECT 1 
        FROM core.business_users 
        WHERE business_id = p_business_id 
        AND user_id = p_superadmin_id 
        AND role = 'superadmin' 
        AND is_active = TRUE
    ) INTO v_is_superadmin;
    
    IF NOT v_is_superadmin THEN
        RAISE EXCEPTION 'Solo el superadmin de la tienda puede remover usuarios';
    END IF;
    
    -- Verificar que no se intente remover al superadmin (debe desactivarse primero)
    SELECT EXISTS (
        SELECT 1 
        FROM core.business_users 
        WHERE business_id = p_business_id 
        AND user_id = p_user_id 
        AND role = 'superadmin' 
        AND is_active = TRUE
    ) INTO v_target_is_superadmin;
    
    IF v_target_is_superadmin THEN
        RAISE EXCEPTION 'No se puede remover al superadmin. Desactívalo primero o transfiere el rol a otro usuario.';
    END IF;
    
    -- Desactivar la asignación (no eliminar para mantener historial)
    UPDATE core.business_users
    SET is_active = FALSE,
        updated_at = CURRENT_TIMESTAMP
    WHERE business_id = p_business_id
    AND user_id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.remove_user_from_business IS 'Remueve un usuario de una tienda. Solo puede ser ejecutado por el superadmin de la tienda.';

-- ============================================================================
-- FUNCIÓN: Cambiar rol de usuario en tienda (solo superadmin)
-- ============================================================================
-- Permite al superadmin cambiar el rol de un usuario en una tienda

CREATE OR REPLACE FUNCTION core.change_user_role_in_business(
    p_superadmin_id UUID,
    p_business_id UUID,
    p_user_id UUID,
    p_new_role core.business_role
)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_superadmin BOOLEAN;
BEGIN
    -- Verificar que el usuario que hace el cambio es superadmin de la tienda
    SELECT EXISTS (
        SELECT 1 
        FROM core.business_users 
        WHERE business_id = p_business_id 
        AND user_id = p_superadmin_id 
        AND role = 'superadmin' 
        AND is_active = TRUE
    ) INTO v_is_superadmin;
    
    IF NOT v_is_superadmin THEN
        RAISE EXCEPTION 'Solo el superadmin de la tienda puede cambiar roles de usuarios';
    END IF;
    
    -- Verificar que no se intente asignar otro superadmin si ya existe uno
    IF p_new_role = 'superadmin' THEN
        IF EXISTS (
            SELECT 1 
            FROM core.business_users 
            WHERE business_id = p_business_id 
            AND role = 'superadmin' 
            AND is_active = TRUE
            AND user_id != p_user_id
        ) THEN
            RAISE EXCEPTION 'Solo puede haber un superadmin activo por tienda. Desactiva el superadmin existente primero.';
        END IF;
    END IF;
    
    -- Actualizar el rol
    UPDATE core.business_users
    SET role = p_new_role,
        updated_at = CURRENT_TIMESTAMP
    WHERE business_id = p_business_id
    AND user_id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.change_user_role_in_business IS 'Cambia el rol de un usuario en una tienda. Solo puede ser ejecutado por el superadmin de la tienda.';

-- ============================================================================
-- FUNCIÓN: Obtener usuarios disponibles para asignar (no asignados a la tienda)
-- ============================================================================
-- Permite al superadmin ver usuarios que puede asignar a su tienda

DROP FUNCTION IF EXISTS core.get_available_users_for_business(UUID, TEXT);
CREATE OR REPLACE FUNCTION core.get_available_users_for_business(
    p_business_id UUID,
    p_search_term TEXT DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    is_already_assigned BOOLEAN,
    assigned_role core.business_role
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        au.email::TEXT,
        up.first_name,
        up.last_name,
        up.phone,
        COALESCE(bu.is_active, FALSE) AS is_already_assigned,
        bu.role AS assigned_role
    FROM auth.users au
    LEFT JOIN core.user_profiles up ON au.id = up.id
    LEFT JOIN core.business_users bu ON au.id = bu.user_id 
        AND bu.business_id = p_business_id
    WHERE (
        p_search_term IS NULL 
        OR au.email ILIKE '%' || p_search_term || '%'
        OR up.first_name ILIKE '%' || p_search_term || '%'
        OR up.last_name ILIKE '%' || p_search_term || '%'
        OR up.phone ILIKE '%' || p_search_term || '%'
    )
    ORDER BY 
        COALESCE(bu.is_active, FALSE) DESC, -- Mostrar primero los ya asignados
        au.email;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_available_users_for_business IS 'Obtiene usuarios disponibles para asignar a una tienda, incluyendo búsqueda opcional';

-- ============================================================================
-- FUNCIÓN: Obtener resumen de permisos de un usuario en todas sus tiendas
-- ============================================================================
-- Permite ver qué tiendas puede acceder un usuario y con qué roles

DROP FUNCTION IF EXISTS core.get_user_businesses_summary(UUID);
CREATE OR REPLACE FUNCTION core.get_user_businesses_summary(p_user_id UUID)
RETURNS TABLE (
    business_id UUID,
    business_name VARCHAR(255),
    role core.business_role,
    permissions JSONB,
    is_active BOOLEAN,
    can_access BOOLEAN,
    assigned_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.name,
        bu.role,
        bu.permissions,
        bu.is_active,
        (bu.is_active AND b.is_active) AS can_access,
        bu.created_at AS assigned_at
    FROM core.business_users bu
    INNER JOIN core.businesses b ON bu.business_id = b.id
    WHERE bu.user_id = p_user_id
    ORDER BY 
        (bu.is_active AND b.is_active) DESC,
        bu.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_user_businesses_summary IS 'Obtiene un resumen de todas las tiendas a las que un usuario tiene acceso y sus roles';

-- ============================================================================
-- VISTA: Negocios con información de usuarios y roles
-- ============================================================================

-- Renombrar columnas de la vista si existen (antes de recrearla)
DO $$
BEGIN
    -- Renombrar columnas si la vista existe y tiene los nombres antiguos
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'core' AND table_name = 'businesses_with_users') THEN
        -- Verificar si las columnas antiguas existen antes de renombrarlas
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'core' 
            AND table_name = 'businesses_with_users' 
            AND column_name = 'total_operativos_aceptadores'
        ) THEN
            ALTER VIEW core.businesses_with_users RENAME COLUMN total_operativos_aceptadores TO total_operations_staff;
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'core' 
            AND table_name = 'businesses_with_users' 
            AND column_name = 'total_operativos_cocina'
        ) THEN
            ALTER VIEW core.businesses_with_users RENAME COLUMN total_operativos_cocina TO total_kitchen_staff;
        END IF;
    END IF;
END $$;

-- Recrear la vista con los nombres actualizados
DROP VIEW IF EXISTS core.businesses_with_users;
CREATE VIEW core.businesses_with_users AS
SELECT 
    b.id AS business_id,
    b.name AS business_name,
    b.owner_id,
    au.email AS owner_email,
    COUNT(bu.id) FILTER (WHERE bu.is_active = TRUE) AS total_active_users,
    COUNT(bu.id) FILTER (WHERE bu.role = 'superadmin' AND bu.is_active = TRUE) AS total_superadmins,
    COUNT(bu.id) FILTER (WHERE bu.role = 'admin' AND bu.is_active = TRUE) AS total_admins,
    COUNT(bu.id) FILTER (WHERE bu.role = 'operations_staff' AND bu.is_active = TRUE) AS total_operations_staff,
    COUNT(bu.id) FILTER (WHERE bu.role = 'kitchen_staff' AND bu.is_active = TRUE) AS total_kitchen_staff,
    b.is_active AS business_is_active,
    b.created_at AS business_created_at
FROM core.businesses b
LEFT JOIN auth.users au ON b.owner_id = au.id
LEFT JOIN core.business_users bu ON b.id = bu.business_id
GROUP BY b.id, b.name, b.owner_id, au.email, b.is_active, b.created_at;

COMMENT ON VIEW core.businesses_with_users IS 'Vista que muestra negocios con estadísticas de usuarios y roles';

-- ============================================================================
-- MIGRACIÓN: Asignar rol superadmin al owner_id existente
-- ============================================================================
-- Esta migración asigna automáticamente el rol 'superadmin' a todos los
-- dueños existentes de negocios para mantener la compatibilidad

DO $$
DECLARE
    business_record RECORD;
    existing_superadmin_id UUID;
BEGIN
    -- Asignar rol superadmin a todos los owners existentes
    FOR business_record IN 
        SELECT id, owner_id 
        FROM core.businesses
        WHERE owner_id IS NOT NULL
    LOOP
        -- Verificar si ya existe un superadmin activo para este negocio
        SELECT bu.user_id INTO existing_superadmin_id
        FROM core.business_users bu
        WHERE bu.business_id = business_record.id
        AND bu.role = 'superadmin'
        AND bu.is_active = TRUE
        LIMIT 1;
        
        -- Si ya existe un superadmin y es el mismo owner, solo actualizar
        IF existing_superadmin_id IS NOT NULL AND existing_superadmin_id = business_record.owner_id THEN
            -- Ya está asignado como superadmin, solo asegurar que esté activo
            UPDATE core.business_users
            SET is_active = TRUE,
                updated_at = CURRENT_TIMESTAMP
            WHERE business_id = business_record.id
            AND user_id = business_record.owner_id;
        ELSIF existing_superadmin_id IS NOT NULL AND existing_superadmin_id != business_record.owner_id THEN
            -- Hay otro superadmin, desactivarlo primero
            UPDATE core.business_users
            SET is_active = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE business_id = business_record.id
            AND user_id = existing_superadmin_id
            AND role = 'superadmin';
            
            -- Ahora insertar/actualizar el owner como superadmin
            INSERT INTO core.business_users (business_id, user_id, role, is_active)
            VALUES (
                business_record.id,
                business_record.owner_id,
                'superadmin',
                TRUE
            )
            ON CONFLICT (business_id, user_id) DO UPDATE SET
                role = 'superadmin',
                is_active = TRUE,
                updated_at = CURRENT_TIMESTAMP;
        ELSE
            -- No hay superadmin existente, insertar normalmente
            INSERT INTO core.business_users (business_id, user_id, role, is_active)
            VALUES (
                business_record.id,
                business_record.owner_id,
                'superadmin',
                TRUE
            )
            ON CONFLICT (business_id, user_id) DO UPDATE SET
                role = 'superadmin',
                is_active = TRUE,
                updated_at = CURRENT_TIMESTAMP;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Migración completada: Todos los owners existentes ahora tienen rol superadmin';
END $$;

-- ============================================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================================================

COMMENT ON TABLE core.business_users IS 'Relación muchos-a-muchos entre usuarios y negocios. Permite que un usuario tenga múltiples tiendas y diferentes roles en cada una.';

COMMENT ON COLUMN core.business_users.business_id IS 'ID del negocio';
COMMENT ON COLUMN core.business_users.user_id IS 'ID del usuario (auth.users)';
COMMENT ON COLUMN core.business_users.role IS 'Rol del usuario en este negocio específico';
COMMENT ON COLUMN core.business_users.permissions IS 'Permisos específicos adicionales en formato JSONB';
COMMENT ON COLUMN core.business_users.is_active IS 'Si el usuario está activo en este negocio';
COMMENT ON COLUMN core.business_users.created_by IS 'Usuario que asignó este rol (puede ser NULL si fue auto-asignado)';

-- ============================================================================
-- EJEMPLOS DE USO
-- ============================================================================

/*
-- ============================================================================
-- GESTIÓN BÁSICA DE USUARIOS Y TIENDAS
-- ============================================================================

-- 1. Ver todas las tiendas de un superadmin
SELECT * FROM core.get_superadmin_businesses('superadmin-user-uuid');

-- 2. Ver todos los negocios de un usuario
SELECT * FROM core.get_user_businesses('user-uuid-here');

-- 3. Ver todos los usuarios de un negocio
SELECT * FROM core.get_business_users('business-uuid-here');

-- 4. Verificar si un usuario tiene rol admin en un negocio
SELECT core.user_has_business_role('user-uuid', 'business-uuid', 'admin');

-- 5. Ver negocios con estadísticas de usuarios
SELECT * FROM core.businesses_with_users;

-- ============================================================================
-- CONFIGURADOR DE PERMISOS (SUPERADMIN)
-- ============================================================================

-- 6. Asignar un usuario a una tienda con rol admin (solo superadmin)
SELECT core.assign_user_to_business(
    'superadmin-user-uuid',  -- ID del superadmin que hace la asignación
    'business-uuid',          -- ID de la tienda
    'new-user-uuid',         -- ID del usuario a asignar
    'admin',                 -- Rol a asignar
    '{"can_edit_prices": true}'::jsonb  -- Permisos adicionales (opcional)
);

-- 7. Cambiar el rol de un usuario en una tienda (solo superadmin)
SELECT core.change_user_role_in_business(
    'superadmin-user-uuid',  -- ID del superadmin
    'business-uuid',          -- ID de la tienda
    'user-uuid',             -- ID del usuario
    'operations_staff'    -- Nuevo rol
);

-- 8. Remover un usuario de una tienda (solo superadmin)
SELECT core.remove_user_from_business(
    'superadmin-user-uuid',  -- ID del superadmin
    'business-uuid',          -- ID de la tienda
    'user-uuid'              -- ID del usuario a remover
);

-- 9. Ver usuarios disponibles para asignar a una tienda (con búsqueda opcional)
SELECT * FROM core.get_available_users_for_business(
    'business-uuid',
    'juan'  -- Término de búsqueda (opcional, NULL para todos)
);

-- 10. Ver resumen de permisos de un usuario en todas sus tiendas
SELECT * FROM core.get_user_businesses_summary('user-uuid');

-- ============================================================================
-- GESTIÓN DIRECTA (ALTERNATIVA SIN FUNCIONES)
-- ============================================================================

-- 11. Asignar un usuario a un negocio con rol admin (directo)
INSERT INTO core.business_users (business_id, user_id, role, created_by)
VALUES (
    'business-uuid-here',
    'user-uuid-here',
    'admin',
    'current-user-uuid'
);

-- 12. Cambiar el rol de un usuario en un negocio (directo)
UPDATE core.business_users
SET role = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE business_id = 'business-uuid' AND user_id = 'user-uuid';

-- 13. Desactivar un usuario de un negocio (sin eliminarlo)
UPDATE core.business_users
SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
WHERE business_id = 'business-uuid' AND user_id = 'user-uuid';

-- 14. Ver todos los usuarios con rol operations_staff en un negocio
SELECT * FROM core.business_users
WHERE business_id = 'business-uuid'
AND role = 'operations_staff'
AND is_active = TRUE;
*/

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

-- ============================================================================
-- GESTIÓN DE USUARIOS A NIVEL DE CUENTA DEL SUPERADMIN
-- ============================================================================
-- Este script agrega funciones para que el superadmin gestione usuarios
-- a nivel de su cuenta (todas sus tiendas), no solo por tienda individual.
-- 
-- Concepto: Un superadmin puede tener múltiples tiendas, y debe poder
-- ver y gestionar todos los usuarios relacionados con SU CUENTA (todas sus tiendas),
-- no solo los usuarios de una tienda específica.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-01-16
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- FUNCIÓN: Obtener todos los usuarios de la cuenta del superadmin
-- ============================================================================
-- Retorna todos los usuarios que están asignados a CUALQUIERA de las tiendas
-- donde el usuario es superadmin. Esto permite al superadmin ver todos
-- los usuarios relacionados con su cuenta, no solo de una tienda.

DROP FUNCTION IF EXISTS core.get_superadmin_account_users(UUID);
CREATE OR REPLACE FUNCTION core.get_superadmin_account_users(p_superadmin_id UUID)
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role core.business_role,
    business_id UUID,
    business_name VARCHAR(255),
    is_active BOOLEAN,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bu.user_id,
        au.email::TEXT,
        COALESCE(
            up.first_name,
            au.raw_user_meta_data->>'first_name',
            NULL
        )::VARCHAR(100) AS first_name,
        COALESCE(
            up.last_name,
            au.raw_user_meta_data->>'last_name',
            NULL
        )::VARCHAR(100) AS last_name,
        bu.role,
        bu.business_id,
        b.name AS business_name,
        bu.is_active,
        bu.created_at
    FROM core.business_users bu
    INNER JOIN core.businesses b ON bu.business_id = b.id
    INNER JOIN auth.users au ON bu.user_id = au.id
    LEFT JOIN core.user_profiles up ON bu.user_id = up.id
    WHERE bu.business_id IN (
        -- Obtener todas las tiendas donde el usuario es superadmin
        SELECT bu2.business_id
        FROM core.business_users bu2
        WHERE bu2.user_id = p_superadmin_id
        AND bu2.role = 'superadmin'
        AND bu2.is_active = TRUE
    )
    AND bu.is_active = TRUE
    -- Excluir al mismo superadmin
    AND bu.user_id != p_superadmin_id
    GROUP BY 
        bu.user_id,
        au.email,
        au.raw_user_meta_data,
        up.first_name,
        up.last_name,
        bu.role,
        bu.business_id,
        b.name,
        bu.is_active,
        bu.created_at
    ORDER BY 
        bu.created_at DESC,
        b.name,
        CASE bu.role
            WHEN 'superadmin' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'operations_staff' THEN 3
            WHEN 'kitchen_staff' THEN 4
        END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_superadmin_account_users IS 'Obtiene todos los usuarios de todas las tiendas donde un usuario es superadmin (usuarios de su cuenta)';

-- ============================================================================
-- FUNCIÓN: Obtener usuarios disponibles para asignar a la cuenta del superadmin
-- ============================================================================
-- Retorna usuarios que pueden ser asignados a cualquiera de las tiendas
-- del superadmin. Muestra si ya están asignados a alguna de sus tiendas.

DROP FUNCTION IF EXISTS core.get_available_users_for_superadmin_account(UUID, TEXT);
CREATE OR REPLACE FUNCTION core.get_available_users_for_superadmin_account(
    p_superadmin_id UUID,
    p_search_term TEXT DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    is_already_assigned BOOLEAN,
    assigned_businesses TEXT[],
    assigned_roles core.business_role[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id::UUID AS user_id,
        au.email::TEXT AS user_email,
        up.first_name::VARCHAR(100),
        up.last_name::VARCHAR(100),
        COALESCE(up.phone, '')::VARCHAR(20) AS phone,
        -- Verificar si está asignado a alguna tienda del superadmin
        EXISTS (
            SELECT 1
            FROM core.business_users bu
            WHERE bu.user_id = au.id
            AND bu.business_id IN (
                SELECT bu2.business_id
                FROM core.business_users bu2
                WHERE bu2.user_id = p_superadmin_id
                AND bu2.role = 'superadmin'
                AND bu2.is_active = TRUE
            )
            AND bu.is_active = TRUE
        ) AS is_already_assigned,
        -- Lista de tiendas donde ya está asignado
        COALESCE(
            ARRAY(
                SELECT b.name::TEXT
                FROM core.business_users bu
                INNER JOIN core.businesses b ON bu.business_id = b.id
                WHERE bu.user_id = au.id
                AND bu.business_id IN (
                    SELECT bu2.business_id
                    FROM core.business_users bu2
                    WHERE bu2.user_id = p_superadmin_id
                    AND bu2.role = 'superadmin'
                    AND bu2.is_active = TRUE
                )
                AND bu.is_active = TRUE
            ),
            ARRAY[]::TEXT[]
        ) AS assigned_businesses,
        -- Lista de roles en las tiendas del superadmin
        COALESCE(
            ARRAY(
                SELECT bu.role::core.business_role
                FROM core.business_users bu
                WHERE bu.user_id = au.id
                AND bu.business_id IN (
                    SELECT bu2.business_id
                    FROM core.business_users bu2
                    WHERE bu2.user_id = p_superadmin_id
                    AND bu2.role = 'superadmin'
                    AND bu2.is_active = TRUE
                )
                AND bu.is_active = TRUE
            ),
            ARRAY[]::core.business_role[]
        ) AS assigned_roles
    FROM auth.users au
    LEFT JOIN core.user_profiles up ON au.id = up.id
    WHERE (
        p_search_term IS NULL 
        OR au.email ILIKE '%' || p_search_term || '%'
        OR up.first_name ILIKE '%' || p_search_term || '%'
        OR up.last_name ILIKE '%' || p_search_term || '%'
        OR up.phone ILIKE '%' || p_search_term || '%'
    )
    -- Excluir al mismo superadmin
    AND au.id != p_superadmin_id
    ORDER BY 
        -- Mostrar primero los ya asignados
        EXISTS (
            SELECT 1
            FROM core.business_users bu
            WHERE bu.user_id = au.id
            AND bu.business_id IN (
                SELECT bu2.business_id
                FROM core.business_users bu2
                WHERE bu2.user_id = p_superadmin_id
                AND bu2.role = 'superadmin'
                AND bu2.is_active = TRUE
            )
            AND bu.is_active = TRUE
        ) DESC,
        au.email;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_available_users_for_superadmin_account IS 'Obtiene usuarios disponibles para asignar a cualquiera de las tiendas del superadmin, mostrando si ya están asignados';

-- ============================================================================
-- FUNCIÓN: Remover usuario de todas las tiendas de la cuenta del superadmin
-- ============================================================================
-- Permite al superadmin remover un usuario de TODAS sus tiendas de una vez.

DROP FUNCTION IF EXISTS core.remove_user_from_superadmin_account(UUID, UUID);
CREATE OR REPLACE FUNCTION core.remove_user_from_superadmin_account(
    p_superadmin_id UUID,
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_removed_count INTEGER := 0;
BEGIN
    -- Verificar que el usuario que hace la remoción es superadmin
    IF NOT EXISTS (
        SELECT 1 
        FROM core.business_users 
        WHERE user_id = p_superadmin_id 
        AND role = 'superadmin' 
        AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Solo un superadmin puede remover usuarios de su cuenta';
    END IF;
    
    -- Verificar que no se intente remover al superadmin
    IF p_user_id = p_superadmin_id THEN
        RAISE EXCEPTION 'No puedes removerte a ti mismo de tu cuenta';
    END IF;
    
    -- Remover el usuario de todas las tiendas del superadmin
    UPDATE core.business_users
    SET is_active = FALSE,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id
    AND business_id IN (
        SELECT bu2.business_id
        FROM core.business_users bu2
        WHERE bu2.user_id = p_superadmin_id
        AND bu2.role = 'superadmin'
        AND bu2.is_active = TRUE
    )
    AND is_active = TRUE;
    
    GET DIAGNOSTICS v_removed_count = ROW_COUNT;
    
    RETURN v_removed_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.remove_user_from_superadmin_account IS 'Remueve un usuario de todas las tiendas de la cuenta del superadmin';

-- ============================================================================
-- FUNCIÓN: Obtener resumen de usuarios por tienda de la cuenta del superadmin
-- ============================================================================
-- Retorna un resumen agrupado de usuarios por tienda para el superadmin.

DROP FUNCTION IF EXISTS core.get_superadmin_account_users_summary(UUID);
CREATE OR REPLACE FUNCTION core.get_superadmin_account_users_summary(p_superadmin_id UUID)
RETURNS TABLE (
    business_id UUID,
    business_name VARCHAR(255),
    total_users INTEGER,
    total_admins INTEGER,
    total_operativos_aceptadores INTEGER,
    total_operativos_cocina INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.name,
        COUNT(bu.id) FILTER (WHERE bu.is_active = TRUE)::INTEGER AS total_users,
        COUNT(bu.id) FILTER (WHERE bu.role = 'admin' AND bu.is_active = TRUE)::INTEGER AS total_admins,
        COUNT(bu.id) FILTER (WHERE bu.role = 'operations_staff' AND bu.is_active = TRUE)::INTEGER AS total_operations_staff,
        COUNT(bu.id) FILTER (WHERE bu.role = 'kitchen_staff' AND bu.is_active = TRUE)::INTEGER AS total_kitchen_staff
    FROM core.businesses b
    INNER JOIN core.business_users bu_superadmin ON b.id = bu_superadmin.business_id
    LEFT JOIN core.business_users bu ON b.id = bu.business_id
    WHERE bu_superadmin.user_id = p_superadmin_id
    AND bu_superadmin.role = 'superadmin'
    AND bu_superadmin.is_active = TRUE
    -- Excluir al superadmin del conteo
    AND (bu.user_id IS NULL OR bu.user_id != p_superadmin_id)
    GROUP BY b.id, b.name
    ORDER BY b.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_superadmin_account_users_summary IS 'Obtiene un resumen de usuarios por tienda de la cuenta del superadmin';

-- ============================================================================
-- EJEMPLOS DE USO
-- ============================================================================

/*
-- 1. Ver todos los usuarios de la cuenta del superadmin (todas sus tiendas)
SELECT * FROM core.get_superadmin_account_users('superadmin-user-uuid');

-- 2. Buscar usuarios disponibles para asignar a la cuenta del superadmin
SELECT * FROM core.get_available_users_for_superadmin_account(
    'superadmin-user-uuid',
    'juan'  -- Término de búsqueda (opcional)
);

-- 3. Remover un usuario de todas las tiendas de la cuenta del superadmin
SELECT core.remove_user_from_superadmin_account(
    'superadmin-user-uuid',
    'user-to-remove-uuid'
);

-- 4. Ver resumen de usuarios por tienda
SELECT * FROM core.get_superadmin_account_users_summary('superadmin-user-uuid');
*/

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

-- ============================================================================
-- MIGRACIÓN: Sistema Avanzado de Catálogos de Productos
-- ============================================================================
-- Descripción: Agrega funcionalidades avanzadas para catálogos:
--              - Tipo de producto (alimento, medicamento, no alimento)
--              - Atributos múltiples para categorías y tipos de producto
--              - Sistema estructurado de variantes de productos
--              - Mejora de paquetes/colecciones
-- 
-- Uso: Ejecutar después de schema.sql para agregar funcionalidades avanzadas
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-01-XX
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- 1. TIPO DE PRODUCTO
-- ============================================================================

-- Crear ENUM para tipos de producto
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type') THEN
        CREATE TYPE catalog.product_type AS ENUM (
            'food',           -- Alimento
            'beverage',       -- Bebida
            'medicine',       -- Medicamento (farmacia)
            'grocery',        -- Abarrotes
            'non_food'        -- No alimenticio
        );
    END IF;
END $$;

-- Agregar columna product_type a catalog.products
ALTER TABLE catalog.products
ADD COLUMN IF NOT EXISTS product_type catalog.product_type DEFAULT 'food';

-- Agregar comentario
COMMENT ON COLUMN catalog.products.product_type IS 'Tipo de producto para filtros, sugerencias y regulaciones';

-- Agregar índice
CREATE INDEX IF NOT EXISTS idx_products_product_type ON catalog.products(product_type);

-- ============================================================================
-- 2. ATRIBUTOS PARA CATEGORÍAS DE PRODUCTOS
-- ============================================================================

-- Agregar campo para atributos múltiples en categorías
ALTER TABLE catalog.product_categories
ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;

-- Agregar comentario
COMMENT ON COLUMN catalog.product_categories.attributes IS 'Atributos adicionales de la categoría (ej: {"temperature": "cold", "serving_type": "individual", "dietary": ["vegan", "gluten-free"]})';

-- Agregar índice GIN para búsquedas eficientes en atributos
CREATE INDEX IF NOT EXISTS idx_product_categories_attributes ON catalog.product_categories USING GIN(attributes);

-- ============================================================================
-- 3. ATRIBUTOS PARA TIPOS DE PRODUCTO
-- ============================================================================

-- Crear tabla para atributos de tipos de producto (configuración global)
CREATE TABLE IF NOT EXISTS catalog.product_type_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tipo de producto
    product_type catalog.product_type NOT NULL,
    
    -- Nombre del atributo
    attribute_name VARCHAR(100) NOT NULL,
    
    -- Valor del atributo (puede ser texto, número, booleano, array)
    attribute_value JSONB NOT NULL,
    
    -- Descripción del atributo
    description TEXT,
    
    -- Orden de visualización
    display_order INTEGER DEFAULT 0,
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: nombre único por tipo de producto
    UNIQUE(product_type, attribute_name)
);

CREATE INDEX IF NOT EXISTS idx_product_type_attributes_type ON catalog.product_type_attributes(product_type);
CREATE INDEX IF NOT EXISTS idx_product_type_attributes_is_active ON catalog.product_type_attributes(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE catalog.product_type_attributes IS 'Atributos globales para tipos de producto (ej: todos los medicamentos requieren validación)';

-- ============================================================================
-- 4. SISTEMA ESTRUCTURADO DE VARIANTES DE PRODUCTOS
-- ============================================================================

-- Crear tabla para grupos de variantes (ej: "Tamaño", "Sabor", "Color")
CREATE TABLE IF NOT EXISTS catalog.product_variant_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    
    -- Información del grupo
    name VARCHAR(100) NOT NULL, -- Ej: "Tamaño", "Sabor", "Color"
    description TEXT,
    
    -- Configuración
    is_required BOOLEAN DEFAULT FALSE, -- ¿Es obligatorio seleccionar una variante?
    selection_type VARCHAR(20) NOT NULL DEFAULT 'single' CHECK (selection_type IN ('single', 'multiple')),
    
    -- Orden de visualización
    display_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: nombre único por producto
    UNIQUE(product_id, name)
);

CREATE INDEX IF NOT EXISTS idx_variant_groups_product_id ON catalog.product_variant_groups(product_id);
CREATE INDEX IF NOT EXISTS idx_variant_groups_display_order ON catalog.product_variant_groups(product_id, display_order);

COMMENT ON TABLE catalog.product_variant_groups IS 'Grupos de variantes de un producto (ej: "Tamaño" para papas fritas)';

-- Crear tabla para variantes individuales (ej: "Chica", "Mediana", "Grande")
CREATE TABLE IF NOT EXISTS catalog.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_group_id UUID NOT NULL REFERENCES catalog.product_variant_groups(id) ON DELETE CASCADE,
    
    -- Información de la variante
    name VARCHAR(100) NOT NULL, -- Ej: "Chica", "Mediana", "Grande"
    description TEXT,
    
    -- Precio adicional (puede ser negativo para descuentos)
    -- Si es NULL, usa el precio base del producto
    price_adjustment DECIMAL(10,2) DEFAULT 0.00,
    
    -- Precio absoluto (opcional, si se especifica, ignora price_adjustment)
    -- Útil cuando el precio de la variante no es relativo al precio base
    absolute_price DECIMAL(10,2),
    
    -- Disponibilidad
    is_available BOOLEAN DEFAULT TRUE,
    
    -- Orden de visualización
    display_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: nombre único por grupo
    UNIQUE(variant_group_id, name)
);

CREATE INDEX IF NOT EXISTS idx_variants_group_id ON catalog.product_variants(variant_group_id);
CREATE INDEX IF NOT EXISTS idx_variants_display_order ON catalog.product_variants(variant_group_id, display_order);
CREATE INDEX IF NOT EXISTS idx_variants_is_available ON catalog.product_variants(is_available) WHERE is_available = TRUE;

COMMENT ON TABLE catalog.product_variants IS 'Variantes individuales de un producto (ej: "Chica" con precio +$0, "Mediana" con precio +$5, "Grande" con precio +$10)';
COMMENT ON COLUMN catalog.product_variants.price_adjustment IS 'Ajuste de precio relativo al precio base del producto';
COMMENT ON COLUMN catalog.product_variants.absolute_price IS 'Precio absoluto de la variante (si se especifica, ignora price_adjustment)';

-- ============================================================================
-- 5. MEJORA DE COLECCIONES (PAQUETES COMO PRODUCTOS)
-- ============================================================================

-- Agregar campo para tratar colecciones como productos
ALTER TABLE catalog.collections
ADD COLUMN IF NOT EXISTS is_product BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN catalog.collections.is_product IS 'Si es true, la colección se trata como un producto (aparece en listado de productos, puede tener variantes, etc.)';

-- Agregar campo para categoría (las colecciones también pueden tener categoría)
ALTER TABLE catalog.collections
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES catalog.product_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_collections_category_id ON catalog.collections(category_id);

COMMENT ON COLUMN catalog.collections.category_id IS 'Categoría de la colección (útil cuando is_product = true)';

-- Agregar campo para tipo de producto (si la colección es un producto)
ALTER TABLE catalog.collections
ADD COLUMN IF NOT EXISTS product_type catalog.product_type;

CREATE INDEX IF NOT EXISTS idx_collections_product_type ON catalog.collections(product_type);

COMMENT ON COLUMN catalog.collections.product_type IS 'Tipo de producto de la colección (útil cuando is_product = true)';

-- ============================================================================
-- 6. MEJORA DE COLLECTION_PRODUCTS (CANTIDADES FRACCIONARIAS)
-- ============================================================================

-- Cambiar quantity de INTEGER a DECIMAL para permitir fracciones
ALTER TABLE catalog.collection_products
ALTER COLUMN quantity TYPE DECIMAL(10,2);

-- Agregar campo para unidad personalizada
ALTER TABLE catalog.collection_products
ADD COLUMN IF NOT EXISTS unit_label VARCHAR(50);

COMMENT ON COLUMN catalog.collection_products.quantity IS 'Cantidad del producto en la colección (puede ser fraccionaria, ej: 0.5 para media orden)';
COMMENT ON COLUMN catalog.collection_products.unit_label IS 'Etiqueta de unidad personalizada para mostrar al cliente (ej: "porción combo", "media orden")';
COMMENT ON COLUMN catalog.collection_products.price_override IS 'Precio específico de este producto en esta colección (si difiere del precio normal)';

-- Actualizar constraint UNIQUE para incluir unit_label
-- Nota: PostgreSQL no permite COALESCE en constraints, usamos índice único con expresión
ALTER TABLE catalog.collection_products
DROP CONSTRAINT IF EXISTS collection_products_collection_id_product_id_quantity_key;

-- Crear índice único con expresión para manejar NULLs en unit_label
CREATE UNIQUE INDEX IF NOT EXISTS collection_products_unique 
    ON catalog.collection_products(collection_id, product_id, quantity, COALESCE(unit_label, ''));

-- ============================================================================
-- 7. PRODUCTOS DE FARMACIA (CAMPOS OPCIONALES)
-- ============================================================================

-- Agregar campos para productos de farmacia
ALTER TABLE catalog.products
ADD COLUMN IF NOT EXISTS requires_prescription BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS age_restriction INTEGER, -- Edad mínima requerida (NULL = sin restricción)
ADD COLUMN IF NOT EXISTS max_quantity_per_order INTEGER, -- Límite de cantidad por pedido (NULL = sin límite)
ADD COLUMN IF NOT EXISTS requires_pharmacist_validation BOOLEAN DEFAULT FALSE;

-- Agregar comentarios
COMMENT ON COLUMN catalog.products.requires_prescription IS 'Requiere receta médica (solo para productos de tipo medicine)';
COMMENT ON COLUMN catalog.products.age_restriction IS 'Edad mínima requerida para comprar (NULL = sin restricción)';
COMMENT ON COLUMN catalog.products.max_quantity_per_order IS 'Cantidad máxima permitida por pedido (NULL = sin límite)';
COMMENT ON COLUMN catalog.products.requires_pharmacist_validation IS 'Requiere validación de farmacéutico antes de procesar (solo para productos de tipo medicine)';

-- ============================================================================
-- 8. ACTUALIZAR ORDER_ITEMS PARA VARIANTES
-- ============================================================================

-- Agregar campo para almacenar selección de variantes estructuradas
ALTER TABLE orders.order_items
ADD COLUMN IF NOT EXISTS variant_selections JSONB;

COMMENT ON COLUMN orders.order_items.variant_selections IS 'JSON con selección de variantes estructuradas: {"variant_group_id": "variant_id"} o {"variant_group_id": ["variant_id1", "variant_id2"]} para múltiples';

-- Agregar campo para precio adicional de variantes
ALTER TABLE orders.order_items
ADD COLUMN IF NOT EXISTS variant_price_adjustment DECIMAL(10,2) DEFAULT 0.00;

COMMENT ON COLUMN orders.order_items.variant_price_adjustment IS 'Suma total de ajustes de precio de variantes seleccionadas';

-- Nota: El campo variant_selection (JSONB) existente se mantiene para compatibilidad
-- pero variant_selections es la versión estructurada recomendada

-- ============================================================================
-- 9. DATOS INICIALES: ATRIBUTOS DE TIPOS DE PRODUCTO
-- ============================================================================

-- Insertar atributos por defecto para tipos de producto
INSERT INTO catalog.product_type_attributes (product_type, attribute_name, attribute_value, description, display_order, is_active)
VALUES
    -- Alimentos
    ('food', 'requires_temperature_control', 'true'::jsonb, 'Requiere control de temperatura', 1, TRUE),
    ('food', 'is_perishable', 'true'::jsonb, 'Es perecedero', 2, TRUE),
    ('food', 'suggest_beverage', 'true'::jsonb, 'Sugerir bebidas al agregar', 3, TRUE),
    
    -- Bebidas
    ('beverage', 'requires_temperature_control', 'true'::jsonb, 'Requiere control de temperatura', 1, TRUE),
    ('beverage', 'suggest_food', 'false'::jsonb, 'No sugerir comida al agregar', 2, TRUE),
    
    -- Medicamentos
    ('medicine', 'requires_prescription_validation', 'true'::jsonb, 'Requiere validación de receta', 1, TRUE),
    ('medicine', 'requires_pharmacist_approval', 'true'::jsonb, 'Requiere aprobación de farmacéutico', 2, TRUE),
    ('medicine', 'has_quantity_limits', 'true'::jsonb, 'Tiene límites de cantidad', 3, TRUE),
    
    -- Abarrotes
    ('grocery', 'requires_temperature_control', 'false'::jsonb, 'No requiere control de temperatura', 1, TRUE),
    ('grocery', 'is_perishable', 'false'::jsonb, 'No es perecedero', 2, TRUE),
    
    -- No alimenticio
    ('non_food', 'requires_temperature_control', 'false'::jsonb, 'No requiere control de temperatura', 1, TRUE),
    ('non_food', 'is_perishable', 'false'::jsonb, 'No es perecedero', 2, TRUE)
ON CONFLICT (product_type, attribute_name) DO UPDATE SET
    attribute_value = EXCLUDED.attribute_value,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 10. FUNCIONES AUXILIARES
-- ============================================================================

-- Función para calcular precio de producto con variante
CREATE OR REPLACE FUNCTION catalog.calculate_product_price_with_variant(
    p_product_id UUID,
    p_variant_id UUID DEFAULT NULL
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_base_price DECIMAL(10,2);
    v_price_adjustment DECIMAL(10,2);
    v_absolute_price DECIMAL(10,2);
BEGIN
    -- Obtener precio base del producto
    SELECT price INTO v_base_price
    FROM catalog.products
    WHERE id = p_product_id;
    
    -- Si no hay variante, retornar precio base
    IF p_variant_id IS NULL THEN
        RETURN v_base_price;
    END IF;
    
    -- Obtener información de la variante
    SELECT 
        pv.price_adjustment,
        pv.absolute_price
    INTO 
        v_price_adjustment,
        v_absolute_price
    FROM catalog.product_variants pv
    WHERE pv.id = p_variant_id;
    
    -- Si la variante tiene precio absoluto, usarlo
    IF v_absolute_price IS NOT NULL THEN
        RETURN v_absolute_price;
    END IF;
    
    -- Si no, calcular precio base + ajuste
    RETURN v_base_price + COALESCE(v_price_adjustment, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION catalog.calculate_product_price_with_variant IS 'Calcula el precio de un producto considerando una variante seleccionada';

-- ============================================================================
-- 11. VISTAS ÚTILES
-- ============================================================================

-- Vista para productos con sus variantes
CREATE OR REPLACE VIEW catalog.products_with_variants AS
SELECT 
    p.id,
    p.business_id,
    p.name,
    p.description,
    p.image_url,
    p.price as base_price,
    p.product_type,
    p.category_id,
    p.is_available,
    p.is_featured,
    p.display_order,
    p.created_at,
    p.updated_at,
    -- Información de variantes
    COALESCE(
        json_agg(
            json_build_object(
                'variant_group_id', vg.id,
                'variant_group_name', vg.name,
                'variant_group_required', vg.is_required,
                'variant_group_selection_type', vg.selection_type,
                'variants', (
                    SELECT json_agg(
                        json_build_object(
                            'variant_id', v.id,
                            'variant_name', v.name,
                            'price_adjustment', v.price_adjustment,
                            'absolute_price', v.absolute_price,
                            'is_available', v.is_available,
                            'display_order', v.display_order
                        ) ORDER BY v.display_order
                    )
                    FROM catalog.product_variants v
                    WHERE v.variant_group_id = vg.id
                    AND v.is_available = TRUE
                )
            ) ORDER BY vg.display_order
        ) FILTER (WHERE vg.id IS NOT NULL),
        '[]'::json
    ) as variant_groups
FROM catalog.products p
LEFT JOIN catalog.product_variant_groups vg ON vg.product_id = p.id
GROUP BY p.id, p.business_id, p.name, p.description, p.image_url, p.price, p.product_type, 
         p.category_id, p.is_available, p.is_featured, p.display_order, p.created_at, p.updated_at;

COMMENT ON VIEW catalog.products_with_variants IS 'Vista que incluye productos con sus grupos de variantes y variantes individuales';

-- ============================================================================
-- 12. MIGRACIÓN DE DATOS EXISTENTES
-- ============================================================================

-- Migrar productos existentes: si no tienen product_type, asignar 'food' por defecto
UPDATE catalog.products
SET product_type = 'food'
WHERE product_type IS NULL;

-- Migrar variantes existentes en JSONB a estructura nueva (opcional, requiere análisis manual)
-- NOTA: Esto requiere revisar el contenido del campo variants JSONB existente
-- y crear los grupos y variantes correspondientes manualmente

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

-- Verificar que todo se creó correctamente
DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada exitosamente';
    RAISE NOTICE '   - Tipo de producto: ✅';
    RAISE NOTICE '   - Atributos de categorías: ✅';
    RAISE NOTICE '   - Atributos de tipos de producto: ✅';
    RAISE NOTICE '   - Sistema de variantes estructurado: ✅';
    RAISE NOTICE '   - Colecciones como productos: ✅';
    RAISE NOTICE '   - Cantidades fraccionarias: ✅';
    RAISE NOTICE '   - Productos de farmacia: ✅';
END $$;

-- ============================================================================
-- MIGRACIÓN: Configuración de Campos por Tipo de Producto
-- ============================================================================
-- Descripción: Define qué campos del formulario de productos deben mostrarse
--              según el tipo de producto seleccionado.
--              Esto permite personalizar el formulario y evitar campos
--              irrelevantes (ej: alérgenos para medicamentos).
-- 
-- Uso: Ejecutar después de migration_advanced_catalog_system.sql
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-01-XX
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- VERIFICAR/CREAR DEPENDENCIAS
-- ============================================================================

-- Verificar que el schema catalog existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'catalog') THEN
        RAISE EXCEPTION 'El schema "catalog" no existe. Ejecuta schema.sql primero.';
    END IF;
END $$;

-- Crear el tipo product_type si no existe (dependencia de migration_advanced_catalog_system.sql)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'catalog' AND t.typname = 'product_type'
    ) THEN
        CREATE TYPE catalog.product_type AS ENUM (
            'food',           -- Alimento
            'beverage',      -- Bebida
            'medicine',       -- Medicamento (farmacia)
            'grocery',       -- Abarrotes
            'non_food'       -- No alimenticio
        );
        RAISE NOTICE 'Tipo catalog.product_type creado (normalmente se crea en migration_advanced_catalog_system.sql)';
    END IF;
END $$;

-- ============================================================================
-- TABLA: Configuración de Campos por Tipo de Producto
-- ============================================================================

CREATE TABLE IF NOT EXISTS catalog.product_type_field_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_type catalog.product_type NOT NULL,
    
    -- Nombre del campo (ej: 'allergens', 'nutritional_info', 'requires_prescription')
    field_name VARCHAR(100) NOT NULL,
    
    -- ¿Es visible este campo para este tipo de producto?
    is_visible BOOLEAN DEFAULT TRUE,
    
    -- ¿Es requerido este campo?
    is_required BOOLEAN DEFAULT FALSE,
    
    -- Orden de visualización
    display_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: campo único por tipo de producto
    UNIQUE(product_type, field_name)
);

CREATE INDEX IF NOT EXISTS idx_product_type_field_config_type ON catalog.product_type_field_config(product_type);
CREATE INDEX IF NOT EXISTS idx_product_type_field_config_visible ON catalog.product_type_field_config(product_type, is_visible) WHERE is_visible = TRUE;

COMMENT ON TABLE catalog.product_type_field_config IS 'Configuración de qué campos mostrar en el formulario según el tipo de producto';

-- ============================================================================
-- DATOS INICIALES: Configuración de Campos por Tipo
-- ============================================================================

-- Alimentos (food)
INSERT INTO catalog.product_type_field_config (product_type, field_name, is_visible, is_required, display_order)
VALUES
    ('food', 'name', TRUE, TRUE, 1),
    ('food', 'description', TRUE, FALSE, 2),
    ('food', 'image_url', TRUE, FALSE, 3),
    ('food', 'price', TRUE, TRUE, 4),
    ('food', 'category_id', TRUE, TRUE, 5),
    ('food', 'product_type', TRUE, TRUE, 6),
    ('food', 'is_available', TRUE, FALSE, 7),
    ('food', 'is_featured', TRUE, FALSE, 8),
    ('food', 'display_order', TRUE, FALSE, 9),
    ('food', 'variant_groups', TRUE, FALSE, 10),
    ('food', 'allergens', TRUE, FALSE, 11),
    ('food', 'nutritional_info', TRUE, FALSE, 12),
    ('food', 'requires_prescription', FALSE, FALSE, 13),
    ('food', 'age_restriction', FALSE, FALSE, 14),
    ('food', 'max_quantity_per_order', FALSE, FALSE, 15),
    ('food', 'requires_pharmacist_validation', FALSE, FALSE, 16)
ON CONFLICT (product_type, field_name) DO UPDATE SET
    is_visible = EXCLUDED.is_visible,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- Bebidas (beverage)
INSERT INTO catalog.product_type_field_config (product_type, field_name, is_visible, is_required, display_order)
VALUES
    ('beverage', 'name', TRUE, TRUE, 1),
    ('beverage', 'description', TRUE, FALSE, 2),
    ('beverage', 'image_url', TRUE, FALSE, 3),
    ('beverage', 'price', TRUE, TRUE, 4),
    ('beverage', 'category_id', TRUE, TRUE, 5),
    ('beverage', 'product_type', TRUE, TRUE, 6),
    ('beverage', 'is_available', TRUE, FALSE, 7),
    ('beverage', 'is_featured', TRUE, FALSE, 8),
    ('beverage', 'display_order', TRUE, FALSE, 9),
    ('beverage', 'variant_groups', TRUE, FALSE, 10),
    ('beverage', 'allergens', TRUE, FALSE, 11),
    ('beverage', 'nutritional_info', TRUE, FALSE, 12),
    ('beverage', 'requires_prescription', FALSE, FALSE, 13),
    ('beverage', 'age_restriction', FALSE, FALSE, 14),
    ('beverage', 'max_quantity_per_order', FALSE, FALSE, 15),
    ('beverage', 'requires_pharmacist_validation', FALSE, FALSE, 16)
ON CONFLICT (product_type, field_name) DO UPDATE SET
    is_visible = EXCLUDED.is_visible,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- Medicamentos (medicine)
INSERT INTO catalog.product_type_field_config (product_type, field_name, is_visible, is_required, display_order)
VALUES
    ('medicine', 'name', TRUE, TRUE, 1),
    ('medicine', 'description', TRUE, FALSE, 2),
    ('medicine', 'image_url', TRUE, FALSE, 3),
    ('medicine', 'price', TRUE, TRUE, 4),
    ('medicine', 'category_id', TRUE, TRUE, 5),
    ('medicine', 'product_type', TRUE, TRUE, 6),
    ('medicine', 'is_available', TRUE, FALSE, 7),
    ('medicine', 'is_featured', TRUE, FALSE, 8),
    ('medicine', 'display_order', TRUE, FALSE, 9),
    ('medicine', 'variant_groups', TRUE, FALSE, 10),
    ('medicine', 'allergens', FALSE, FALSE, 11), -- NO visible para medicamentos
    ('medicine', 'nutritional_info', FALSE, FALSE, 12), -- NO visible para medicamentos
    ('medicine', 'requires_prescription', TRUE, FALSE, 13),
    ('medicine', 'age_restriction', TRUE, FALSE, 14),
    ('medicine', 'max_quantity_per_order', TRUE, FALSE, 15),
    ('medicine', 'requires_pharmacist_validation', TRUE, FALSE, 16)
ON CONFLICT (product_type, field_name) DO UPDATE SET
    is_visible = EXCLUDED.is_visible,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- Abarrotes (grocery)
INSERT INTO catalog.product_type_field_config (product_type, field_name, is_visible, is_required, display_order)
VALUES
    ('grocery', 'name', TRUE, TRUE, 1),
    ('grocery', 'description', TRUE, FALSE, 2),
    ('grocery', 'image_url', TRUE, FALSE, 3),
    ('grocery', 'price', TRUE, TRUE, 4),
    ('grocery', 'category_id', TRUE, TRUE, 5),
    ('grocery', 'product_type', TRUE, TRUE, 6),
    ('grocery', 'is_available', TRUE, FALSE, 7),
    ('grocery', 'is_featured', TRUE, FALSE, 8),
    ('grocery', 'display_order', TRUE, FALSE, 9),
    ('grocery', 'variant_groups', TRUE, FALSE, 10),
    ('grocery', 'allergens', TRUE, FALSE, 11),
    ('grocery', 'nutritional_info', TRUE, FALSE, 12),
    ('grocery', 'requires_prescription', FALSE, FALSE, 13),
    ('grocery', 'age_restriction', FALSE, FALSE, 14),
    ('grocery', 'max_quantity_per_order', FALSE, FALSE, 15),
    ('grocery', 'requires_pharmacist_validation', FALSE, FALSE, 16)
ON CONFLICT (product_type, field_name) DO UPDATE SET
    is_visible = EXCLUDED.is_visible,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- No alimenticio (non_food)
INSERT INTO catalog.product_type_field_config (product_type, field_name, is_visible, is_required, display_order)
VALUES
    ('non_food', 'name', TRUE, TRUE, 1),
    ('non_food', 'description', TRUE, FALSE, 2),
    ('non_food', 'image_url', TRUE, FALSE, 3),
    ('non_food', 'price', TRUE, TRUE, 4),
    ('non_food', 'category_id', TRUE, TRUE, 5),
    ('non_food', 'product_type', TRUE, TRUE, 6),
    ('non_food', 'is_available', TRUE, FALSE, 7),
    ('non_food', 'is_featured', TRUE, FALSE, 8),
    ('non_food', 'display_order', TRUE, FALSE, 9),
    ('non_food', 'variant_groups', TRUE, FALSE, 10),
    ('non_food', 'allergens', FALSE, FALSE, 11), -- NO visible para no alimenticios
    ('non_food', 'nutritional_info', FALSE, FALSE, 12), -- NO visible para no alimenticios
    ('non_food', 'requires_prescription', FALSE, FALSE, 13),
    ('non_food', 'age_restriction', FALSE, FALSE, 14),
    ('non_food', 'max_quantity_per_order', FALSE, FALSE, 15),
    ('non_food', 'requires_pharmacist_validation', FALSE, FALSE, 16)
ON CONFLICT (product_type, field_name) DO UPDATE SET
    is_visible = EXCLUDED.is_visible,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- FUNCIÓN: Obtener configuración de campos por tipo de producto
-- ============================================================================

CREATE OR REPLACE FUNCTION catalog.get_product_type_field_config(
    p_product_type catalog.product_type
)
RETURNS TABLE (
    field_name VARCHAR(100),
    is_visible BOOLEAN,
    is_required BOOLEAN,
    display_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ptfc.field_name,
        ptfc.is_visible,
        ptfc.is_required,
        ptfc.display_order
    FROM catalog.product_type_field_config ptfc
    WHERE ptfc.product_type = p_product_type
    ORDER BY ptfc.display_order;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION catalog.get_product_type_field_config IS 'Obtiene la configuración completa de campos (visibles e invisibles) para un tipo de producto';

-- ============================================================================
-- SISTEMA DE IMPUESTOS CONFIGURABLE
-- ============================================================================
-- Descripción: Implementación de sistema de impuestos configurable
-- 
-- Este script crea:
-- 1. Tabla catalog.tax_types: Catálogo global de tipos de impuestos
-- 2. Tabla catalog.product_taxes: Relación muchos-a-muchos entre productos e impuestos
-- 3. Modificación de orders.order_items: Agregar campo tax_breakdown
--
-- Uso: Ejecutar después de schema.sql y migration_advanced_catalog_system.sql
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2024-11-18
-- Documentación: docs/21-sistema-impuestos-configurable.md
-- ============================================================================

-- Configurar search_path
SET search_path TO catalog, orders, core, public;

-- ============================================================================
-- 1. CREAR TABLA DE TIPOS DE IMPUESTOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS catalog.tax_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Información del impuesto
    name VARCHAR(100) NOT NULL UNIQUE, -- "IVA", "Impuesto Local CDMX", etc.
    description TEXT,
    code VARCHAR(50), -- Código fiscal (ej: "IVA", "ISR", "IEPS")
    
    -- Configuración del impuesto
    rate DECIMAL(5,4) NOT NULL CHECK (rate >= 0 AND rate <= 1), -- 0.16 = 16%
    rate_type VARCHAR(20) NOT NULL DEFAULT 'percentage', -- 'percentage' o 'fixed'
    fixed_amount DECIMAL(10,2), -- Si rate_type = 'fixed'
    
    -- Aplicación
    applies_to_subtotal BOOLEAN DEFAULT TRUE, -- Se aplica al subtotal
    applies_to_delivery BOOLEAN DEFAULT FALSE, -- Se aplica al costo de envío
    applies_to_tip BOOLEAN DEFAULT FALSE, -- Se aplica a la propina
    
    -- Reglas de exención (opcional, para futuras expansiones)
    exemption_rules JSONB, -- Reglas complejas de exención
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE, -- Impuesto por defecto para nuevos productos
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tax_types_is_active ON catalog.tax_types(is_active);
CREATE INDEX IF NOT EXISTS idx_tax_types_code ON catalog.tax_types(code);
CREATE INDEX IF NOT EXISTS idx_tax_types_is_default ON catalog.tax_types(is_default);

-- Comentarios
COMMENT ON TABLE catalog.tax_types IS 'Catálogo global de tipos de impuestos configurados por administradores';
COMMENT ON COLUMN catalog.tax_types.rate IS 'Porcentaje del impuesto (0.16 = 16%) o monto fijo si rate_type = fixed';
COMMENT ON COLUMN catalog.tax_types.rate_type IS 'Tipo de cálculo: percentage (porcentaje) o fixed (monto fijo)';
COMMENT ON COLUMN catalog.tax_types.applies_to_subtotal IS 'Si el impuesto se aplica al subtotal de productos';
COMMENT ON COLUMN catalog.tax_types.applies_to_delivery IS 'Si el impuesto se aplica al costo de envío';
COMMENT ON COLUMN catalog.tax_types.applies_to_tip IS 'Si el impuesto se aplica a la propina';
COMMENT ON COLUMN catalog.tax_types.is_default IS 'Si este impuesto se asigna automáticamente a nuevos productos';

-- ============================================================================
-- 2. CREAR TABLA DE RELACIÓN PRODUCTOS-IMPUESTOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS catalog.product_taxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    tax_type_id UUID NOT NULL REFERENCES catalog.tax_types(id) ON DELETE CASCADE,
    
    -- Override opcional del porcentaje para este producto específico
    override_rate DECIMAL(5,4) CHECK (override_rate >= 0 AND override_rate <= 1), -- Si NULL, usa el rate del tax_type
    override_fixed_amount DECIMAL(10,2), -- Si rate_type = 'fixed'
    
    -- Orden de aplicación (para cuando hay múltiples impuestos)
    display_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: un producto no puede tener el mismo impuesto dos veces
    UNIQUE(product_id, tax_type_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_product_taxes_product_id ON catalog.product_taxes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_taxes_tax_type_id ON catalog.product_taxes(tax_type_id);

-- Comentarios
COMMENT ON TABLE catalog.product_taxes IS 'Relación muchos-a-muchos entre productos e impuestos';
COMMENT ON COLUMN catalog.product_taxes.override_rate IS 'Override opcional del porcentaje para este producto específico';
COMMENT ON COLUMN catalog.product_taxes.display_order IS 'Orden de visualización cuando hay múltiples impuestos';

-- ============================================================================
-- 3. MODIFICAR orders.order_items PARA AGREGAR tax_breakdown
-- ============================================================================

-- Agregar columna tax_breakdown si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'orders' 
        AND table_name = 'order_items' 
        AND column_name = 'tax_breakdown'
    ) THEN
        ALTER TABLE orders.order_items
        ADD COLUMN tax_breakdown JSONB;
        
        COMMENT ON COLUMN orders.order_items.tax_breakdown IS 'Desglose de impuestos aplicados al item. Estructura: {"taxes": [{"tax_type_id": "uuid", "tax_name": "IVA", "rate": 0.16, "amount": 16.00, "applied_to": "subtotal"}], "total_tax": 16.00}';
    END IF;
END $$;

-- ============================================================================
-- 4. INSERTAR IMPUESTOS PREDEFINIDOS
-- ============================================================================

-- IVA estándar en México (16%)
INSERT INTO catalog.tax_types (
    name,
    description,
    code,
    rate,
    rate_type,
    applies_to_subtotal,
    applies_to_delivery,
    applies_to_tip,
    is_active,
    is_default
) VALUES (
    'IVA',
    'Impuesto al Valor Agregado estándar en México',
    'IVA',
    0.16,
    'percentage',
    TRUE,
    FALSE,
    FALSE,
    TRUE,
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- Impuesto local CDMX (2% sobre plataformas de delivery)
-- Nota: Este impuesto puede variar según la jurisdicción
INSERT INTO catalog.tax_types (
    name,
    description,
    code,
    rate,
    rate_type,
    applies_to_subtotal,
    applies_to_delivery,
    applies_to_tip,
    is_active,
    is_default
) VALUES (
    'Impuesto Local CDMX',
    'Impuesto local aplicado a plataformas de delivery en la Ciudad de México',
    'TAX_CDMX',
    0.02,
    'percentage',
    TRUE,
    FALSE,
    FALSE,
    TRUE,
    FALSE
) ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 5. FUNCIÓN HELPER PARA CALCULAR IMPUESTOS
-- ============================================================================

-- Función para obtener impuestos de un producto
CREATE OR REPLACE FUNCTION catalog.get_product_taxes(p_product_id UUID)
RETURNS TABLE (
    tax_type_id UUID,
    tax_name VARCHAR(100),
    tax_code VARCHAR(50),
    rate DECIMAL(5,4),
    rate_type VARCHAR(20),
    fixed_amount DECIMAL(10,2),
    override_rate DECIMAL(5,4),
    override_fixed_amount DECIMAL(10,2),
    display_order INTEGER,
    applies_to_subtotal BOOLEAN,
    applies_to_delivery BOOLEAN,
    applies_to_tip BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tt.id as tax_type_id,
        tt.name as tax_name,
        tt.code as tax_code,
        tt.rate,
        tt.rate_type,
        tt.fixed_amount,
        pt.override_rate,
        pt.override_fixed_amount,
        pt.display_order,
        tt.applies_to_subtotal,
        tt.applies_to_delivery,
        tt.applies_to_tip
    FROM catalog.product_taxes pt
    INNER JOIN catalog.tax_types tt ON pt.tax_type_id = tt.id
    WHERE pt.product_id = p_product_id
    AND tt.is_active = TRUE
    ORDER BY pt.display_order, tt.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION catalog.get_product_taxes IS 'Obtiene todos los impuestos activos asignados a un producto';

-- ============================================================================
-- 6. TRIGGER PARA ACTUALIZAR updated_at EN tax_types
-- ============================================================================

CREATE OR REPLACE FUNCTION catalog.update_tax_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tax_types_updated_at
    BEFORE UPDATE ON catalog.tax_types
    FOR EACH ROW
    EXECUTE FUNCTION catalog.update_tax_types_updated_at();

-- ============================================================================
-- 7. VERIFICACIÓN
-- ============================================================================

-- Verificar que las tablas se crearon correctamente
DO $$
BEGIN
    -- Verificar tax_types
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'catalog' AND table_name = 'tax_types') THEN
        RAISE EXCEPTION 'Error: La tabla catalog.tax_types no se creó correctamente';
    END IF;
    
    -- Verificar product_taxes
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'catalog' AND table_name = 'product_taxes') THEN
        RAISE EXCEPTION 'Error: La tabla catalog.product_taxes no se creó correctamente';
    END IF;
    
    -- Verificar columna tax_breakdown
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'orders' 
        AND table_name = 'order_items' 
        AND column_name = 'tax_breakdown'
    ) THEN
        RAISE EXCEPTION 'Error: La columna orders.order_items.tax_breakdown no se creó correctamente';
    END IF;
    
    RAISE NOTICE '✅ Migración de sistema de impuestos completada exitosamente';
END $$;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

-- ============================================================================
-- MIGRACIÓN: Sistema de Carrito de Compras
-- ============================================================================
-- Descripción: Crea las tablas necesarias para el sistema de carrito de compras
--              que se persiste en la base de datos (no solo en localStorage)
-- 
-- Fecha: 2024-11-19
-- ============================================================================

-- ============================================================================
-- 1. TABLA: SHOPPING_CART
-- ============================================================================
-- Almacena el carrito principal de cada usuario
-- Un usuario solo puede tener un carrito activo a la vez

CREATE TABLE IF NOT EXISTS orders.shopping_cart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Usuario propietario del carrito
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Negocio/tienda del carrito (todos los productos deben ser del mismo negocio)
    business_id UUID REFERENCES core.businesses(id) ON DELETE SET NULL,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- Para limpieza automática de carritos abandonados (ej: 30 días)
    
    -- Constraint: un usuario solo puede tener un carrito activo
    CONSTRAINT shopping_cart_user_unique UNIQUE(user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_shopping_cart_user_id ON orders.shopping_cart(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_cart_business_id ON orders.shopping_cart(business_id);
CREATE INDEX IF NOT EXISTS idx_shopping_cart_expires_at ON orders.shopping_cart(expires_at) WHERE expires_at IS NOT NULL;

-- Comentarios
COMMENT ON TABLE orders.shopping_cart IS 'Carrito de compras persistente de usuarios. Un usuario solo puede tener un carrito activo.';
COMMENT ON COLUMN orders.shopping_cart.business_id IS 'Todos los productos en el carrito deben ser del mismo negocio. Se establece al agregar el primer producto.';
COMMENT ON COLUMN orders.shopping_cart.expires_at IS 'Fecha de expiración para limpieza automática de carritos abandonados. NULL = no expira.';

-- ============================================================================
-- 2. TABLA: SHOPPING_CART_ITEMS
-- ============================================================================
-- Almacena los items individuales del carrito
-- Los items idénticos (mismo producto + mismas variantes) se agrupan por cantidad

CREATE TABLE IF NOT EXISTS orders.shopping_cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Carrito al que pertenece
    cart_id UUID NOT NULL REFERENCES orders.shopping_cart(id) ON DELETE CASCADE,
    
    -- Producto
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    
    -- Variantes seleccionadas (JSONB estructurado)
    -- Formato: {"variant_group_id": "variant_id"} para selección única
    --          {"variant_group_id": ["variant_id1", "variant_id2"]} para selección múltiple
    variant_selections JSONB DEFAULT '{}'::jsonb,
    
    -- Cantidad
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    
    -- Precios (snapshot al momento de agregar al carrito)
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0), -- Precio base del producto
    variant_price_adjustment DECIMAL(10,2) DEFAULT 0.00 CHECK (variant_price_adjustment >= -999999.99), -- Suma de ajustes de precio de variantes
    item_subtotal DECIMAL(10,2) NOT NULL CHECK (item_subtotal >= 0), -- (unit_price + variant_price_adjustment) * quantity
    
    -- Notas especiales del cliente
    special_instructions TEXT,
    
    -- Columna generada para normalizar special_instructions (NULL -> '') para el constraint UNIQUE
    special_instructions_normalized TEXT GENERATED ALWAYS AS (COALESCE(special_instructions, '')) STORED,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: no duplicar items idénticos (se agrupan por cantidad)
    -- Nota: JSONB se compara por contenido, no por referencia
    CONSTRAINT shopping_cart_items_unique UNIQUE(cart_id, product_id, variant_selections, special_instructions_normalized)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_shopping_cart_items_cart_id ON orders.shopping_cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_shopping_cart_items_product_id ON orders.shopping_cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_shopping_cart_items_variant_selections ON orders.shopping_cart_items USING GIN(variant_selections);

-- Comentarios
COMMENT ON TABLE orders.shopping_cart_items IS 'Items individuales del carrito de compras. Items idénticos se agrupan incrementando la cantidad.';
COMMENT ON COLUMN orders.shopping_cart_items.variant_selections IS 'JSONB con selección de variantes. Formato: {"variant_group_id": "variant_id"} o {"variant_group_id": ["variant_id1", "variant_id2"]}';
COMMENT ON COLUMN orders.shopping_cart_items.unit_price IS 'Precio base del producto al momento de agregarlo al carrito (snapshot)';
COMMENT ON COLUMN orders.shopping_cart_items.variant_price_adjustment IS 'Suma total de ajustes de precio de las variantes seleccionadas';
COMMENT ON COLUMN orders.shopping_cart_items.item_subtotal IS 'Subtotal del item: (unit_price + variant_price_adjustment) * quantity';
COMMENT ON COLUMN orders.shopping_cart_items.special_instructions IS 'Notas especiales del cliente para este item específico';

-- ============================================================================
-- 3. FUNCIÓN: Actualizar updated_at automáticamente
-- ============================================================================

-- Función para actualizar updated_at en shopping_cart
CREATE OR REPLACE FUNCTION orders.update_shopping_cart_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para shopping_cart
DROP TRIGGER IF EXISTS trigger_update_shopping_cart_updated_at ON orders.shopping_cart;
CREATE TRIGGER trigger_update_shopping_cart_updated_at
    BEFORE UPDATE ON orders.shopping_cart
    FOR EACH ROW
    EXECUTE FUNCTION orders.update_shopping_cart_updated_at();

-- Función para actualizar updated_at en shopping_cart_items
CREATE OR REPLACE FUNCTION orders.update_shopping_cart_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para shopping_cart_items
DROP TRIGGER IF EXISTS trigger_update_shopping_cart_items_updated_at ON orders.shopping_cart_items;
CREATE TRIGGER trigger_update_shopping_cart_items_updated_at
    BEFORE UPDATE ON orders.shopping_cart_items
    FOR EACH ROW
    EXECUTE FUNCTION orders.update_shopping_cart_items_updated_at();

-- ============================================================================
-- 4. FUNCIÓN: Actualizar updated_at del carrito cuando se modifica un item
-- ============================================================================

CREATE OR REPLACE FUNCTION orders.update_cart_on_item_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar updated_at del carrito cuando se modifica un item
    UPDATE orders.shopping_cart
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.cart_id, OLD.cart_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar carrito cuando se inserta/actualiza/elimina un item
DROP TRIGGER IF EXISTS trigger_update_cart_on_item_insert ON orders.shopping_cart_items;
CREATE TRIGGER trigger_update_cart_on_item_insert
    AFTER INSERT ON orders.shopping_cart_items
    FOR EACH ROW
    EXECUTE FUNCTION orders.update_cart_on_item_change();

DROP TRIGGER IF EXISTS trigger_update_cart_on_item_update ON orders.shopping_cart_items;
CREATE TRIGGER trigger_update_cart_on_item_update
    AFTER UPDATE ON orders.shopping_cart_items
    FOR EACH ROW
    EXECUTE FUNCTION orders.update_cart_on_item_change();

DROP TRIGGER IF EXISTS trigger_update_cart_on_item_delete ON orders.shopping_cart_items;
CREATE TRIGGER trigger_update_cart_on_item_delete
    AFTER DELETE ON orders.shopping_cart_items
    FOR EACH ROW
    EXECUTE FUNCTION orders.update_cart_on_item_change();

-- ============================================================================
-- 5. VISTA: Carrito con totales calculados
-- ============================================================================

CREATE OR REPLACE VIEW orders.shopping_cart_with_totals AS
SELECT 
    sc.id,
    sc.user_id,
    sc.business_id,
    sc.created_at,
    sc.updated_at,
    sc.expires_at,
    -- Totales calculados
    COALESCE(SUM(sci.item_subtotal), 0)::DECIMAL(10,2) as cart_subtotal,
    COUNT(sci.id) as item_count,
    SUM(sci.quantity) as total_quantity
FROM orders.shopping_cart sc
LEFT JOIN orders.shopping_cart_items sci ON sci.cart_id = sc.id
GROUP BY sc.id, sc.user_id, sc.business_id, sc.created_at, sc.updated_at, sc.expires_at;

COMMENT ON VIEW orders.shopping_cart_with_totals IS 'Vista que incluye el carrito con totales calculados (subtotal, cantidad de items, cantidad total de productos)';

-- ============================================================================
-- 6. FUNCIÓN: Limpiar carritos expirados
-- ============================================================================
-- Función para eliminar carritos que han expirado (carritos abandonados)

CREATE OR REPLACE FUNCTION orders.cleanup_expired_carts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Eliminar carritos expirados (y sus items por CASCADE)
    WITH deleted AS (
        DELETE FROM orders.shopping_cart
        WHERE expires_at IS NOT NULL 
          AND expires_at < CURRENT_TIMESTAMP
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION orders.cleanup_expired_carts() IS 'Elimina carritos que han expirado. Retorna el número de carritos eliminados.';

-- ============================================================================
-- 7. NOTAS Y CONSIDERACIONES
-- ============================================================================

-- IMPORTANTE: 
-- 1. El constraint UNIQUE en shopping_cart_items previene duplicados
--    pero permite agrupar items idénticos incrementando la cantidad
-- 2. variant_selections es JSONB, por lo que se compara por contenido
-- 3. Los precios son snapshots (se guardan al momento de agregar)
-- 4. El business_id se establece al agregar el primer producto
-- 5. Todos los productos en el carrito deben ser del mismo business_id
-- 6. Los carritos expirados se pueden limpiar con la función cleanup_expired_carts()

-- Para establecer expiración automática al crear carrito:
-- INSERT INTO orders.shopping_cart (user_id, expires_at) 
-- VALUES (user_id, CURRENT_TIMESTAMP + INTERVAL '30 days');

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

-- ============================================================================
-- ✅ SCRIPT COMPLETO EJECUTADO
-- ============================================================================
-- 
-- Si llegaste hasta aquí sin errores, la base de datos está lista.
-- 
-- Próximos pasos:
-- 1. Verifica que todos los schemas se crearon correctamente
-- 2. Crea usuarios en Supabase Auth (Dashboard > Authentication > Users)
-- 3. (Opcional) Ejecuta seed_advanced_catalog_admin.sql para datos iniciales
-- 
-- Para verificar la instalación:
-- SELECT schema_name FROM information_schema.schemata 
-- WHERE schema_name IN ('core', 'catalog', 'orders', 'reviews', 'communication', 'commerce', 'social');
-- 
-- ============================================================================



