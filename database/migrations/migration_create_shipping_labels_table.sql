-- ============================================================================
-- MIGRACIÓN: Crear tabla de guías de envío (shipping_labels)
-- ============================================================================
-- Descripción: Tabla para almacenar las guías de envío generadas por el
--              servicio de logística simulado (para demo)
-- 
-- Fecha: 2025-01-XX
-- Versión: 1.0
-- ============================================================================

-- Crear tabla de guías de envío
CREATE TABLE IF NOT EXISTS orders.shipping_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con la orden
    order_id UUID NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
    
    -- Información de la guía
    tracking_number VARCHAR(50) NOT NULL UNIQUE, -- Número de guía único
    carrier_name VARCHAR(50) DEFAULT 'AGORA_LOGISTICS', -- Nombre del transportista (simulado)
    
    -- Estado de la guía
    status VARCHAR(50) DEFAULT 'generated', -- 'generated', 'picked_up', 'in_transit', 'delivered'
    
    -- Información de envío
    origin_address TEXT, -- Dirección de origen (negocio)
    destination_address TEXT, -- Dirección de destino (cliente)
    destination_name VARCHAR(255), -- Nombre del destinatario
    destination_phone VARCHAR(50), -- Teléfono del destinatario
    
    -- Información del paquete
    package_weight DECIMAL(10,2), -- Peso en kg
    package_dimensions TEXT, -- Dimensiones (ej: "30x20x15 cm")
    declared_value DECIMAL(10,2), -- Valor declarado
    
    -- Archivo PDF
    pdf_url TEXT, -- URL del PDF generado (si se almacena en Supabase Storage)
    pdf_path TEXT, -- Ruta del archivo PDF (si se almacena localmente)
    
    -- Fechas de seguimiento
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    picked_up_at TIMESTAMP, -- Cuando se recolectó
    in_transit_at TIMESTAMP, -- Cuando entró en tránsito
    delivered_at TIMESTAMP, -- Cuando se entregó
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB -- Información adicional (ej: datos del negocio, cliente, etc.)
);

-- Índices
CREATE INDEX idx_shipping_labels_order_id ON orders.shipping_labels(order_id);
CREATE INDEX idx_shipping_labels_tracking_number ON orders.shipping_labels(tracking_number);
CREATE INDEX idx_shipping_labels_status ON orders.shipping_labels(status);
CREATE INDEX idx_shipping_labels_created_at ON orders.shipping_labels(created_at DESC);

-- Comentarios
COMMENT ON TABLE orders.shipping_labels IS 'Guías de envío generadas por el servicio de logística simulado';
COMMENT ON COLUMN orders.shipping_labels.tracking_number IS 'Número de guía único generado automáticamente';
COMMENT ON COLUMN orders.shipping_labels.carrier_name IS 'Nombre del transportista (simulado para demo)';
COMMENT ON COLUMN orders.shipping_labels.status IS 'Estado de la guía: generated, picked_up, in_transit, delivered';

