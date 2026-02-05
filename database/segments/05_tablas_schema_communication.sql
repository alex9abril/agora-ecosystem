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
-- LOGS DE INTEGRACIONES
-- ----------------------------------------------------------------------------
CREATE TABLE communication.integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Contexto
    business_id UUID REFERENCES core.businesses(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders.orders(id) ON DELETE SET NULL,
    
    -- Clasificación
    integration VARCHAR(50) NOT NULL, -- ej: 'karbot', 'skydropx', 'karlopay', 'email'
    event_type VARCHAR(100) NOT NULL, -- ej: 'order_confirmation', 'order_status_change'
    channel VARCHAR(30), -- ej: 'email', 'whatsapp', 'api'
    status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'skipped'
    
    -- Detalles
    message TEXT,
    error_message TEXT,
    request_payload JSONB,
    response_payload JSONB,
    metadata JSONB,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE communication.integration_logs IS 'Registro de eventos de integraciones (auditoría/soporte).';
COMMENT ON COLUMN communication.integration_logs.integration IS 'Nombre de la integración (karbot, skydropx, karlopay, email).';
COMMENT ON COLUMN communication.integration_logs.event_type IS 'Tipo de evento asociado a la integración.';
COMMENT ON COLUMN communication.integration_logs.channel IS 'Canal usado por la integración (email, whatsapp, api, etc.).';
COMMENT ON COLUMN communication.integration_logs.status IS 'Estado del evento: success, failed o skipped.';

CREATE INDEX idx_integration_logs_business_id ON communication.integration_logs(business_id);
CREATE INDEX idx_integration_logs_user_id ON communication.integration_logs(user_id);
CREATE INDEX idx_integration_logs_order_id ON communication.integration_logs(order_id);
CREATE INDEX idx_integration_logs_integration ON communication.integration_logs(integration);
CREATE INDEX idx_integration_logs_status ON communication.integration_logs(status);
CREATE INDEX idx_integration_logs_created_at ON communication.integration_logs(created_at DESC);

-- ----------------------------------------------------------------------------
-- CONFIGURACIÓN DE NOTIFICACIONES POR SUCURSAL
-- ----------------------------------------------------------------------------
CREATE TABLE communication.branch_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
    
    -- Tipo de notificación
    notification_type notification_type NOT NULL,
    
    -- Canales habilitados
    email_enabled BOOLEAN DEFAULT FALSE,
    whatsapp_enabled BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unicidad: una configuración por tipo y sucursal
    UNIQUE (business_id, notification_type)
);

COMMENT ON TABLE communication.branch_notification_settings IS 'Configuración de notificaciones por sucursal y tipo, con canales habilitados.';
COMMENT ON COLUMN communication.branch_notification_settings.business_id IS 'Sucursal (core.businesses) a la que aplica la configuración.';
COMMENT ON COLUMN communication.branch_notification_settings.notification_type IS 'Tipo de notificación (ENUM notification_type).';
COMMENT ON COLUMN communication.branch_notification_settings.email_enabled IS 'Indica si se envía notificación por email.';
COMMENT ON COLUMN communication.branch_notification_settings.whatsapp_enabled IS 'Indica si se envía notificación por WhatsApp.';

CREATE INDEX idx_branch_notification_settings_business_id
    ON communication.branch_notification_settings(business_id);
CREATE INDEX idx_branch_notification_settings_notification_type
    ON communication.branch_notification_settings(notification_type);

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
