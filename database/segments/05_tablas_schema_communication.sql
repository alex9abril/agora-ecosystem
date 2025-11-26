-- SCHEMA: communication
-- ============================================================================

-- ----------------------------------------------------------------------------
-- NOTIFICACIONES
-- ----------------------------------------------------------------------------
CREATE TABLE communication.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Tipo y contenido
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Datos adicionales (order_id, etc.)
    
    -- Estado
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON communication.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON communication.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON communication.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_type ON communication.notifications(type);

-- ----------------------------------------------------------------------------
-- MENSAJES / CHAT
-- ----------------------------------------------------------------------------
CREATE TABLE communication.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relaciones (chat entre usuarios)
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    
    -- Contexto (opcional, puede ser relacionado a un pedido)
    order_id UUID REFERENCES orders.orders(id) ON DELETE SET NULL,
    
    -- Contenido
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'location'
    attachment_url TEXT,
    
    -- Estado
    status message_status DEFAULT 'sent',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

CREATE INDEX idx_messages_sender_id ON communication.messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON communication.messages(recipient_id);
CREATE INDEX idx_messages_order_id ON communication.messages(order_id);
CREATE INDEX idx_messages_created_at ON communication.messages(created_at DESC);

-- ============================================================================
