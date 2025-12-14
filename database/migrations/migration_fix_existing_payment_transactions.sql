-- ============================================================================
-- Script para verificar y migrar transacciones de pago existentes
-- ============================================================================
-- Este script busca órdenes que tienen payment_transaction_id o wallet_transaction_id
-- pero no tienen registros en payment_transactions, y los migra.
-- ============================================================================

-- 1. Verificar órdenes con payment_transaction_id pero sin payment_transactions
SELECT 
    o.id as order_id,
    o.payment_method,
    o.payment_transaction_id,
    o.wallet_transaction_id,
    o.total_amount,
    o.payment_status,
    (SELECT COUNT(*) FROM orders.payment_transactions pt WHERE pt.order_id = o.id) as payment_transactions_count
FROM orders.orders o
WHERE (o.payment_transaction_id IS NOT NULL OR o.wallet_transaction_id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM orders.payment_transactions pt 
    WHERE pt.order_id = o.id
  )
ORDER BY o.created_at DESC
LIMIT 20;

-- 2. Migrar transacciones de wallet existentes
DO $$
DECLARE
    order_record RECORD;
    wallet_tx RECORD;
    wallet_amount DECIMAL(10,2);
BEGIN
    FOR order_record IN 
        SELECT 
            o.id,
            o.wallet_transaction_id,
            o.total_amount,
            o.payment_status,
            o.payment_method
        FROM orders.orders o
        WHERE o.wallet_transaction_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM orders.payment_transactions pt 
            WHERE pt.order_id = o.id 
            AND pt.payment_method = 'wallet'
            AND pt.transaction_id = o.wallet_transaction_id
          )
    LOOP
        -- Buscar la transacción del wallet para obtener el monto real
        SELECT amount, id INTO wallet_tx
        FROM commerce.wallet_transactions
        WHERE id::text = order_record.wallet_transaction_id
           OR id::text LIKE '%' || order_record.wallet_transaction_id || '%'
        ORDER BY created_at DESC
        LIMIT 1;
        
        -- Si no encontramos la transacción, usar el total_amount como fallback
        wallet_amount := COALESCE(wallet_tx.amount, order_record.total_amount);
        
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
            order_record.id,
            'wallet',
            order_record.wallet_transaction_id,
            wallet_amount,
            CASE 
                WHEN order_record.payment_status = 'paid' THEN 'completed'
                ELSE 'pending'
            END,
            jsonb_build_object(
                'wallet_transaction_id', order_record.wallet_transaction_id,
                'migrated', true,
                'migration_date', CURRENT_TIMESTAMP
            ),
            CASE 
                WHEN order_record.payment_status = 'paid' THEN CURRENT_TIMESTAMP
                ELSE NULL
            END,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Migrada transacción wallet para orden %: %', order_record.id, wallet_amount;
    END LOOP;
END $$;

-- 3. Migrar transacciones de KarloPay existentes
-- Buscar en delivery_notes el numberOfOrder de KarloPay
DO $$
DECLARE
    order_record RECORD;
    karlopay_order_number TEXT;
    karlopay_amount DECIMAL(10,2);
BEGIN
    FOR order_record IN 
        SELECT 
            o.id,
            o.delivery_notes,
            o.total_amount,
            o.payment_status,
            o.payment_method,
            o.payment_transaction_id
        FROM orders.orders o
        WHERE (o.delivery_notes LIKE '%Karlopay Order:%' 
               OR o.payment_transaction_id IS NOT NULL
               OR o.payment_method IN ('karlopay', 'card'))
          AND NOT EXISTS (
            SELECT 1 FROM orders.payment_transactions pt 
            WHERE pt.order_id = o.id 
            AND pt.payment_method IN ('karlopay', 'card')
          )
    LOOP
        -- Extraer numberOfOrder de delivery_notes
        karlopay_order_number := NULL;
        IF order_record.delivery_notes IS NOT NULL THEN
            -- Buscar patrón "Karlopay Order: {number}"
            SELECT regexp_replace(
                regexp_replace(order_record.delivery_notes, '.*Karlopay Order:\s*([^\n]+).*', '\1', 'g'),
                '\s+', '', 'g'
            ) INTO karlopay_order_number
            WHERE order_record.delivery_notes ~ 'Karlopay Order:';
        END IF;
        
        -- Si no encontramos en delivery_notes, usar payment_transaction_id
        IF karlopay_order_number IS NULL OR karlopay_order_number = '' THEN
            karlopay_order_number := order_record.payment_transaction_id;
        END IF;
        
        -- Si aún no tenemos número, usar un identificador basado en el order_id
        IF karlopay_order_number IS NULL OR karlopay_order_number = '' THEN
            karlopay_order_number := 'MIGRATED_' || REPLACE(order_record.id::text, '-', '');
        END IF;
        
        -- Calcular el monto (si hay wallet_transaction_id, restar ese monto del total)
        karlopay_amount := order_record.total_amount;
        
        -- Si hay una transacción de wallet, restar su monto
        SELECT COALESCE(SUM(pt.amount), 0) INTO karlopay_amount
        FROM orders.payment_transactions pt
        WHERE pt.order_id = order_record.id
          AND pt.payment_method = 'wallet';
        
        karlopay_amount := order_record.total_amount - karlopay_amount;
        
        -- Solo crear la transacción si el monto es mayor a 0
        IF karlopay_amount > 0 THEN
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
                order_record.id,
                CASE 
                    WHEN order_record.payment_method IN ('karlopay', 'card') THEN 'karlopay'
                    ELSE 'karlopay'
                END,
                karlopay_order_number,
                karlopay_order_number,
                karlopay_amount,
                CASE 
                    WHEN order_record.payment_status = 'paid' THEN 'completed'
                    ELSE 'pending'
                END,
                jsonb_build_object(
                    'karlopay_number_of_order', karlopay_order_number,
                    'migrated', true,
                    'migration_date', CURRENT_TIMESTAMP,
                    'original_payment_method', order_record.payment_method
                ),
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT DO NOTHING;
            
            RAISE NOTICE 'Migrada transacción KarloPay para orden %: % (numberOfOrder: %)', 
                order_record.id, karlopay_amount, karlopay_order_number;
        END IF;
    END LOOP;
END $$;

-- 4. Verificar resultados
SELECT 
    'Resumen de migración' as info,
    COUNT(DISTINCT pt.order_id) as ordenes_con_transacciones,
    COUNT(*) as total_transacciones,
    COUNT(*) FILTER (WHERE pt.payment_method = 'wallet') as transacciones_wallet,
    COUNT(*) FILTER (WHERE pt.payment_method = 'karlopay') as transacciones_karlopay
FROM orders.payment_transactions pt;

-- 5. Mostrar órdenes con múltiples métodos de pago
SELECT 
    o.id as order_id,
    o.total_amount,
    o.payment_status,
    COUNT(pt.id) as transacciones_count,
    STRING_AGG(pt.payment_method || ' (' || pt.amount || ')', ' + ') as metodos_pago
FROM orders.orders o
INNER JOIN orders.payment_transactions pt ON pt.order_id = o.id
GROUP BY o.id, o.total_amount, o.payment_status
HAVING COUNT(pt.id) > 1
ORDER BY o.created_at DESC
LIMIT 10;


