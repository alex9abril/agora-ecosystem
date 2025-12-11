-- ============================================================================
-- MIGRACIÓN: Agregar campos de receptor a core.addresses
-- ============================================================================
-- Esta migración agrega los campos receiver_name y receiver_phone a la tabla
-- core.addresses para poder especificar quién recibirá el pedido en cada dirección.

-- Agregar columnas de receptor
ALTER TABLE core.addresses
ADD COLUMN IF NOT EXISTS receiver_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS receiver_phone VARCHAR(20);

-- Crear índice para búsquedas por nombre de receptor (opcional, útil para búsquedas)
CREATE INDEX IF NOT EXISTS idx_addresses_receiver_name ON core.addresses(receiver_name) WHERE receiver_name IS NOT NULL;

-- Comentarios
COMMENT ON COLUMN core.addresses.receiver_name IS 'Nombre de la persona que recibirá el pedido en esta dirección. Obligatorio para direcciones de envío.';
COMMENT ON COLUMN core.addresses.receiver_phone IS 'Teléfono de contacto de la persona que recibirá el pedido. Opcional.';

