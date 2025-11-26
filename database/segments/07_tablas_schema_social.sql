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
