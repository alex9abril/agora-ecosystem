# Proceso de Seguimiento de Pedidos y Políticas de Postventa

## 📋 Resumen Ejecutivo

Este documento define el ciclo de vida completo de un pedido desde su creación hasta su entrega, incluyendo las reglas de negocio para transiciones entre estados, políticas de cancelación, devolución y reembolso, y las modificaciones necesarias en la base de datos para soportar estos procesos.

---

## 🎯 Estados del Pedido (Order Status)

### Estados Actuales (order_status ENUM)

El sistema actual define los siguientes estados en `database/schema.sql`:

```sql
CREATE TYPE order_status AS ENUM (
    'pending',         -- Pendiente (creado, esperando confirmación del local)
    'confirmed',       -- Confirmado por el local
    'preparing',       -- En preparación
    'ready',           -- Listo para recoger
    'assigned',        -- Asignado a repartidor
    'picked_up',       -- Recogido por repartidor
    'in_transit',      -- En camino
    'delivered',       -- Entregado
    'cancelled',       -- Cancelado
    'refunded'         -- Reembolsado
);
```

### Descripción Detallada de Estados

| Estado | Descripción | Quién puede cambiar | Timestamp asociado |
|--------|-------------|---------------------|-------------------|
| `pending` | Pedido creado, esperando confirmación del negocio/sucursal | Sistema (al crear) | `created_at` |
| `confirmed` | Pedido confirmado por el negocio, pago verificado | Negocio/Local | `confirmed_at` |
| `preparing` | Pedido en proceso de preparación/empaque | Negocio/Local | `preparing_at` (nuevo) |
| `ready` | Pedido listo para recoger por repartidor o cliente | Negocio/Local | `ready_at` (nuevo) |
| `assigned` | Pedido asignado a un repartidor | Sistema/Negocio | `assigned_at` (nuevo) |
| `picked_up` | Pedido recogido por el repartidor | Repartidor | `picked_up_at` (nuevo) |
| `in_transit` | Pedido en camino a la dirección de entrega | Repartidor | `in_transit_at` (nuevo) |
| `delivered` | Pedido entregado al cliente | Repartidor | `delivered_at` |
| `cancelled` | Pedido cancelado (antes de entrega) | Cliente/Negocio/Sistema | `cancelled_at` |
| `refunded` | Pedido reembolsado (después de entrega o cancelación) | Sistema/Admin | `refunded_at` (nuevo) |

---

## 🔄 Reglas de Transición entre Estados

### Diagrama de Estados Válidos

```
[pending] 
    ↓ (confirmación + pago verificado)
[confirmed]
    ↓ (negocio inicia preparación)
[preparing]
    ↓ (negocio marca como listo)
[ready]
    ↓ (asignación a repartidor O recogida directa)
[assigned] → [picked_up] → [in_transit] → [delivered]
    OR
[ready] → [delivered] (recogida directa en tienda)
    OR
[cancelled] (en cualquier momento antes de delivered)
    OR
[refunded] (después de cancelled o delivered)
```

### Reglas de Negocio por Transición

#### 1. `pending` → `confirmed`

**Requisitos:**
- ✅ Pago verificado (`payment_status = 'paid'`)
- ✅ Stock disponible de todos los productos
- ✅ Negocio activo y disponible
- ✅ Dirección de entrega válida

**Quién puede cambiar:**
- Sistema automático (si pago es inmediato)
- Negocio/Local (confirmación manual)

**Acciones automáticas:**
- Actualizar `confirmed_at = CURRENT_TIMESTAMP`
- Enviar notificación al cliente
- Enviar notificación al negocio
- Reservar stock de productos

**Bloqueos:**
- ❌ No se puede confirmar si `payment_status != 'paid'`
- ❌ No se puede confirmar si algún producto no tiene stock
- ❌ No se puede confirmar si el negocio está inactivo

---

#### 2. `confirmed` → `preparing`

**Requisitos:**
- ✅ Estado actual: `confirmed`
- ✅ Negocio activo

**Quién puede cambiar:**
- Negocio/Local

**Acciones automáticas:**
- Actualizar `preparing_at = CURRENT_TIMESTAMP`
- Enviar notificación al cliente (opcional: "Tu pedido está siendo preparado")

**Bloqueos:**
- ❌ No se puede cambiar si estado no es `confirmed`

---

#### 3. `preparing` → `ready`

**Requisitos:**
- ✅ Estado actual: `preparing`
- ✅ Todos los items del pedido preparados

**Quién puede cambiar:**
- Negocio/Local

**Acciones automáticas:**
- Actualizar `ready_at = CURRENT_TIMESTAMP`
- Si hay repartidor asignado: notificar al repartidor
- Si no hay repartidor: notificar al cliente (recogida en tienda)

**Bloqueos:**
- ❌ No se puede cambiar si estado no es `preparing`

---

#### 4. `ready` → `assigned`

**Requisitos:**
- ✅ Estado actual: `ready`
- ✅ Repartidor disponible asignado
- ✅ Entrega a domicilio (no recogida en tienda)

**Quién puede cambiar:**
- Sistema (asignación automática)
- Negocio/Local (asignación manual)

**Acciones automáticas:**
- Actualizar `assigned_at = CURRENT_TIMESTAMP`
- Crear registro en `orders.deliveries` con `status = 'assigned'`
- Enviar notificación al repartidor
- Enviar notificación al cliente

**Bloqueos:**
- ❌ No se puede asignar si es recogida en tienda
- ❌ No se puede asignar si no hay repartidor disponible

---

#### 5. `assigned` → `picked_up`

**Requisitos:**
- ✅ Estado actual: `assigned`
- ✅ Repartidor confirmó recogida

**Quién puede cambiar:**
- Repartidor (mediante app)

**Acciones automáticas:**
- Actualizar `picked_up_at = CURRENT_TIMESTAMP`
- Actualizar `orders.deliveries.status = 'picked_up'`
- Enviar notificación al cliente ("Tu pedido está en camino")

**Bloqueos:**
- ❌ Solo el repartidor asignado puede marcar como recogido
- ❌ No se puede cambiar si estado no es `assigned`

---

#### 6. `picked_up` → `in_transit`

**Requisitos:**
- ✅ Estado actual: `picked_up`
- ✅ Repartidor en ruta

**Quién puede cambiar:**
- Repartidor (automático al iniciar ruta)
- Sistema (basado en geolocalización)

**Acciones automáticas:**
- Actualizar `in_transit_at = CURRENT_TIMESTAMP`
- Actualizar `orders.deliveries.status = 'in_transit'`
- Iniciar tracking de ubicación en tiempo real

**Bloqueos:**
- ❌ No se puede cambiar si estado no es `picked_up`

---

#### 7. `in_transit` → `delivered`

**Requisitos:**
- ✅ Estado actual: `in_transit`
- ✅ Repartidor confirmó entrega
- ✅ Cliente confirmó recepción (opcional, con timeout)

**Quién puede cambiar:**
- Repartidor (marca como entregado)
- Sistema (auto-confirmación después de X minutos si repartidor confirma)

**Acciones automáticas:**
- Actualizar `delivered_at = CURRENT_TIMESTAMP`
- Actualizar `orders.deliveries.status = 'delivered'`
- Calcular `actual_delivery_time`
- Liberar stock reservado (si aplica)
- Enviar notificación al cliente
- Enviar notificación al negocio
- Habilitar opción de calificación/reseña

**Bloqueos:**
- ❌ No se puede cambiar si estado no es `in_transit`
- ❌ No se puede cambiar si no hay confirmación de repartidor

---

#### 8. `ready` → `delivered` (Recogida en Tienda)

**Requisitos:**
- ✅ Estado actual: `ready`
- ✅ Tipo de entrega: recogida en tienda
- ✅ Cliente confirmó recogida

**Quién puede cambiar:**
- Negocio/Local (confirma recogida)
- Cliente (confirma recogida mediante código QR o similar)

**Acciones automáticas:**
- Actualizar `delivered_at = CURRENT_TIMESTAMP`
- Calcular `actual_delivery_time`
- Enviar notificación al cliente
- Habilitar opción de calificación/reseña

---

#### 9. Cualquier estado → `cancelled`

**Requisitos:**
- ✅ Estado actual: NO `delivered`, NO `refunded`
- ✅ Razón de cancelación proporcionada

**Quién puede cambiar:**
- **Cliente**: Solo si estado es `pending` o `confirmed`
- **Negocio**: Solo si estado es `pending`, `confirmed`, o `preparing`
- **Sistema**: Automático (pago fallido, timeout, etc.)

**Acciones automáticas:**
- Actualizar `cancelled_at = CURRENT_TIMESTAMP`
- Guardar `cancellation_reason`
- Si pago ya procesado: iniciar proceso de reembolso
- Liberar stock reservado
- Enviar notificación al cliente
- Enviar notificación al negocio

**Reglas de Reembolso:**
- Si `payment_status = 'paid'` → Cambiar a `payment_status = 'refund_pending'`
- Si `payment_status = 'pending'` → Cambiar a `payment_status = 'cancelled'`

**Bloqueos:**
- ❌ No se puede cancelar si estado es `delivered` o `refunded`
- ❌ Cliente no puede cancelar después de `preparing`
- ❌ Negocio no puede cancelar después de `picked_up` sin justificación

---

#### 10. `cancelled` o `delivered` → `refunded`

**Requisitos:**
- ✅ Estado actual: `cancelled` O `delivered`
- ✅ `payment_status = 'paid'` O `payment_status = 'refund_pending'`
- ✅ Proceso de reembolso completado en sistema de pago

**Quién puede cambiar:**
- Sistema (automático después de reembolso exitoso)
- Admin (manual)

**Acciones automáticas:**
- Actualizar `refunded_at = CURRENT_TIMESTAMP`
- Actualizar `payment_status = 'refunded'`
- Registrar monto reembolsado en tabla de reembolsos
- Enviar notificación al cliente
- Enviar notificación al negocio

**Bloqueos:**
- ❌ No se puede cambiar si `payment_status != 'paid'` y `payment_status != 'refund_pending'`
- ❌ No se puede cambiar si estado no es `cancelled` o `delivered`

---

## 🔙 Políticas de Postventa

### 1. Devoluciones (Returns)

#### Definición

Una **devolución** es el proceso mediante el cual un cliente devuelve productos recibidos en un pedido ya entregado (`delivered`), solicitando reembolso o cambio.

#### Tipos de Devolución

1. **Devolución Total**: Cliente devuelve todos los productos del pedido
2. **Devolución Parcial**: Cliente devuelve solo algunos productos del pedido
3. **Cambio**: Cliente devuelve productos para recibir otros (no implementado inicialmente)

#### Condiciones para Devolución

**Plazo máximo:**
- 7 días calendario desde la fecha de entrega (`delivered_at`)
- Para productos de refacciones automotrices: 30 días (política especial)

**Productos elegibles:**
- ✅ Productos no usados
- ✅ Productos con empaque original (si aplica)
- ✅ Productos sin daños
- ✅ Productos que no sean personalizados o de consumo inmediato

**Productos NO elegibles:**
- ❌ Productos usados o instalados
- ❌ Productos sin empaque original (si es requerido)
- ❌ Productos dañados por el cliente
- ❌ Productos personalizados
- ❌ Productos de consumo inmediato (combustibles, aceites abiertos, etc.)

#### Proceso de Devolución

1. **Cliente solicita devolución** (dentro del plazo)
   - Selecciona productos a devolver
   - Proporciona razón
   - Sube fotos (opcional pero recomendado)

2. **Negocio revisa solicitud** (24-48 horas)
   - Acepta o rechaza
   - Si rechaza: proporciona razón

3. **Cliente envía productos** (si aceptado)
   - Negocio proporciona etiqueta de envío o dirección
   - Cliente envía productos

4. **Negocio recibe y verifica**
   - Verifica condición de productos
   - Confirma recepción

5. **Procesamiento de reembolso**
   - Si productos en buen estado: reembolso completo
   - Si productos dañados: reembolso parcial o rechazo
   - Actualizar estado a `refunded`

#### Estados de Devolución

```
[return_requested] → [return_approved] → [return_shipped] → [return_received] → [return_verified] → [refunded]
                    OR
[return_requested] → [return_rejected]
```

---

### 2. Reembolsos (Refunds)

#### Definición

Un **reembolso** es la devolución del dinero pagado por un pedido, ya sea por cancelación o devolución.

#### Tipos de Reembolso

1. **Reembolso Total**: Se reembolsa el 100% del monto pagado
2. **Reembolso Parcial**: Se reembolsa un porcentaje del monto (por productos específicos o penalización)
3. **Reembolso en Crédito**: Se reembolsa en LocalCoins o crédito de tienda (opcional)

#### Métodos de Reembolso

- **Tarjeta de crédito/débito**: Reembolso a la tarjeta original (3-10 días hábiles)
- **LocalCoins**: Reembolso inmediato en créditos digitales
- **Transferencia bancaria**: Reembolso a cuenta bancaria (5-7 días hábiles)
- **Efectivo**: Solo para pagos en efectivo (recogida en tienda)

#### Proceso de Reembolso

1. **Iniciar reembolso**
   - Sistema calcula monto a reembolsar
   - Valida método de pago original
   - Crea registro en tabla de reembolsos

2. **Procesar reembolso**
   - Integración con sistema de pago (Wallet, fintech)
   - Confirmar transacción de reembolso

3. **Actualizar estados**
   - Actualizar `payment_status = 'refunded'`
   - Actualizar `status = 'refunded'` (si aplica)
   - Registrar `refunded_at`

4. **Notificar**
   - Enviar confirmación al cliente
   - Notificar al negocio

---

### 3. Garantías (Warranties)

#### Definición

Una **garantía** es un compromiso del negocio o fabricante de reparar, reemplazar o reembolsar productos defectuosos dentro de un período determinado.

#### Tipos de Garantía

1. **Garantía del Fabricante**: Cubierta por el fabricante del producto
2. **Garantía del Negocio**: Cubierta por el negocio que vendió el producto
3. **Garantía Extendida**: Garantía adicional comprada por el cliente

#### Períodos de Garantía

- **Refacciones automotrices**: 90 días a 1 año (según producto)
- **Productos electrónicos**: 1 año
- **Productos generales**: 30-90 días

#### Proceso de Garantía

1. **Cliente reporta defecto**
   - Dentro del período de garantía
   - Proporciona detalles y fotos

2. **Negocio/Fabricante evalúa**
   - Determina si es defecto de fabricación
   - Acepta o rechaza garantía

3. **Resolución**
   - Reparación
   - Reemplazo
   - Reembolso

---

## 📊 Modificaciones SQL Necesarias

### 1. Agregar Timestamps Faltantes

```sql
-- Agregar timestamps para estados específicos
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
```

### 2. Tabla de Historial de Estados (Order Status History)

```sql
-- Crear tabla para rastrear cambios de estado
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
CREATE INDEX idx_order_status_history_order_id ON orders.order_status_history(order_id);
CREATE INDEX idx_order_status_history_created_at ON orders.order_status_history(created_at DESC);
CREATE INDEX idx_order_status_history_new_status ON orders.order_status_history(new_status);

-- Comentarios
COMMENT ON TABLE orders.order_status_history IS 'Historial de cambios de estado de pedidos para auditoría y seguimiento';
COMMENT ON COLUMN orders.order_status_history.changed_by_role IS 'Rol del usuario que hizo el cambio (cliente, negocio, admin, repartidor)';
```

### 3. Tabla de Devoluciones (Returns)

```sql
-- Crear tabla para gestionar devoluciones
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
CREATE INDEX idx_order_returns_order_id ON orders.order_returns(order_id);
CREATE INDEX idx_order_returns_client_id ON orders.order_returns(client_id);
CREATE INDEX idx_order_returns_status ON orders.order_returns(status);
CREATE INDEX idx_order_returns_created_at ON orders.order_returns(created_at DESC);

-- Comentarios
COMMENT ON TABLE orders.order_returns IS 'Gestión de devoluciones de productos de pedidos entregados';
COMMENT ON COLUMN orders.order_returns.items_to_return IS 'JSONB con los items específicos a devolver y sus cantidades';
```

### 4. Tabla de Reembolsos (Refunds)

```sql
-- Crear tabla para gestionar reembolsos
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
CREATE INDEX idx_order_refunds_order_id ON orders.order_refunds(order_id);
CREATE INDEX idx_order_refunds_return_id ON orders.order_refunds(return_id);
CREATE INDEX idx_order_refunds_status ON orders.order_refunds(status);
CREATE INDEX idx_order_refunds_refund_transaction_id ON orders.order_refunds(refund_transaction_id);

-- Comentarios
COMMENT ON TABLE orders.order_refunds IS 'Gestión de reembolsos de pedidos (cancelaciones, devoluciones, garantías)';
COMMENT ON COLUMN orders.order_refunds.refund_type IS 'Tipo de reembolso: completo, parcial, por cancelación, por devolución, por garantía';
```

### 5. Extender ENUM de Payment Status

```sql
-- Agregar nuevos estados de pago
-- Nota: PostgreSQL no permite modificar ENUMs directamente, 
-- necesitamos crear un nuevo tipo y migrar

-- Crear nuevo tipo con estados adicionales
CREATE TYPE payment_status_new AS ENUM (
    'pending',           -- Pendiente de pago
    'paid',              -- Pagado
    'failed',            -- Pago fallido
    'refund_pending',    -- Reembolso pendiente
    'refunded',          -- Reembolsado
    'partially_refunded' -- Parcialmente reembolsado
);

-- Agregar columna temporal
ALTER TABLE orders.orders 
ADD COLUMN payment_status_new payment_status_new;

-- Migrar datos
UPDATE orders.orders 
SET payment_status_new = CASE 
    WHEN payment_status = 'pending' THEN 'pending'::payment_status_new
    WHEN payment_status = 'paid' THEN 'paid'::payment_status_new
    WHEN payment_status = 'failed' THEN 'failed'::payment_status_new
    WHEN payment_status = 'refunded' THEN 'refunded'::payment_status_new
    ELSE 'pending'::payment_status_new
END;

-- Eliminar columna antigua y renombrar
ALTER TABLE orders.orders 
DROP COLUMN payment_status,
RENAME COLUMN payment_status_new TO payment_status;

-- Eliminar tipo antiguo (si no se usa en otros lugares)
-- DROP TYPE payment_status; -- Solo si está seguro de que no se usa
```

**Alternativa más simple (si payment_status es VARCHAR):**

```sql
-- Si payment_status ya es VARCHAR, solo agregar constraint
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
```

### 6. Función para Validar Transiciones de Estado

```sql
-- Función para validar transiciones de estado
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
```

### 7. Trigger para Registrar Historial de Estados

```sql
-- Trigger para registrar cambios de estado automáticamente
CREATE OR REPLACE FUNCTION orders.log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo registrar si el estado cambió
    IF OLD.status IS DISTINCT FROM NEW.status THEN
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
            current_setting('app.current_user_id', TRUE)::UUID,
            current_setting('app.current_user_role', TRUE)::user_role,
            current_setting('app.status_change_reason', TRUE)
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
```

### 8. Vista para Seguimiento de Pedidos

```sql
-- Vista para facilitar consultas de seguimiento
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
```

---

## 📝 Resumen de Cambios SQL

### Archivo de Migración Recomendado

Crear archivo: `database/migration_order_tracking_postventa.sql`

**Contenido:**
1. Agregar timestamps faltantes
2. Crear tabla `order_status_history`
3. Crear tabla `order_returns`
4. Crear tabla `order_refunds`
5. Extender `payment_status` (si es necesario)
6. Crear función de validación de transiciones
7. Crear trigger de historial
8. Crear vista de seguimiento

---

## 🔍 Consultas Útiles

### Obtener Historial de un Pedido

```sql
SELECT 
    osh.*,
    u.email as changed_by_email
FROM orders.order_status_history osh
LEFT JOIN auth.users u ON osh.changed_by_user_id = u.id
WHERE osh.order_id = 'order-uuid'
ORDER BY osh.created_at ASC;
```

### Obtener Pedidos con Devoluciones Pendientes

```sql
SELECT 
    o.*,
    or.status as return_status,
    or.created_at as return_requested_at
FROM orders.orders o
INNER JOIN orders.order_returns or ON o.id = or.order_id
WHERE or.status IN ('requested', 'approved', 'shipped')
ORDER BY or.created_at DESC;
```

### Obtener Estadísticas de Reembolsos

```sql
SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as refund_count,
    SUM(refund_amount) as total_refunded,
    AVG(refund_amount) as avg_refund
FROM orders.order_refunds
WHERE status = 'completed'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

---

## ✅ Checklist de Implementación

- [ ] Crear migración SQL con todas las tablas y funciones
- [ ] Implementar validación de transiciones en backend
- [ ] Crear endpoints para gestión de devoluciones
- [ ] Crear endpoints para gestión de reembolsos
- [ ] Implementar notificaciones para cambios de estado
- [ ] Crear interfaz de seguimiento para clientes
- [ ] Crear interfaz de gestión para negocios
- [ ] Integrar con sistema de pagos para reembolsos
- [ ] Agregar tests unitarios para reglas de negocio
- [ ] Documentar API en Swagger

---

## 🔗 Referencias

- `database/schema.sql` - Esquema base de datos
- `database/migration_add_order_group_id.sql` - Migración de grupos de pedidos
- `docs/PROCESO_CHECKOUT_MULTI_SUCURSAL.md` - Proceso de checkout
- `apps/backend/src/modules/orders/orders.service.ts` - Servicio de pedidos

---

**Última actualización:** 2025-01-XX
**Versión:** 1.0

