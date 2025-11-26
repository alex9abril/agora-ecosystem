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
