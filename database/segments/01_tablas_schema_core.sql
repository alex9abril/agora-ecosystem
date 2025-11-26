-- ============================================================================
-- SEGMENTO 01: TABLAS DEL SCHEMA CORE
-- ============================================================================
-- Descripción: Tablas principales del schema core
--              - user_profiles: Perfiles de usuario
--              - addresses: Direcciones de usuarios
--              - businesses: Negocios/locales
--              - repartidores: Información de repartidores
-- 
-- Dependencias: 
--   - Schemas y ENUMs ya creados (líneas 1-181 del script completo)
--   - Extensiones: PostGIS
-- 
-- Orden de ejecución: 01 (primero después de schemas y ENUMs)
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
