-- ============================================================================
-- MIGRACIÓN: Actualización de Estados de Pedido Simplificados
-- ============================================================================
-- Descripción: Simplifica los estados del pedido eliminando estados momentáneos
--              y estados controlados por proveedor de logística, agregando nuevos
--              estados para mejor control del flujo.
-- 
-- Cambios:
--   - Elimina: preparing, ready, assigned, picked_up
--   - Agrega: completed, delivery_failed, returned
--   - Mantiene: pending, confirmed, in_transit, delivered, cancelled, refunded
-- 
-- Fecha: 2025-01-XX
-- Versión: 2.0
-- ============================================================================

-- ============================================================================
-- 1. CREAR NUEVO TIPO ENUM CON ESTADOS ACTUALIZADOS
-- ============================================================================

-- Crear nuevo tipo ENUM con todos los estados (antiguos y nuevos)
-- Esto permite la conversión gradual
CREATE TYPE order_status_new AS ENUM (
    'pending',           -- Pendiente (creado, esperando confirmación del local)
    'confirmed',         -- Confirmado por el local (pago verificado)
    'preparing',         -- (Temporal: para migración)
    'ready',             -- (Temporal: para migración)
    'assigned',          -- (Temporal: para migración)
    'picked_up',         -- (Temporal: para migración)
    'completed',         -- Completado (pedido surtido, listo para distribución)
    'in_transit',        -- En tránsito (controlado por proveedor de logística)
    'delivered',         -- Entregado
    'delivery_failed',   -- Entrega fallida (no se pudo entregar)
    'returned',          -- Devuelto (producto devuelto al negocio)
    'cancelled',         -- Cancelado
    'refunded'           -- Reembolsado
);

-- ============================================================================
-- 2. ACTUALIZAR COLUMNAS AL NUEVO TIPO (conversión automática)
-- ============================================================================

-- Primero eliminar el DEFAULT de orders.orders.status (si existe)
ALTER TABLE orders.orders
  ALTER COLUMN status DROP DEFAULT;

-- Actualizar tabla orders.orders
-- Esto convierte automáticamente los valores existentes al nuevo tipo
ALTER TABLE orders.orders
  ALTER COLUMN status TYPE order_status_new 
  USING status::text::order_status_new;

-- Restaurar el DEFAULT con el nuevo tipo
ALTER TABLE orders.orders
  ALTER COLUMN status SET DEFAULT 'pending'::order_status_new;

-- Actualizar tabla orders.order_status_history (solo si existe)
-- (Estas columnas no tienen DEFAULT, así que no necesitamos eliminarlo)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'orders' 
    AND table_name = 'order_status_history'
  ) THEN
    ALTER TABLE orders.order_status_history
      ALTER COLUMN previous_status TYPE order_status_new 
      USING previous_status::text::order_status_new;

    ALTER TABLE orders.order_status_history
      ALTER COLUMN new_status TYPE order_status_new 
      USING new_status::text::order_status_new;
    
    RAISE NOTICE 'Tabla order_status_history actualizada al tipo order_status_new';
  ELSE
    RAISE NOTICE 'Tabla order_status_history no existe, omitiendo actualización';
  END IF;
END $$;

-- ============================================================================
-- 3. ACTUALIZAR PEDIDOS EXISTENTES CON ESTADOS ELIMINADOS
-- ============================================================================

-- Mapear estados antiguos a nuevos estados
-- preparing o ready → completed (pedido surtido)
UPDATE orders.orders
SET status = 'completed'::order_status_new,
    updated_at = CURRENT_TIMESTAMP
WHERE status::text IN ('preparing', 'ready');

-- assigned o picked_up → in_transit (ya en manos del proveedor)
UPDATE orders.orders
SET status = 'in_transit'::order_status_new,
    updated_at = CURRENT_TIMESTAMP
WHERE status::text IN ('assigned', 'picked_up');

-- ============================================================================
-- 4. CREAR TIPO ENUM FINAL (sin estados temporales)
-- ============================================================================

-- Crear tipo ENUM final solo con los estados que queremos mantener
CREATE TYPE order_status_final AS ENUM (
    'pending',           -- Pendiente (creado, esperando confirmación del local)
    'confirmed',         -- Confirmado por el local (pago verificado)
    'completed',         -- Completado (pedido surtido, listo para distribución)
    'in_transit',        -- En tránsito (controlado por proveedor de logística)
    'delivered',         -- Entregado
    'delivery_failed',   -- Entrega fallida (no se pudo entregar)
    'returned',          -- Devuelto (producto devuelto al negocio)
    'cancelled',         -- Cancelado
    'refunded'           -- Reembolsado
);

-- ============================================================================
-- 5. ACTUALIZAR COLUMNAS AL TIPO FINAL
-- ============================================================================

-- Eliminar el DEFAULT antes de cambiar al tipo final
ALTER TABLE orders.orders
  ALTER COLUMN status DROP DEFAULT;

-- Actualizar tabla orders.orders al tipo final
ALTER TABLE orders.orders
  ALTER COLUMN status TYPE order_status_final 
  USING status::text::order_status_final;

-- Restaurar el DEFAULT con el tipo final
ALTER TABLE orders.orders
  ALTER COLUMN status SET DEFAULT 'pending'::order_status_final;

-- Actualizar tabla orders.order_status_history al tipo final (solo si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'orders' 
    AND table_name = 'order_status_history'
  ) THEN
    ALTER TABLE orders.order_status_history
      ALTER COLUMN previous_status TYPE order_status_final 
      USING previous_status::text::order_status_final;

    ALTER TABLE orders.order_status_history
      ALTER COLUMN new_status TYPE order_status_final 
      USING new_status::text::order_status_final;
    
    RAISE NOTICE 'Tabla order_status_history actualizada al tipo order_status_final';
  ELSE
    RAISE NOTICE 'Tabla order_status_history no existe, omitiendo actualización';
  END IF;
END $$;

-- ============================================================================
-- 6. ELIMINAR TIPOS TEMPORALES Y RENOMBRAR FINAL
-- ============================================================================

-- Eliminar tipo intermedio
DROP TYPE IF EXISTS order_status_new CASCADE;

-- Eliminar tipo antiguo (si aún existe)
DROP TYPE IF EXISTS order_status CASCADE;

-- Renombrar tipo final
ALTER TYPE order_status_final RENAME TO order_status;

-- ============================================================================
-- 5. ACTUALIZAR TIMESTAMPS (ELIMINAR COLUMNAS OBSOLETAS, AGREGAR NUEVAS)
-- ============================================================================

-- Eliminar timestamps de estados eliminados
ALTER TABLE orders.orders
  DROP COLUMN IF EXISTS preparing_at,
  DROP COLUMN IF EXISTS ready_at,
  DROP COLUMN IF EXISTS assigned_at,
  DROP COLUMN IF EXISTS picked_up_at;

-- Agregar timestamps para nuevos estados
ALTER TABLE orders.orders
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS delivery_failed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP;

-- Comentarios
COMMENT ON COLUMN orders.orders.completed_at IS 'Timestamp cuando el pedido fue completado (surtido y listo para distribución)';
COMMENT ON COLUMN orders.orders.delivery_failed_at IS 'Timestamp cuando la entrega falló';
COMMENT ON COLUMN orders.orders.returned_at IS 'Timestamp cuando el producto fue devuelto';

-- Mantener timestamps existentes que aún se usan
-- (in_transit_at, delivered_at, cancelled_at, refunded_at ya existen)

-- ============================================================================
-- 6. ACTUALIZAR FUNCIÓN DE VALIDACIÓN DE TRANSICIONES
-- ============================================================================

-- Eliminar función antigua si existe
DROP FUNCTION IF EXISTS validate_order_status_transition(order_status, order_status);

-- Crear nueva función de validación
CREATE OR REPLACE FUNCTION validate_order_status_transition(
  current_status order_status,
  new_status order_status
) RETURNS BOOLEAN AS $$
BEGIN
  -- Reglas de transición válidas
  CASE current_status
    WHEN 'pending' THEN
      RETURN new_status IN ('confirmed', 'cancelled');
    
    WHEN 'confirmed' THEN
      RETURN new_status IN ('completed', 'cancelled');
    
    WHEN 'completed' THEN
      RETURN new_status IN ('in_transit', 'cancelled');
    
    WHEN 'in_transit' THEN
      RETURN new_status IN ('delivered', 'delivery_failed', 'cancelled');
    
    WHEN 'delivery_failed' THEN
      RETURN new_status IN ('in_transit', 'returned', 'cancelled');
    
    WHEN 'delivered' THEN
      RETURN new_status IN ('returned', 'refunded');
    
    WHEN 'returned' THEN
      RETURN new_status IN ('refunded');
    
    WHEN 'cancelled' THEN
      RETURN new_status IN ('refunded');
    
    WHEN 'refunded' THEN
      RETURN FALSE; -- Estado final, no se puede cambiar
    
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. ACTUALIZAR TRIGGER DE REGISTRO DE CAMBIOS
-- ============================================================================

-- Eliminar trigger y función antigua si existen
DROP TRIGGER IF EXISTS log_order_status_change ON orders.orders;
DROP FUNCTION IF EXISTS log_order_status_change();

-- Crear función actualizada para registrar cambios (solo si la tabla existe)
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo registrar si el estado cambió y la tabla existe
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Verificar si la tabla existe antes de insertar
    IF EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = 'orders' 
      AND table_name = 'order_status_history'
    ) THEN
      INSERT INTO orders.order_status_history (
        order_id,
        previous_status,
        new_status,
        changed_by_user_id,
        changed_by_role,
        created_at
      ) VALUES (
        NEW.id,
        OLD.status,
        NEW.status,
        NULL, -- Se puede obtener del contexto de la aplicación
        NULL, -- Se puede obtener del perfil del usuario
        CURRENT_TIMESTAMP
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear trigger (solo si la tabla order_status_history existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'orders' 
    AND table_name = 'order_status_history'
  ) THEN
    CREATE TRIGGER log_order_status_change
      AFTER UPDATE OF status ON orders.orders
      FOR EACH ROW
      EXECUTE FUNCTION log_order_status_change();
    
    RAISE NOTICE 'Trigger log_order_status_change creado';
  ELSE
    RAISE NOTICE 'Tabla order_status_history no existe, omitiendo creación de trigger';
  END IF;
END $$;

-- ============================================================================
-- 8. VERIFICACIÓN
-- ============================================================================

-- Verificar que el nuevo tipo existe
SELECT 
  'Tipo order_status actualizado' as verificacion,
  enumlabel as estado
FROM pg_enum
WHERE enumtypid = 'order_status'::regtype
ORDER BY enumsortorder;

-- Verificar que no hay pedidos con estados antiguos
SELECT 
  'Pedidos con estados antiguos' as verificacion,
  COUNT(*) as cantidad
FROM orders.orders
WHERE status::text IN ('preparing', 'ready', 'assigned', 'picked_up');

-- Verificar estructura de timestamps
SELECT 
  'Columnas de timestamps' as verificacion,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'orders'
  AND table_name = 'orders'
  AND column_name LIKE '%_at'
ORDER BY column_name;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
-- 1. Esta migración actualiza automáticamente los pedidos existentes:
--    - preparing/ready → completed
--    - assigned/picked_up → in_transit
--
-- 2. Los timestamps de estados eliminados se pierden, pero se mantienen
--    los timestamps de estados que aún existen (in_transit_at, delivered_at, etc.)
--
-- 3. La función validate_order_status_transition refleja las nuevas reglas
--    de transición definidas en la documentación.
--
-- 4. El trigger log_order_status_change se actualiza para registrar todos
--    los cambios de estado con el nuevo ENUM.
--
-- 5. Después de ejecutar esta migración:
--    - Reiniciar el backend
--    - Actualizar el código del backend para usar los nuevos estados
--    - Actualizar el frontend para mostrar los nuevos estados
-- ============================================================================

