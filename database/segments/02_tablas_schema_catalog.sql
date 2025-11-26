-- ============================================================================
-- SEGMENTO 02: TABLAS DEL SCHEMA CATALOG
-- ============================================================================
-- Descripción: Tablas del schema catalog
--              - product_categories: Categorías de productos
--              - products: Productos del menú
--              - collections: Colecciones (combos, menús del día)
--              - collection_products: Relación productos-colecciones
-- 
-- Dependencias: Segmento 01 (tabla core.businesses)
-- Orden de ejecución: 02
-- ============================================================================

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
