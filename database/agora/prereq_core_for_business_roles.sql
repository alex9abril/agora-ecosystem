-- ============================================================================
-- [AGORA] - Prerequisito: core.businesses para business_roles_and_multi_store
-- ============================================================================
-- Descripción: Crea el schema core y las tablas mínimas necesarias para que
--              business_roles_and_multi_store.sql pueda ejecutarse (core.businesses).
--              Usar solo si NO has ejecutado schema.sql completo.
--
-- Requisitos: Supabase (auth.users existe). Extension postgis opcional para GIST.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-03-02
-- Hora: 12:00:00
-- ============================================================================

SET search_path TO public, core;

-- Schema core
CREATE SCHEMA IF NOT EXISTS core;

-- ENUMs necesarios para core.user_profiles y core.businesses (crear solo si no existen)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'client', 'repartidor', 'local', 'admin'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'packaging_type') THEN
        CREATE TYPE packaging_type AS ENUM (
            'biodegradable', 'reusable', 'kraft', 'traditional'
        );
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- core.user_profiles (dependencia de contexto; businesses no la referencia)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'client',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20) UNIQUE,
    profile_image_url TEXT,
    phone_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    wallet_user_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON core.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON core.user_profiles(is_active);

-- ----------------------------------------------------------------------------
-- core.addresses (core.businesses.address_id la referencia)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    label VARCHAR(100),
    street VARCHAR(255) NOT NULL,
    street_number VARCHAR(20),
    interior_number VARCHAR(20),
    neighborhood VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Ciudad de México',
    state VARCHAR(100) NOT NULL DEFAULT 'CDMX',
    postal_code VARCHAR(10) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'México',
    location POINT,
    additional_references TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON core.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_location ON core.addresses USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_addresses_is_default ON core.addresses(user_id, is_default) WHERE is_default = TRUE;

-- ----------------------------------------------------------------------------
-- core.businesses (requerida por business_roles_and_multi_store)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    description TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    category VARCHAR(100) NOT NULL,
    tags TEXT[],
    phone VARCHAR(20),
    email VARCHAR(255),
    website_url TEXT,
    address_id UUID REFERENCES core.addresses(id) ON DELETE SET NULL,
    location POINT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    accepts_orders BOOLEAN DEFAULT TRUE,
    commission_rate DECIMAL(5,2) DEFAULT 15.00,
    is_pilot_social BOOLEAN DEFAULT FALSE,
    uses_eco_packaging BOOLEAN DEFAULT FALSE,
    packaging_type packaging_type DEFAULT 'traditional',
    opening_hours JSONB,
    rating_average DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    wallet_business_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON core.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_location ON core.businesses USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_businesses_is_active ON core.businesses(is_active);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON core.businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_tags ON core.businesses USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_businesses_rating ON core.businesses(rating_average DESC);

-- ============================================================================
-- NOTAS
-- ============================================================================
-- 1. Ejecutar este script en Supabase SQL Editor ANTES de
--    database/schema/business_roles_and_multi_store.sql si no has ejecutado
--    database/schema/schema.sql completo.
-- 2. Si ya ejecutaste schema.sql, no necesitas este script.
-- 3. Índices GIST/GIN en location y tags están incluidos.
-- ============================================================================
