-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Mensajes Salientes + Template custom_message
-- ============================================================================
-- Descripción:
-- 1) Crea communication.outbound_messages para registrar correos personalizados
--    enviados desde web-local (y futura bandeja de mensajes).
-- 2) Agrega un template global por defecto para trigger_type='custom_message'
--    (con jerarquía business/group/global existente).
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-05-21
-- ============================================================================

SET search_path TO public, core, communication, orders, auth;

-- ============================================================================
-- 1. TABLA: communication.outbound_messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS communication.outbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope (sucursal/grupo)
  business_id UUID REFERENCES core.businesses(id) ON DELETE SET NULL,
  business_group_id UUID REFERENCES core.business_groups(id) ON DELETE SET NULL,

  -- Actor que creó/envió el mensaje (usuario del negocio)
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Destinatario
  to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,

  -- Contenido
  trigger_type VARCHAR(100) NOT NULL DEFAULT 'custom_message',
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB,

  -- Estado
  status VARCHAR(20) NOT NULL DEFAULT 'queued', -- queued | sent | failed | skipped
  error_message TEXT,
  provider_message_id TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE communication.outbound_messages IS 'Mensajes salientes (correo) enviados desde el panel web-local.';
COMMENT ON COLUMN communication.outbound_messages.trigger_type IS 'Trigger de template usado (p.ej. custom_message).';
COMMENT ON COLUMN communication.outbound_messages.variables IS 'Variables usadas para renderizar el template.';
COMMENT ON COLUMN communication.outbound_messages.status IS 'Estado de envío: queued, sent, failed, skipped.';

CREATE INDEX IF NOT EXISTS idx_outbound_messages_business_id ON communication.outbound_messages(business_id);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_to_email ON communication.outbound_messages(to_email);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_status ON communication.outbound_messages(status);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_created_at ON communication.outbound_messages(created_at DESC);

-- Trigger updated_at (usa la función existente update_updated_at_column del schema public)
DROP TRIGGER IF EXISTS update_outbound_messages_updated_at ON communication.outbound_messages;
CREATE TRIGGER update_outbound_messages_updated_at
  BEFORE UPDATE ON communication.outbound_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seguridad: negar acceso vía anon/authenticated (PostgREST) a menos que se creen políticas explícitas.
ALTER TABLE communication.outbound_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Template global: custom_message
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM communication.email_templates
    WHERE trigger_type = 'custom_message'
  ) THEN
    INSERT INTO communication.email_templates (
      trigger_type,
      name,
      description,
      subject,
      template_html,
      available_variables,
      is_active,
      is_system
    ) VALUES (
      'custom_message',
      'Mensaje personalizado',
      'Correo personalizado enviado manualmente desde web-local',
      '{{subject}}',
      '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <div style="background-color: #111827; color: white; padding: 18px 20px; border-radius: 12px 12px 0 0;">
      <div style="font-size: 12px; opacity: 0.85; margin-bottom: 6px;">Mensaje de {{business_name}}</div>
      <div style="font-size: 18px; font-weight: 700;">{{subject}}</div>
    </div>
    <div style="background-color: white; padding: 20px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
      {{message_body}}
      <div style="margin-top: 18px; font-size: 12px; color: #6b7280;">
        Si tienes alguna duda, responde a este correo.
      </div>
    </div>
  </div>
</body>
</html>',
      ARRAY['subject','message_body','business_name','to_email'],
      TRUE,
      TRUE
    );
  END IF;
END $$;

-- ============================================================================
-- VERIFICACIONES
-- ============================================================================

SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'communication'
  AND table_name = 'outbound_messages';

SELECT trigger_type, is_active
FROM communication.email_templates
WHERE trigger_type = 'custom_message';

