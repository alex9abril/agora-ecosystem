-- ============================================================================
-- AGORA ECOSYSTEM - Purge: Pedidos de prueba
-- ============================================================================
-- Descripción: Elimina TODOS los pedidos y sus registros dependientes.
--              Script directo sin transacciones manuales para compatibilidad
--              con el SQL Editor de Supabase.
--              Cada tabla que podría no existir se maneja con EXECUTE + EXCEPTION.
-- ============================================================================
-- Versión: 2.0
-- Fecha: 2026-04-13
-- Hora: 15:00:00
-- ============================================================================

-- ============================================================================
-- PASO 1: RESTRICT — borrar ANTES del pedido (si la tabla existe)
-- ============================================================================

DO $$ BEGIN
    EXECUTE 'DELETE FROM orders.order_refunds WHERE order_id IN (SELECT id FROM orders.orders)';
    RAISE NOTICE 'order_refunds eliminados';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'order_refunds no existe, omitida';
END $$;

DO $$ BEGIN
    EXECUTE 'DELETE FROM orders.order_returns WHERE order_id IN (SELECT id FROM orders.orders)';
    RAISE NOTICE 'order_returns eliminados';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'order_returns no existe, omitida';
END $$;

-- ============================================================================
-- PASO 2: CASCADE hijos (explícito por seguridad)
-- ============================================================================

DO $$ BEGIN
    EXECUTE 'DELETE FROM orders.shipping_label_logistics_events WHERE order_id IN (SELECT id FROM orders.orders)';
    RAISE NOTICE 'shipping_label_logistics_events eliminados';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'shipping_label_logistics_events no existe, omitida';
END $$;

DO $$ BEGIN
    EXECUTE 'DELETE FROM orders.shipping_labels WHERE order_id IN (SELECT id FROM orders.orders)';
    RAISE NOTICE 'shipping_labels eliminados';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'shipping_labels no existe, omitida';
END $$;

DO $$ BEGIN
    EXECUTE 'DELETE FROM orders.order_status_history WHERE order_id IN (SELECT id FROM orders.orders)';
    RAISE NOTICE 'order_status_history eliminados';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'order_status_history no existe, omitida';
END $$;

DO $$ BEGIN
    EXECUTE 'DELETE FROM orders.payment_transactions WHERE order_id IN (SELECT id FROM orders.orders)';
    RAISE NOTICE 'payment_transactions eliminados';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'payment_transactions no existe, omitida';
END $$;

DO $$ BEGIN
    EXECUTE 'DELETE FROM orders.order_views WHERE order_id IN (SELECT id FROM orders.orders)';
    RAISE NOTICE 'order_views eliminados';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'order_views no existe, omitida';
END $$;

DO $$ BEGIN
    EXECUTE 'DELETE FROM reviews.reviews WHERE order_id IN (SELECT id FROM orders.orders)';
    RAISE NOTICE 'reviews.reviews eliminados';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'reviews.reviews no existe, omitida';
END $$;

DO $$ BEGIN
    EXECUTE 'DELETE FROM reviews.tips WHERE order_id IN (SELECT id FROM orders.orders)';
    RAISE NOTICE 'reviews.tips eliminados';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'reviews.tips no existe, omitida';
END $$;

-- ============================================================================
-- PASO 3: SET NULL — desvincular referencias en otras tablas
-- ============================================================================

DO $$ BEGIN
    EXECUTE 'UPDATE commerce.wallet_transactions SET order_id = NULL, order_item_id = NULL WHERE order_id IN (SELECT id FROM orders.orders)';
    RAISE NOTICE 'wallet_transactions desvinculados';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'wallet_transactions no existe, omitida';
END $$;

DO $$ BEGIN
    EXECUTE 'DELETE FROM commerce.promotion_uses WHERE order_id IN (SELECT id FROM orders.orders)';
    RAISE NOTICE 'promotion_uses eliminados';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'promotion_uses no existe, omitida';
END $$;

DO $$ BEGIN
    EXECUTE 'DELETE FROM communication.integration_logs WHERE order_id IN (SELECT id FROM orders.orders)';
    RAISE NOTICE 'integration_logs eliminados';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'integration_logs no existe, omitida';
END $$;

DO $$ BEGIN
    EXECUTE 'UPDATE communication.messages SET order_id = NULL WHERE order_id IN (SELECT id FROM orders.orders)';
    RAISE NOTICE 'messages desvinculados';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'messages no existe, omitida';
END $$;

DO $$ BEGIN
    EXECUTE 'UPDATE social.social_posts SET order_id = NULL WHERE order_id IN (SELECT id FROM orders.orders)';
    RAISE NOTICE 'social_posts desvinculados';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'social_posts no existe, omitida';
END $$;

-- ============================================================================
-- PASO 4: Items y entregas
-- ============================================================================

DELETE FROM orders.order_items
WHERE order_id IN (SELECT id FROM orders.orders);

DO $$ BEGIN
    EXECUTE 'DELETE FROM orders.deliveries WHERE order_id IN (SELECT id FROM orders.orders)';
    RAISE NOTICE 'deliveries eliminados';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'deliveries no existe, omitida';
END $$;

-- ============================================================================
-- PASO 5: PEDIDOS PRINCIPALES
-- ============================================================================

DELETE FROM orders.orders;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

SELECT 'PEDIDOS RESTANTES: ' || COUNT(*)::TEXT AS resultado FROM orders.orders;


-- ============================================================================
-- NOTAS
-- ============================================================================
-- 1. Este script NO usa BEGIN/COMMIT. Cada sentencia se auto-confirma.
--    NO hay modo "preview". AL EJECUTAR, SE BORRAN LOS DATOS.
--
-- 2. Cada tabla potencialmente inexistente se maneja con EXECUTE + EXCEPTION.
--
-- 3. Lo que NO se toca:
--      - catalog.products, catalog.collections
--      - core.businesses, core.stores, core.addresses
--      - auth.users, core.user_profiles
--      - orders.shopping_cart, orders.shopping_cart_items
--      - orders.integration_carts, orders.integration_cart_items
--      - communication.email_templates, branch_notification_settings
--      - commerce.promotions (solo se borran los USOS, no la promo)
--      - commerce.user_wallets (solo se desvincula order_id)
