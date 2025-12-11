-- ============================================================================
-- MIGRACIÓN: Sistema de Monedero Electrónico (Wallet) Integrado
-- ============================================================================
-- Descripción: Crea el sistema completo de monedero electrónico para usuarios,
--              permitiendo acreditar saldo por notas de crédito, usar saldo
--              como método de pago, y registrar todos los movimientos.
-- 
-- Fecha: 2025-01-XX
-- Versión: 1.0
-- ============================================================================

-- Configurar search_path
SET search_path TO core, orders, commerce, public;

-- ============================================================================
-- 1. TABLA: WALLETS (Monederos de Usuarios)
-- ============================================================================
-- Almacena el saldo actual de cada usuario

CREATE TABLE IF NOT EXISTS commerce.user_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con usuario
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Saldo actual (siempre >= 0)
    balance DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    
    -- Estado del wallet
    is_active BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: Un usuario solo puede tener un wallet
    CONSTRAINT user_wallets_user_unique UNIQUE(user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON commerce.user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_is_active ON commerce.user_wallets(is_active) WHERE is_active = TRUE;

-- Comentarios
COMMENT ON TABLE commerce.user_wallets IS 
    'Monederos electrónicos de usuarios. Almacena el saldo disponible para usar como método de pago.';
COMMENT ON COLUMN commerce.user_wallets.balance IS 
    'Saldo actual disponible en el wallet (siempre >= 0)';
COMMENT ON COLUMN commerce.user_wallets.is_blocked IS 
    'Si el wallet está bloqueado (por fraude, violación de términos, etc.)';

-- ============================================================================
-- 2. TABLA: WALLET_TRANSACTIONS (Transacciones del Wallet)
-- ============================================================================
-- Registra todos los movimientos (entradas y salidas) del wallet

CREATE TYPE wallet_transaction_type AS ENUM (
    'credit',           -- Acreditación (entrada de dinero)
    'debit',            -- Débito (salida de dinero)
    'refund',           -- Reembolso al wallet
    'payment',          -- Pago usando wallet
    'adjustment'        -- Ajuste manual (admin)
);

CREATE TYPE wallet_transaction_status AS ENUM (
    'pending',          -- Transacción pendiente
    'completed',        -- Transacción completada
    'failed',           -- Transacción fallida
    'cancelled'         -- Transacción cancelada
);

CREATE TABLE IF NOT EXISTS commerce.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con wallet
    wallet_id UUID NOT NULL REFERENCES commerce.user_wallets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Tipo y monto
    transaction_type wallet_transaction_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    
    -- Estado
    status wallet_transaction_status NOT NULL DEFAULT 'pending',
    
    -- Balance antes y después de la transacción
    balance_before DECIMAL(10,2) NOT NULL CHECK (balance_before >= 0),
    balance_after DECIMAL(10,2) NOT NULL CHECK (balance_after >= 0),
    
    -- Referencias a otras entidades (opcional)
    order_id UUID REFERENCES orders.orders(id) ON DELETE SET NULL,
    order_item_id UUID REFERENCES orders.order_items(id) ON DELETE SET NULL,
    
    -- Descripción y razón
    description TEXT,
    reason TEXT, -- Razón específica (ej: "Nota de crédito por falta de stock", "Pago parcial de pedido")
    
    -- Metadata de auditoría
    created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_role user_role, -- 'client', 'repartidor', 'local', 'admin'
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON commerce.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON commerce.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_order_id ON commerce.wallet_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON commerce.wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON commerce.wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON commerce.wallet_transactions(created_at DESC);

-- Comentarios
COMMENT ON TABLE commerce.wallet_transactions IS 
    'Registro completo de todas las transacciones del wallet (entradas y salidas) para auditoría y seguimiento';
COMMENT ON COLUMN commerce.wallet_transactions.transaction_type IS 
    'Tipo de transacción: credit (acreditación), debit (débito), refund (reembolso), payment (pago), adjustment (ajuste manual)';
COMMENT ON COLUMN commerce.wallet_transactions.balance_before IS 
    'Saldo del wallet antes de esta transacción';
COMMENT ON COLUMN commerce.wallet_transactions.balance_after IS 
    'Saldo del wallet después de esta transacción';
COMMENT ON COLUMN commerce.wallet_transactions.reason IS 
    'Razón específica de la transacción (ej: "Nota de crédito por falta de stock de 1 unidad de producto X")';

-- ============================================================================
-- 3. FUNCIÓN: Crear wallet automáticamente para nuevos usuarios
-- ============================================================================

CREATE OR REPLACE FUNCTION commerce.create_wallet_for_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Crear wallet automáticamente cuando se crea un perfil de usuario
    INSERT INTO commerce.user_wallets (user_id, balance, is_active)
    VALUES (NEW.id, 0.00, TRUE)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear wallet automáticamente
DROP TRIGGER IF EXISTS trigger_create_wallet_for_user ON core.user_profiles;
CREATE TRIGGER trigger_create_wallet_for_user
    AFTER INSERT ON core.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION commerce.create_wallet_for_user();

-- ============================================================================
-- 4. FUNCIÓN: Actualizar updated_at automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION commerce.update_wallet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para wallets
DROP TRIGGER IF EXISTS trigger_update_wallet_updated_at ON commerce.user_wallets;
CREATE TRIGGER trigger_update_wallet_updated_at
    BEFORE UPDATE ON commerce.user_wallets
    FOR EACH ROW
    EXECUTE FUNCTION commerce.update_wallet_updated_at();

-- Trigger para transacciones
DROP TRIGGER IF EXISTS trigger_update_wallet_transaction_updated_at ON commerce.wallet_transactions;
CREATE TRIGGER trigger_update_wallet_transaction_updated_at
    BEFORE UPDATE ON commerce.wallet_transactions
    FOR EACH ROW
    EXECUTE FUNCTION commerce.update_wallet_updated_at();

-- ============================================================================
-- 5. FUNCIÓN: Acreditar saldo al wallet (Nota de crédito)
-- ============================================================================

CREATE OR REPLACE FUNCTION commerce.credit_wallet(
    p_user_id UUID,
    p_amount DECIMAL(10,2),
    p_reason TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_order_id UUID DEFAULT NULL,
    p_order_item_id UUID DEFAULT NULL,
    p_created_by_user_id UUID DEFAULT NULL,
    p_created_by_role user_role DEFAULT 'admin'
)
RETURNS commerce.wallet_transactions AS $$
DECLARE
    v_wallet_id UUID;
    v_balance_before DECIMAL(10,2);
    v_balance_after DECIMAL(10,2);
    v_transaction commerce.wallet_transactions;
BEGIN
    -- Validar monto
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'El monto a acreditar debe ser mayor a 0';
    END IF;
    
    -- Obtener o crear wallet
    INSERT INTO commerce.user_wallets (user_id, balance, is_active)
    VALUES (p_user_id, 0.00, TRUE)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING id INTO v_wallet_id;
    
    IF v_wallet_id IS NULL THEN
        SELECT id INTO v_wallet_id FROM commerce.user_wallets WHERE user_id = p_user_id;
    END IF;
    
    -- Verificar que el wallet existe y está activo
    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'No se pudo obtener o crear el wallet para el usuario %', p_user_id;
    END IF;
    
    SELECT balance INTO v_balance_before FROM commerce.user_wallets WHERE id = v_wallet_id;
    v_balance_after := v_balance_before + p_amount;
    
    -- Actualizar saldo
    UPDATE commerce.user_wallets
    SET balance = v_balance_after,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wallet_id;
    
    -- Crear transacción
    INSERT INTO commerce.wallet_transactions (
        wallet_id,
        user_id,
        transaction_type,
        amount,
        status,
        balance_before,
        balance_after,
        order_id,
        order_item_id,
        description,
        reason,
        created_by_user_id,
        created_by_role
    ) VALUES (
        v_wallet_id,
        p_user_id,
        'credit',
        p_amount,
        'completed',
        v_balance_before,
        v_balance_after,
        p_order_id,
        p_order_item_id,
        COALESCE(p_description, 'Acreditación de saldo'),
        p_reason,
        p_created_by_user_id,
        p_created_by_role
    ) RETURNING * INTO v_transaction;
    
    RETURN v_transaction;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. FUNCIÓN: Debitar saldo del wallet (Pago)
-- ============================================================================

CREATE OR REPLACE FUNCTION commerce.debit_wallet(
    p_user_id UUID,
    p_amount DECIMAL(10,2),
    p_reason TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_order_id UUID DEFAULT NULL,
    p_created_by_user_id UUID DEFAULT NULL,
    p_created_by_role user_role DEFAULT 'client'
)
RETURNS commerce.wallet_transactions AS $$
DECLARE
    v_wallet_id UUID;
    v_balance_before DECIMAL(10,2);
    v_balance_after DECIMAL(10,2);
    v_transaction commerce.wallet_transactions;
BEGIN
    -- Validar monto
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'El monto a debitar debe ser mayor a 0';
    END IF;
    
    -- Obtener wallet
    SELECT id, balance INTO v_wallet_id, v_balance_before
    FROM commerce.user_wallets
    WHERE user_id = p_user_id AND is_active = TRUE AND is_blocked = FALSE;
    
    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Wallet no encontrado o no disponible para el usuario %', p_user_id;
    END IF;
    
    -- Verificar saldo suficiente
    IF v_balance_before < p_amount THEN
        RAISE EXCEPTION 'Saldo insuficiente. Saldo disponible: %, Monto requerido: %', v_balance_before, p_amount;
    END IF;
    
    v_balance_after := v_balance_before - p_amount;
    
    -- Actualizar saldo
    UPDATE commerce.user_wallets
    SET balance = v_balance_after,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wallet_id;
    
    -- Crear transacción
    INSERT INTO commerce.wallet_transactions (
        wallet_id,
        user_id,
        transaction_type,
        amount,
        status,
        balance_before,
        balance_after,
        order_id,
        description,
        reason,
        created_by_user_id,
        created_by_role
    ) VALUES (
        v_wallet_id,
        p_user_id,
        'debit',
        p_amount,
        'completed',
        v_balance_before,
        v_balance_after,
        p_order_id,
        COALESCE(p_description, 'Pago con wallet'),
        p_reason,
        p_created_by_user_id,
        p_created_by_role
    ) RETURNING * INTO v_transaction;
    
    RETURN v_transaction;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. VISTA: Resumen de Wallet con Última Transacción
-- ============================================================================

CREATE OR REPLACE VIEW commerce.wallet_summary AS
SELECT 
    w.id as wallet_id,
    w.user_id,
    up.first_name || ' ' || up.last_name as user_name,
    up.phone as user_phone,
    w.balance,
    w.is_active,
    w.is_blocked,
    w.created_at as wallet_created_at,
    w.updated_at as wallet_updated_at,
    (
        SELECT COUNT(*) 
        FROM commerce.wallet_transactions wt 
        WHERE wt.wallet_id = w.id AND wt.status = 'completed'
    ) as total_transactions,
    (
        SELECT MAX(created_at)
        FROM commerce.wallet_transactions wt
        WHERE wt.wallet_id = w.id
    ) as last_transaction_at
FROM commerce.user_wallets w
LEFT JOIN core.user_profiles up ON w.user_id = up.id;

-- ============================================================================
-- 8. VERIFICACIÓN
-- ============================================================================

-- Verificar que las tablas se crearon correctamente
SELECT 
    'Tablas creadas' as verificacion,
    COUNT(*) as total_tablas
FROM information_schema.tables
WHERE table_schema = 'commerce' 
  AND table_name IN ('user_wallets', 'wallet_transactions');

-- Verificar que los tipos se crearon
SELECT 
    'Tipos creados' as verificacion,
    typname as tipo
FROM pg_type
WHERE typname IN ('wallet_transaction_type', 'wallet_transaction_status');

