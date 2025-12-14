-- ============================================================================
-- Script para migrar transacciones de un pedido específico
-- Orden ID: b62b0385-c42f-4ed6-9419-0aed4703f7ab
-- ============================================================================

-- 1. Verificar el pedido
SELECT 
    o.id,
    o.payment_method,
    o.payment_transaction_id,
    o.wallet_transaction_id,
    o.total_amount,
    o.payment_status,
    o.delivery_notes,
    (SELECT COUNT(*) FROM orders.payment_transactions pt WHERE pt.order_id = o.id) as payment_transactions_count
FROM orders.orders o
WHERE o.id = 'b62b0385-c42f-4ed6-9419-0aed4703f7ab';

-- 2. Buscar transacciones del wallet relacionadas con este pedido
SELECT 
    wt.id,
    wt.user_id,
    wt.transaction_type,
    wt.amount,
    wt.status,
    wt.order_id,
    wt.created_at
FROM commerce.wallet_transactions wt
WHERE wt.user_id = '49048af8-8970-48ac-81a6-ebf63c7070f2'
  AND wt.transaction_type = 'payment'
  AND wt.created_at >= '2025-12-12 21:49:00'
  AND wt.created_at <= '2025-12-12 21:50:00'
ORDER BY wt.created_at DESC;

-- 3. Migrar transacción del wallet ($100.00)
-- Primero buscar la transacción del wallet
DO $$
DECLARE
    wallet_tx_id UUID;
    wallet_amount DECIMAL(10,2) := 100.00; -- Del delivery_notes
BEGIN
    -- Buscar la transacción del wallet más reciente del usuario en ese rango de tiempo
    SELECT id INTO wallet_tx_id
    FROM commerce.wallet_transactions
    WHERE user_id = '49048af8-8970-48ac-81a6-ebf63c7070f2'
      AND transaction_type = 'payment'
      AND amount = 100.00
      AND created_at >= '2025-12-12 21:49:00'
      AND created_at <= '2025-12-12 21:50:00'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF wallet_tx_id IS NOT NULL THEN
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
            'b62b0385-c42f-4ed6-9419-0aed4703f7ab',
            'wallet',
            wallet_tx_id::text,
            100.00,
            'completed',
            jsonb_build_object(
                'wallet_transaction_id', wallet_tx_id::text,
                'migrated', true,
                'migration_date', CURRENT_TIMESTAMP,
                'source', 'delivery_notes'
            ),
            CURRENT_TIMESTAMP,
            '2025-12-12 21:49:07'::timestamp,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✅ Transacción wallet migrada: %', wallet_tx_id;
    ELSE
        -- Si no encontramos la transacción, crear una con el monto del delivery_notes
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
            'b62b0385-c42f-4ed6-9419-0aed4703f7ab',
            'wallet',
            'MIGRATED_WALLET_' || 'b62b0385-c42f-4ed6-9419-0aed4703f7ab',
            100.00,
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
        )
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✅ Transacción wallet creada desde delivery_notes';
    END IF;
END $$;

-- 4. Migrar transacción de KarloPay ($223.00)
-- Extraer numberOfOrder de delivery_notes: AGORA_C1CA1A259F794C4EB056
INSERT INTO orders.payment_transactions (
    order_id,
    payment_method,
    transaction_id,
    external_reference,
    amount,
    status,
    payment_data,
    created_at,
    updated_at
) VALUES (
    'b62b0385-c42f-4ed6-9419-0aed4703f7ab',
    'karlopay',
    'AGORA_C1CA1A259F794C4EB056',
    'AGORA_C1CA1A259F794C4EB056',
    223.00,
    'pending', -- Pendiente hasta que se confirme el pago
    jsonb_build_object(
        'karlopay_number_of_order', 'AGORA_C1CA1A259F794C4EB056',
        'karlopay_payment_url', 'https://short.karlo.io/get?id=f934ac94-5d9b-4d49-9e02-5028f07d2701',
        'migrated', true,
        'migration_date', CURRENT_TIMESTAMP,
        'source', 'delivery_notes',
        'note', 'Transacción migrada desde delivery_notes - Tarjeta de crédito/débito ($223.00)'
    ),
    '2025-12-12 21:49:07'::timestamp,
    CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- 5. Verificar las transacciones migradas
SELECT 
    pt.*,
    pt.payment_data->>'cardType' as card_type,
    pt.payment_data->>'lastFour' as last_four,
    pt.payment_data->>'referenceNumber' as reference_number
FROM orders.payment_transactions pt
WHERE pt.order_id = 'b62b0385-c42f-4ed6-9419-0aed4703f7ab'
ORDER BY pt.created_at ASC;

-- 6. Verificar que la suma de las transacciones sea igual al total
SELECT 
    o.id,
    o.total_amount,
    COALESCE(SUM(pt.amount), 0) as total_transacciones,
    o.total_amount - COALESCE(SUM(pt.amount), 0) as diferencia
FROM orders.orders o
LEFT JOIN orders.payment_transactions pt ON pt.order_id = o.id
WHERE o.id = 'b62b0385-c42f-4ed6-9419-0aed4703f7ab'
GROUP BY o.id, o.total_amount;

