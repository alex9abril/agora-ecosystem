-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Mensajes Salientes + Template custom_message
-- ============================================================================
-- Descripción:
-- 1) Crea communication.outbound_messages para registrar correos personalizados
--    enviados desde web-local (y futura bandeja de mensajes).
-- 2) Crea o actualiza el template global por defecto para trigger_type='custom_message'
--    usando el mismo formato base que las plantillas transaccionales.
-- ============================================================================
-- Versión: 1.1
-- Fecha: 2026-05-22
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
  read_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE communication.outbound_messages IS 'Mensajes salientes (correo) enviados desde el panel web-local.';
COMMENT ON COLUMN communication.outbound_messages.trigger_type IS 'Trigger de template usado (p.ej. custom_message).';
COMMENT ON COLUMN communication.outbound_messages.variables IS 'Variables usadas para renderizar el template.';
COMMENT ON COLUMN communication.outbound_messages.status IS 'Estado de envío: queued, sent, failed, skipped.';

CREATE INDEX IF NOT EXISTS idx_outbound_messages_business_id ON communication.outbound_messages(business_id);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_to_user_id ON communication.outbound_messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_to_email ON communication.outbound_messages(to_email);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_status ON communication.outbound_messages(status);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_created_at ON communication.outbound_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_unread ON communication.outbound_messages(to_user_id, created_at DESC) WHERE read_at IS NULL;

-- Compatibilidad: si la tabla ya existía, agregar columnas faltantes sin romper.
ALTER TABLE communication.outbound_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;

-- Trigger updated_at (usa la función existente update_updated_at_column del schema public)
DROP TRIGGER IF EXISTS update_outbound_messages_updated_at ON communication.outbound_messages;
CREATE TRIGGER update_outbound_messages_updated_at
  BEFORE UPDATE ON communication.outbound_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seguridad: negar acceso vía anon/authenticated (PostgREST) a menos que se creen políticas explícitas.
ALTER TABLE communication.outbound_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Template global: custom_message (canonical)
-- ============================================================================
-- Nota: este script SOLO actualiza el template global. Si existe un override a nivel
-- grupo/sucursal para trigger_type='custom_message', la jerarquía usará ese override.

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
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}} - AGORA</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <!-- Fondo gris oscuro con logo y tagline -->
  <div style="background-color: #333; padding: 40px 20px 60px 20px; text-align: center; position: relative; overflow: hidden;">
    <!-- Elementos decorativos sutiles -->
    <div style="position: absolute; top: 20px; left: 10%; width: 60px; height: 60px; background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; opacity: 0.3;"></div>
    <div style="position: absolute; top: 40px; right: 15%; width: 40px; height: 40px; background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; opacity: 0.3;"></div>
    <div style="position: absolute; bottom: 30px; left: 20%; width: 30px; height: 30px; background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; opacity: 0.3;"></div>

    <!-- Logo AGORA -->
    <div style="margin-bottom: 20px;">
      <img src="https://agoramp.mx/_next/static/media/agora_logo_white.7075c997.png" alt="AGORA" data-email-logo="true" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" />
    </div>

    <!-- Tagline -->
    <p style="color: white; font-size: 14px; margin: 0; opacity: 0.9; font-weight: 300; font-family: Arial, sans-serif;">
      La mejor soluci&oacute;n de comercio en l&iacute;nea para la industria automotriz
    </p>
  </div>

  <!-- Tarjeta blanca principal -->
  <div style="max-width: 600px; margin: -40px auto 0 auto; background-color: #ffffff; border-radius: 16px 16px 0 0; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1); position: relative; padding: 50px 40px 40px 40px;">

    <!-- Icono principal -->
    <div style="text-align: center; margin-bottom: 30px; position: relative;">
      <div style="display: inline-block; width: 100px; height: 100px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 50%; position: relative; box-shadow: 0 8px 20px rgba(59, 130, 246, 0.35);">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 46px; font-weight: bold; font-family: Arial, sans-serif;">&#9993;</div>
      </div>
    </div>

    <!-- Título principal -->
    <h1 style="text-align: center; font-size: 32px; font-weight: 700; color: #111827; margin: 0 0 20px 0; line-height: 1.2; font-family: Arial, sans-serif;">
      {{subject}}
    </h1>

    <!-- Subtítulo -->
    <p style="text-align: center; font-size: 16px; color: #4b5563; margin: 0 0 40px 0; line-height: 1.6; font-family: Arial, sans-serif;">
      Has recibido un mensaje de <strong>{{business_name}}</strong>.
    </p>

    <!-- Cuerpo del mensaje -->
    <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 30px; border: 1px solid #e5e7eb;">
      <p style="font-size: 14px; color: #6b7280; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; font-family: Arial, sans-serif;">
        Mensaje
      </p>
      {{message_body}}
    </div>

    <!-- Nota -->
    <p style="text-align: center; font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.6; font-family: Arial, sans-serif;">
      Este mensaje fue enviado a {{to_email}}. Si tienes alguna duda, responde a este correo.
    </p>
  </div>

  <!-- Footer -->
  <div style="max-width: 600px; margin: 0 auto; padding: 30px 40px; background-color: #f9fafb; text-align: center; border-radius: 0 0 16px 16px;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0 0 10px 0; font-family: Arial, sans-serif;">
      Este es un correo autom&aacute;tico, por favor no respondas a este mensaje.
    </p>
    <p style="font-size: 12px; color: #9ca3af; margin: 0; font-family: Arial, sans-serif;">
      &copy; 2026 AGORA. Todos los derechos reservados.
    </p>
  </div>
</body>
</html>$$,
  ARRAY['subject','message_body','business_name','to_email'],
  TRUE,
  TRUE
)
ON CONFLICT (trigger_type)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  template_html = EXCLUDED.template_html,
  available_variables = EXCLUDED.available_variables,
  is_active = TRUE,
  is_system = TRUE,
  updated_at = CURRENT_TIMESTAMP;

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
