-- ============================================================================
-- MIGRACIÓN: Cambiar campos wallet de UUID a VARCHAR(255)
-- ============================================================================
-- Descripción: Actualiza los campos relacionados con Wallet de UUID a VARCHAR
--              para permitir identificadores de tipo string
-- 
-- Uso: Ejecutar este script si ya tienes las tablas creadas con UUID
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2024-11-18
-- ============================================================================

-- Configurar search_path
SET search_path TO public, core, orders, reviews, commerce, social;

-- ============================================================================
-- ALTER TABLES: Cambiar tipo de UUID a VARCHAR(255)
-- ============================================================================

-- 1. core.user_profiles.wallet_user_id
ALTER TABLE core.user_profiles 
    ALTER COLUMN wallet_user_id TYPE VARCHAR(255) USING wallet_user_id::TEXT;

-- 2. core.businesses.wallet_business_id
ALTER TABLE core.businesses 
    ALTER COLUMN wallet_business_id TYPE VARCHAR(255) USING wallet_business_id::TEXT;

-- 3. core.repartidores.wallet_repartidor_id
ALTER TABLE core.repartidores 
    ALTER COLUMN wallet_repartidor_id TYPE VARCHAR(255) USING wallet_repartidor_id::TEXT;

-- 4. orders.orders.wallet_transaction_id
ALTER TABLE orders.orders 
    ALTER COLUMN wallet_transaction_id TYPE VARCHAR(255) USING wallet_transaction_id::TEXT;

-- 5. reviews.tips.wallet_transaction_id
ALTER TABLE reviews.tips 
    ALTER COLUMN wallet_transaction_id TYPE VARCHAR(255) USING wallet_transaction_id::TEXT;

-- 6. commerce.subscriptions.wallet_subscription_id
ALTER TABLE commerce.subscriptions 
    ALTER COLUMN wallet_subscription_id TYPE VARCHAR(255) USING wallet_subscription_id::TEXT;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que los cambios se aplicaron correctamente
SELECT 
    table_schema,
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE column_name LIKE 'wallet%'
  AND table_schema IN ('core', 'orders', 'reviews', 'commerce')
ORDER BY table_schema, table_name, column_name;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

