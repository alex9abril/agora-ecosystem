-- ============================================================================
-- MIGRACIÓN: Sistema de Seguimiento de Pedidos y Postventa
-- ============================================================================
-- Descripción: Agrega funcionalidad completa para seguimiento de pedidos,
--              historial de estados, devoluciones y reembolsos
-- 
-- Fecha: 2025-01-XX
-- Versión: 1.0
-- ============================================================================

-- ============================================================================
-- 1. AGREGAR TIMESTAMPS FALTANTES A orders.orders
-- ============================================================================

ALTER TABLE orders.orders
ADD COLUMN IF NOT EXISTS preparing_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ready_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP;

-- Comentarios
COMMENT ON COLUMN orders.orders.preparing_at IS 'Timestamp cuando el pedido comenzó a prepararse';
COMMENT ON COLUMN orders.orders.ready_at IS 'Timestamp cuando el pedido estuvo listo para recoger';
COMMENT ON COLUMN orders.orders.assigned_at IS 'Timestamp cuando el pedido fue asignado a un repartidor';
COMMENT ON COLUMN orders.orders.picked_up_at IS 'Timestamp cuando el repartidor recogió el pedido';
COMMENT ON COLUMN orders.orders.in_transit_at IS 'Timestamp cuando el pedido comenzó a estar en tránsito';
COMMENT ON COLUMN orders.orders.refunded_at IS 'Timestamp cuando el pedido fue reembolsado';

-- ============================================================================
-- 2. CREAR TABLA DE HISTORIAL DE ESTADOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS orders.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
    
    -- Estado anterior y nuevo
    previous_status order_status,
    new_status order_status NOT NULL,
    
    -- Quién hizo el cambio
    changed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_by_role user_role, -- 'client', 'local', 'admin', 'repartidor'
    
    -- Razón del cambio (opcional)
    change_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id 
    ON orders.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at 
    ON orders.order_status_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_new_status 
    ON orders.order_status_history(new_status);

-- Comentarios
COMMENT ON TABLE orders.order_status_history IS 
    'Historial de cambios de estado de pedidos para auditoría y seguimiento';
COMMENT ON COLUMN orders.order_status_history.changed_by_role IS 
    'Rol del usuario que hizo el cambio (cliente, negocio, admin, repartidor)';

-- ============================================================================
-- 3. CREAR TABLA DE DEVOLUCIONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS orders.order_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders.orders(id) ON DELETE RESTRICT,
    
    -- Cliente que solicita
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    
    -- Estado de la devolución
    status VARCHAR(50) NOT NULL DEFAULT 'requested', 
    -- Valores: 'requested', 'approved', 'rejected', 'shipped', 'received', 'verified', 'refunded', 'cancelled'
    
    -- Productos a devolver (JSONB con items específicos)
    items_to_return JSONB NOT NULL,
    -- Formato: [{"order_item_id": "uuid", "quantity": 1, "reason": "defecto"}]
    
    -- Razón de devolución
    return_reason TEXT NOT NULL,
    
    -- Fotos de evidencia (URLs)
    evidence_photos TEXT[],
    
    -- Información de envío (si aplica)
    return_shipping_label TEXT,
    return_tracking_number VARCHAR(255),
    return_shipped_at TIMESTAMP,
    return_received_at TIMESTAMP,
    
    -- Verificación del negocio
    verification_notes TEXT,
    verification_status VARCHAR(50), -- 'pending', 'approved', 'rejected', 'partial'
    verified_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP,
    
    -- Reembolso
    refund_amount DECIMAL(10,2),
    refund_method VARCHAR(50), -- 'original', 'localcoins', 'bank_transfer'
    refund_transaction_id VARCHAR(255),
    refunded_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_order_returns_order_id 
    ON orders.order_returns(order_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_client_id 
    ON orders.order_returns(client_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_status 
    ON orders.order_returns(status);
CREATE INDEX IF NOT EXISTS idx_order_returns_created_at 
    ON orders.order_returns(created_at DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION orders.update_order_returns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_order_returns_updated_at ON orders.order_returns;
CREATE TRIGGER trigger_update_order_returns_updated_at
    BEFORE UPDATE ON orders.order_returns
    FOR EACH ROW
    EXECUTE FUNCTION orders.update_order_returns_updated_at();

-- Comentarios
COMMENT ON TABLE orders.order_returns IS 
    'Gestión de devoluciones de productos de pedidos entregados';
COMMENT ON COLUMN orders.order_returns.items_to_return IS 
    'JSONB con los items específicos a devolver y sus cantidades';

-- ============================================================================
-- 4. CREAR TABLA DE REEMBOLSOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS orders.order_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders.orders(id) ON DELETE RESTRICT,
    return_id UUID REFERENCES orders.order_returns(id) ON DELETE SET NULL,
    
    -- Tipo de reembolso
    refund_type VARCHAR(50) NOT NULL,
    -- Valores: 'full', 'partial', 'cancellation', 'return', 'warranty'
    
    -- Montos
    original_amount DECIMAL(10,2) NOT NULL,
    refund_amount DECIMAL(10,2) NOT NULL,
    refund_percentage DECIMAL(5,2), -- Porcentaje reembolsado (si aplica)
    
    -- Método de reembolso
    refund_method VARCHAR(50) NOT NULL,
    -- Valores: 'card', 'localcoins', 'bank_transfer', 'cash'
    
    -- Estado del reembolso
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Valores: 'pending', 'processing', 'completed', 'failed', 'cancelled'
    
    -- Información de transacción
    payment_transaction_id VARCHAR(255), -- ID original del pago
    refund_transaction_id VARCHAR(255), -- ID de la transacción de reembolso
    refund_reference VARCHAR(255), -- Referencia externa (fintech, wallet)
    
    -- Razón
    refund_reason TEXT,
    
    -- Procesado por
    processed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    processed_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_order_refunds_order_id 
    ON orders.order_refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_order_refunds_return_id 
    ON orders.order_refunds(return_id);
CREATE INDEX IF NOT EXISTS idx_order_refunds_status 
    ON orders.order_refunds(status);
CREATE INDEX IF NOT EXISTS idx_order_refunds_refund_transaction_id 
    ON orders.order_refunds(refund_transaction_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION orders.update_order_refunds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_order_refunds_updated_at ON orders.order_refunds;
CREATE TRIGGER trigger_update_order_refunds_updated_at
    BEFORE UPDATE ON orders.order_refunds
    FOR EACH ROW
    EXECUTE FUNCTION orders.update_order_refunds_updated_at();

-- Comentarios
COMMENT ON TABLE orders.order_refunds IS 
    'Gestión de reembolsos de pedidos (cancelaciones, devoluciones, garantías)';
COMMENT ON COLUMN orders.order_refunds.refund_type IS 
    'Tipo de reembolso: completo, parcial, por cancelación, por devolución, por garantía';

-- ============================================================================
-- 5. EXTENDER PAYMENT_STATUS (Si es VARCHAR, agregar constraint)
-- ============================================================================

-- Verificar si payment_status es VARCHAR o ENUM
-- Si es VARCHAR, agregar constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'orders' 
        AND table_name = 'orders' 
        AND column_name = 'payment_status'
        AND data_type = 'character varying'
    ) THEN
        -- Agregar constraint si no existe
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_schema = 'orders' 
            AND constraint_name = 'check_payment_status'
        ) THEN
            ALTER TABLE orders.orders
            ADD CONSTRAINT check_payment_status 
            CHECK (payment_status IN (
                'pending', 
                'paid', 
                'failed', 
                'refund_pending', 
                'refunded', 
                'partially_refunded'
            ));
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 6. FUNCIÓN PARA VALIDAR TRANSICIONES DE ESTADO
-- ============================================================================

CREATE OR REPLACE FUNCTION orders.validate_order_status_transition(
    p_order_id UUID,
    p_new_status order_status,
    p_user_role user_role,
    p_payment_status VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_status order_status;
    v_is_valid BOOLEAN := FALSE;
BEGIN
    -- Obtener estado actual
    SELECT status INTO v_current_status
    FROM orders.orders
    WHERE id = p_order_id;
    
    -- Si no se encuentra el pedido, retornar false
    IF v_current_status IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Validar transición según reglas de negocio
    CASE 
        -- pending → confirmed: requiere pago verificado
        WHEN v_current_status = 'pending' AND p_new_status = 'confirmed' THEN
            v_is_valid := (p_payment_status = 'paid');
        
        -- confirmed → preparing: cualquier usuario del negocio
        WHEN v_current_status = 'confirmed' AND p_new_status = 'preparing' THEN
            v_is_valid := (p_user_role IN ('local', 'admin'));
        
        -- preparing → ready: cualquier usuario del negocio
        WHEN v_current_status = 'preparing' AND p_new_status = 'ready' THEN
            v_is_valid := (p_user_role IN ('local', 'admin'));
        
        -- ready → assigned: sistema o negocio
        WHEN v_current_status = 'ready' AND p_new_status = 'assigned' THEN
            v_is_valid := (p_user_role IN ('local', 'admin', 'repartidor'));
        
        -- assigned → picked_up: solo repartidor asignado
        WHEN v_current_status = 'assigned' AND p_new_status = 'picked_up' THEN
            v_is_valid := (p_user_role = 'repartidor');
        
        -- picked_up → in_transit: solo repartidor
        WHEN v_current_status = 'picked_up' AND p_new_status = 'in_transit' THEN
            v_is_valid := (p_user_role = 'repartidor');
        
        -- in_transit → delivered: solo repartidor
        WHEN v_current_status = 'in_transit' AND p_new_status = 'delivered' THEN
            v_is_valid := (p_user_role = 'repartidor');
        
        -- ready → delivered: recogida en tienda
        WHEN v_current_status = 'ready' AND p_new_status = 'delivered' THEN
            v_is_valid := (p_user_role IN ('local', 'admin', 'client'));
        
        -- Cualquier estado → cancelled (excepto delivered y refunded)
        WHEN p_new_status = 'cancelled' THEN
            v_is_valid := (v_current_status NOT IN ('delivered', 'refunded'));
        
        -- cancelled o delivered → refunded
        WHEN p_new_status = 'refunded' THEN
            v_is_valid := (v_current_status IN ('cancelled', 'delivered') 
                          AND p_payment_status IN ('paid', 'refund_pending'));
        
        ELSE
            v_is_valid := FALSE;
    END CASE;
    
    RETURN v_is_valid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION orders.validate_order_status_transition IS 
    'Valida si una transición de estado de pedido es permitida según las reglas de negocio';

-- ============================================================================
-- 7. TRIGGER PARA REGISTRAR HISTORIAL DE ESTADOS
-- ============================================================================

CREATE OR REPLACE FUNCTION orders.log_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_user_role user_role;
    v_reason TEXT;
BEGIN
    -- Solo registrar si el estado cambió
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Obtener valores de configuración de sesión (si están disponibles)
        BEGIN
            v_user_id := current_setting('app.current_user_id', TRUE)::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_user_id := NULL;
        END;
        
        BEGIN
            v_user_role := current_setting('app.current_user_role', TRUE)::user_role;
        EXCEPTION WHEN OTHERS THEN
            v_user_role := NULL;
        END;
        
        BEGIN
            v_reason := current_setting('app.status_change_reason', TRUE);
        EXCEPTION WHEN OTHERS THEN
            v_reason := NULL;
        END;
        
        INSERT INTO orders.order_status_history (
            order_id,
            previous_status,
            new_status,
            changed_by_user_id,
            changed_by_role,
            change_reason
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            v_user_id,
            v_user_role,
            v_reason
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_log_order_status_change ON orders.orders;
CREATE TRIGGER trigger_log_order_status_change
    AFTER UPDATE OF status ON orders.orders
    FOR EACH ROW
    EXECUTE FUNCTION orders.log_order_status_change();

COMMENT ON FUNCTION orders.log_order_status_change IS 
    'Registra automáticamente los cambios de estado en el historial';

-- ============================================================================
-- 8. VISTA PARA SEGUIMIENTO DE PEDIDOS
-- ============================================================================

CREATE OR REPLACE VIEW orders.order_tracking_view AS
SELECT 
    o.id,
    o.client_id,
    o.business_id,
    b.name as business_name,
    o.status,
    o.payment_status,
    o.total_amount,
    o.created_at,
    o.confirmed_at,
    o.preparing_at,
    o.ready_at,
    o.assigned_at,
    o.picked_up_at,
    o.in_transit_at,
    o.delivered_at,
    o.cancelled_at,
    o.refunded_at,
    o.order_group_id,
    -- Calcular tiempo en cada estado
    CASE 
        WHEN o.confirmed_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (o.confirmed_at - o.created_at)) / 60
        ELSE NULL
    END as minutes_to_confirm,
    CASE 
        WHEN o.ready_at IS NOT NULL AND o.preparing_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (o.ready_at - o.preparing_at)) / 60
        ELSE NULL
    END as minutes_preparing,
    CASE 
        WHEN o.delivered_at IS NOT NULL AND o.created_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (o.delivered_at - o.created_at)) / 60
        ELSE NULL
    END as total_delivery_minutes,
    -- Información de entrega
    d.status as delivery_status,
    d.repartidor_id,
    r.name as repartidor_name,
    -- Información de devoluciones/reembolsos
    (SELECT COUNT(*) FROM orders.order_returns WHERE order_id = o.id) as returns_count,
    (SELECT COUNT(*) FROM orders.order_refunds WHERE order_id = o.id) as refunds_count
FROM orders.orders o
LEFT JOIN core.businesses b ON o.business_id = b.id
LEFT JOIN orders.deliveries d ON o.id = d.order_id
LEFT JOIN core.repartidores r ON d.repartidor_id = r.id;

COMMENT ON VIEW orders.order_tracking_view IS 
    'Vista consolidada para seguimiento y análisis de pedidos';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

-- Verificar que todas las tablas se crearon correctamente
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Verificar order_status_history
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'orders' AND table_name = 'order_status_history';
    
    IF v_count = 0 THEN
        RAISE EXCEPTION 'Error: order_status_history no se creó correctamente';
    END IF;
    
    -- Verificar order_returns
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'orders' AND table_name = 'order_returns';
    
    IF v_count = 0 THEN
        RAISE EXCEPTION 'Error: order_returns no se creó correctamente';
    END IF;
    
    -- Verificar order_refunds
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'orders' AND table_name = 'order_refunds';
    
    IF v_count = 0 THEN
        RAISE EXCEPTION 'Error: order_refunds no se creó correctamente';
    END IF;
    
    RAISE NOTICE '✅ Migración completada exitosamente';
END $$;

