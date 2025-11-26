-- ============================================================================
-- SEGMENTO 08: TRIGGERS Y FUNCIONES PRINCIPALES
-- ============================================================================
-- Descripción: Triggers y funciones del sistema
--              - handle_new_user(): Crear perfil automáticamente
--              - update_updated_at_column(): Actualizar timestamps
--              - update_business_rating(): Actualizar ratings de negocios
--              - update_repartidor_rating(): Actualizar ratings de repartidores
--              - update_social_post_counts(): Actualizar contadores sociales
-- 
-- Dependencias: Todos los segmentos 01-07 (todas las tablas)
-- Orden de ejecución: 08
-- ============================================================================

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
