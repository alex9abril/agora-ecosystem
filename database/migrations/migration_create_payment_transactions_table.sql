-- ============================================================================
-- Migración: Crear tabla para transacciones de pago múltiples
-- ============================================================================
-- Esta tabla permite almacenar múltiples transacciones de pago por orden,
-- soportando pagos con wallet + tarjeta, múltiples tarjetas, etc.
-- ============================================================================

-- Crear tabla de transacciones de pago
CREATE TABLE IF NOT EXISTS orders.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con la orden
    order_id UUID NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
    
    -- Tipo de método de pago
    payment_method VARCHAR(50) NOT NULL, -- 'wallet', 'karlopay', 'card', 'cash', 'transfer'
    
    -- Información de la transacción
    transaction_id VARCHAR(255), -- ID de transacción del método de pago (ej: ID de KarloPay, UUID del wallet)
    external_reference VARCHAR(255), -- Referencia externa (ej: numberOfOrder de KarloPay, referenceNumber)
    
    -- Monto de esta transacción
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    
    -- Estado de la transacción
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled', 'refunded'
    
    -- Información adicional del pago (JSONB para flexibilidad)
    payment_data JSONB, -- Datos adicionales como cardType, lastFour, bankName, etc.
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP -- Fecha en que se completó el pago
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON orders.payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_id ON orders.payment_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_external_reference ON orders.payment_transactions(external_reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON orders.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_method ON orders.payment_transactions(payment_method);

-- Comentarios
COMMENT ON TABLE orders.payment_transactions IS 'Almacena todas las transacciones de pago relacionadas con una orden, permitiendo múltiples métodos de pago';
COMMENT ON COLUMN orders.payment_transactions.payment_method IS 'Método de pago utilizado: wallet, karlopay, card, cash, transfer';
COMMENT ON COLUMN orders.payment_transactions.transaction_id IS 'ID único de la transacción en el sistema de pago externo o interno';
COMMENT ON COLUMN orders.payment_transactions.external_reference IS 'Referencia externa como numberOfOrder de KarloPay o referenceNumber';
COMMENT ON COLUMN orders.payment_transactions.payment_data IS 'Datos adicionales del pago en formato JSON (cardType, lastFour, bankName, etc.)';

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION orders.update_payment_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_transactions_updated_at
    BEFORE UPDATE ON orders.payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION orders.update_payment_transactions_updated_at();

-- Migrar datos existentes (si hay payment_transaction_id o wallet_transaction_id en orders)
-- Esto es opcional, pero ayuda a mantener consistencia
DO $$
DECLARE
    order_record RECORD;
    wallet_tx RECORD;
BEGIN
    -- Migrar payment_transaction_id existentes
    FOR order_record IN 
        SELECT id, payment_transaction_id, payment_method, total_amount, payment_status
        FROM orders.orders
        WHERE payment_transaction_id IS NOT NULL
    LOOP
        -- Verificar si ya existe una transacción para esta orden
        IF NOT EXISTS (
            SELECT 1 FROM orders.payment_transactions 
            WHERE order_id = order_record.id 
            AND transaction_id = order_record.payment_transaction_id
        ) THEN
            INSERT INTO orders.payment_transactions (
                order_id,
                payment_method,
                transaction_id,
                amount,
                status,
                created_at,
                updated_at
            ) VALUES (
                order_record.id,
                COALESCE(order_record.payment_method, 'card'),
                order_record.payment_transaction_id,
                order_record.total_amount,
                order_record.payment_status,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            );
        END IF;
    END LOOP;
    
    -- Migrar wallet_transaction_id existentes
    FOR order_record IN 
        SELECT id, wallet_transaction_id, payment_method, total_amount, payment_status
        FROM orders.orders
        WHERE wallet_transaction_id IS NOT NULL
    LOOP
        -- Verificar si ya existe una transacción para esta orden
        IF NOT EXISTS (
            SELECT 1 FROM orders.payment_transactions 
            WHERE order_id = order_record.id 
            AND transaction_id = order_record.wallet_transaction_id
        ) THEN
            -- Buscar el monto real de la transacción del wallet
            SELECT amount INTO wallet_tx
            FROM commerce.wallet_transactions
            WHERE id::text = order_record.wallet_transaction_id
            OR id::text LIKE '%' || order_record.wallet_transaction_id || '%'
            LIMIT 1;
            
            INSERT INTO orders.payment_transactions (
                order_id,
                payment_method,
                transaction_id,
                amount,
                status,
                created_at,
                updated_at
            ) VALUES (
                order_record.id,
                'wallet',
                order_record.wallet_transaction_id,
                COALESCE(wallet_tx.amount, order_record.total_amount),
                order_record.payment_status,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            );
        END IF;
    END LOOP;
END $$;

-- Verificación
SELECT 
    'Tabla creada exitosamente' as status,
    COUNT(*) as total_payment_transactions
FROM orders.payment_transactions;

