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
