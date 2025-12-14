-- ============================================================================
-- Script para verificar y corregir la transacción del wallet
-- Orden ID: 0065684b-b9ed-4283-9ee4-ed9543b26c2e
-- ============================================================================

-- 0. PRIMERO: Verificar si el pedido existe
SELECT 
    CASE 
        WHEN EXISTS(SELECT 1 FROM orders.orders WHERE id = '0065684b-b9ed-4283-9ee4-ed9543b26c2e') 
        THEN '✅ El pedido existe'
        ELSE '❌ El pedido NO existe'
    END as pedido_status;

-- 1. Verificar el pedido y sus transacciones actuales
SELECT 
    o.id,
    o.client_id,
    o.total_amount,
    o.wallet_transaction_id,
    o.payment_transaction_id,
    o.delivery_notes,
    o.created_at,
    (SELECT COUNT(*) FROM orders.payment_transactions pt WHERE pt.order_id = o.id) as payment_transactions_count,
    (SELECT json_agg(json_build_object(
        'id', pt.id,
        'payment_method', pt.payment_method,
        'amount', pt.amount,
        'status', pt.status
    )) FROM orders.payment_transactions pt WHERE pt.order_id = o.id) as current_transactions
FROM orders.orders o
WHERE o.id = '0065684b-b9ed-4283-9ee4-ed9543b26c2e';

-- 2. Obtener el client_id del pedido para buscar transacciones del wallet
SELECT 
    o.id as order_id,
    o.client_id,
    o.total_amount,
    o.created_at as order_created_at
FROM orders.orders o
WHERE o.id = '0065684b-b9ed-4283-9ee4-ed9543b26c2e';

-- 3. Buscar transacciones del wallet relacionadas con este pedido
-- (Usaremos el client_id del pedido y un rango de tiempo basado en la fecha del pedido)
DO $$
DECLARE
    order_client_id UUID;
    order_created_at TIMESTAMP;
    search_start TIMESTAMP;
    search_end TIMESTAMP;
BEGIN
    -- Obtener client_id y created_at del pedido
    SELECT client_id, created_at INTO order_client_id, order_created_at
    FROM orders.orders
    WHERE id = '0065684b-b9ed-4283-9ee4-ed9543b26c2e';
    
    IF order_client_id IS NULL THEN
        RAISE EXCEPTION '❌ No se encontró el pedido';
    END IF;
    
    -- Buscar transacciones del wallet en un rango de ±5 minutos alrededor de la fecha del pedido
    search_start := order_created_at - INTERVAL '5 minutes';
    search_end := order_created_at + INTERVAL '5 minutes';
    
    RAISE NOTICE '🔍 Buscando transacciones del wallet para cliente % entre % y %', order_client_id, search_start, search_end;
END $$;

-- 3.1. Buscar transacciones del wallet (ejecutar después de obtener el client_id)
SELECT 
    wt.id,
    wt.user_id,
    wt.transaction_type,
    wt.amount,
    wt.status,
    wt.order_id,
    wt.description,
    wt.reason,
    wt.created_at
FROM commerce.wallet_transactions wt
WHERE wt.user_id = (SELECT client_id FROM orders.orders WHERE id = '0065684b-b9ed-4283-9ee4-ed9543b26c2e')
  AND wt.transaction_type = 'payment'
  AND wt.created_at >= (SELECT created_at - INTERVAL '5 minutes' FROM orders.orders WHERE id = '0065684b-b9ed-4283-9ee4-ed9543b26c2e')
  AND wt.created_at <= (SELECT created_at + INTERVAL '5 minutes' FROM orders.orders WHERE id = '0065684b-b9ed-4283-9ee4-ed9543b26c2e')
ORDER BY wt.created_at DESC;

-- 4. Verificar si ya existe una transacción del wallet en payment_transactions
SELECT 
    pt.*
FROM orders.payment_transactions pt
WHERE pt.order_id = '0065684b-b9ed-4283-9ee4-ed9543b26c2e'
  AND pt.payment_method = 'wallet';

-- 5. Crear o actualizar la transacción del wallet
DO $$
DECLARE
    wallet_tx_id UUID;
    wallet_amount DECIMAL(10,2);
    existing_wallet_tx_id UUID;
    order_client_id UUID;
    order_created_at TIMESTAMP;
    order_total_amount DECIMAL(10,2);
    order_delivery_notes TEXT;
    order_exists BOOLEAN;
    target_order_id UUID := '0065684b-b9ed-4283-9ee4-ed9543b26c2e';
    search_start TIMESTAMP;
    search_end TIMESTAMP;
BEGIN
    -- PRIMERO: Verificar que el pedido existe y obtener información
    SELECT EXISTS(SELECT 1 FROM orders.orders WHERE id = target_order_id) INTO order_exists;
    
    IF NOT order_exists THEN
        RAISE EXCEPTION '❌ ERROR: El pedido con ID % no existe en orders.orders. Verifica el ID del pedido.', target_order_id;
    END IF;
    
    -- Obtener información del pedido
    SELECT client_id, total_amount, created_at, delivery_notes
    INTO order_client_id, order_total_amount, order_created_at, order_delivery_notes
    FROM orders.orders
    WHERE id = target_order_id;
    
    RAISE NOTICE '✅ Pedido verificado: %', target_order_id;
    RAISE NOTICE '   Cliente: %, Total: %, Creado: %', order_client_id, order_total_amount, order_created_at;
    
    -- Intentar extraer el monto del wallet desde delivery_notes
    -- Formato esperado: "Monedero electrónico ($XXX.XX)"
    IF order_delivery_notes IS NOT NULL AND order_delivery_notes ~ 'Monedero electrónico' THEN
        -- Extraer el monto del wallet desde delivery_notes
        SELECT (regexp_match(order_delivery_notes, 'Monedero electrónico \(\$([0-9]+\.?[0-9]*)\)'))[1]::DECIMAL INTO wallet_amount;
        RAISE NOTICE '💰 Monto del wallet extraído de delivery_notes: %', wallet_amount;
    ELSE
        -- Si no podemos extraer el monto, usar un valor por defecto o calcularlo
        -- Asumimos que si hay una transacción de KarloPay, el wallet es la diferencia
        SELECT COALESCE(
            (SELECT order_total_amount - COALESCE(SUM(amount), 0) 
             FROM orders.payment_transactions 
             WHERE order_id = target_order_id AND payment_method != 'wallet'),
            100.00  -- Valor por defecto
        ) INTO wallet_amount;
        RAISE NOTICE '💰 Monto del wallet calculado: %', wallet_amount;
    END IF;
    
    -- Calcular rango de búsqueda
    search_start := order_created_at - INTERVAL '5 minutes';
    search_end := order_created_at + INTERVAL '5 minutes';
    
    -- Verificar si ya existe una transacción del wallet
    SELECT id INTO existing_wallet_tx_id
    FROM orders.payment_transactions
    WHERE order_id = target_order_id
      AND payment_method = 'wallet'
    LIMIT 1;
    
    IF existing_wallet_tx_id IS NOT NULL THEN
        RAISE NOTICE '⚠️ Ya existe una transacción del wallet con ID: %', existing_wallet_tx_id;
    ELSE
        RAISE NOTICE '🔍 Buscando transacción del wallet en commerce.wallet_transactions...';
        RAISE NOTICE '   Rango de búsqueda: % a %', search_start, search_end;
        
        -- Buscar la transacción del wallet más reciente del usuario en ese rango de tiempo
        -- Primero intentar con el monto exacto
        SELECT id INTO wallet_tx_id
        FROM commerce.wallet_transactions
        WHERE user_id = order_client_id
          AND transaction_type = 'payment'
          AND amount = wallet_amount
          AND created_at >= search_start
          AND created_at <= search_end
        ORDER BY created_at DESC
        LIMIT 1;
        
        -- Si no encontramos con el monto exacto, buscar la más reciente en el rango
        IF wallet_tx_id IS NULL THEN
            RAISE NOTICE '⚠️ No se encontró transacción con monto exacto %. Buscando la más reciente...', wallet_amount;
            SELECT id INTO wallet_tx_id
            FROM commerce.wallet_transactions
            WHERE user_id = order_client_id
              AND transaction_type = 'payment'
              AND created_at >= search_start
              AND created_at <= search_end
            ORDER BY created_at DESC
            LIMIT 1;
            
            -- Si encontramos una, usar su monto
            IF wallet_tx_id IS NOT NULL THEN
                SELECT amount INTO wallet_amount
                FROM commerce.wallet_transactions
                WHERE id = wallet_tx_id;
                RAISE NOTICE '✅ Transacción encontrada con monto: %', wallet_amount;
            END IF;
        END IF;
        
        IF wallet_tx_id IS NOT NULL THEN
            RAISE NOTICE '✅ Transacción del wallet encontrada: %', wallet_tx_id;
            
            -- Obtener detalles de la transacción del wallet
            DECLARE
                wallet_balance_before DECIMAL(10,2);
                wallet_balance_after DECIMAL(10,2);
                wallet_description TEXT;
                wallet_reason TEXT;
                wallet_created_at TIMESTAMP;
            BEGIN
                SELECT balance_before, balance_after, description, reason, created_at
                INTO wallet_balance_before, wallet_balance_after, wallet_description, wallet_reason, wallet_created_at
                FROM commerce.wallet_transactions
                WHERE id = wallet_tx_id;
                
                -- Insertar transacción del wallet
                INSERT INTO orders.payment_transactions (
                    order_id,
                    payment_method,
                    transaction_id,
                    amount,
                    status,
                    payment_data,
                    completed_at,
                    created_at,
                    updated_at
                ) VALUES (
                    target_order_id,
                    'wallet',
                    wallet_tx_id::text,
                    wallet_amount,
                    'completed',
                    jsonb_build_object(
                        'wallet_transaction_id', wallet_tx_id::text,
                        'balance_before', wallet_balance_before,
                        'balance_after', wallet_balance_after,
                        'description', wallet_description,
                        'reason', wallet_reason,
                        'migrated', true,
                        'migration_date', CURRENT_TIMESTAMP,
                        'source', 'commerce.wallet_transactions'
                    ),
                    COALESCE(wallet_created_at, CURRENT_TIMESTAMP),
                    COALESCE(wallet_created_at, '2025-12-12 21:49:07'::timestamp),
                    CURRENT_TIMESTAMP
                );
                
                RAISE NOTICE '✅ Transacción wallet creada exitosamente con ID de wallet: %', wallet_tx_id;
            END;
        ELSE
            RAISE NOTICE '⚠️ No se encontró transacción del wallet en commerce.wallet_transactions. Creando desde delivery_notes...';
            
            -- Crear transacción del wallet desde delivery_notes
            INSERT INTO orders.payment_transactions (
                order_id,
                payment_method,
                transaction_id,
                amount,
                status,
                payment_data,
                completed_at,
                created_at,
                updated_at
            ) VALUES (
                target_order_id,
                'wallet',
                'MIGRATED_WALLET_' || target_order_id,
                wallet_amount,
                'completed',
                jsonb_build_object(
                    'migrated', true,
                    'migration_date', CURRENT_TIMESTAMP,
                    'source', 'delivery_notes',
                    'note', 'Transacción migrada desde delivery_notes - Monedero electrónico ($100.00)'
                ),
                CURRENT_TIMESTAMP,
                '2025-12-12 21:49:07'::timestamp,
                CURRENT_TIMESTAMP
            );
            
            RAISE NOTICE '✅ Transacción wallet creada desde delivery_notes';
        END IF;
    END IF;
END $$;

-- 6. Verificar todas las transacciones después de la corrección
SELECT 
    pt.id,
    pt.payment_method,
    pt.amount,
    pt.status,
    pt.transaction_id,
    pt.external_reference,
    pt.created_at,
    pt.completed_at,
    pt.payment_data->>'wallet_transaction_id' as wallet_transaction_id,
    pt.payment_data->>'karlopay_number_of_order' as karlopay_order_number
FROM orders.payment_transactions pt
WHERE pt.order_id = '0065684b-b9ed-4283-9ee4-ed9543b26c2e'
ORDER BY pt.created_at ASC;

-- 7. Verificar que la suma de las transacciones sea igual al total
SELECT 
    o.id,
    o.total_amount,
    COALESCE(SUM(pt.amount), 0) as total_transacciones,
    o.total_amount - COALESCE(SUM(pt.amount), 0) as diferencia,
    COUNT(pt.id) as cantidad_transacciones
FROM orders.orders o
LEFT JOIN orders.payment_transactions pt ON pt.order_id = o.id
WHERE o.id = '0065684b-b9ed-4283-9ee4-ed9543b26c2e'
GROUP BY o.id, o.total_amount;

