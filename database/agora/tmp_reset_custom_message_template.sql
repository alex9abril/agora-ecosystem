-- TEMPORAL: Reset/estandariza el template "custom_message" para que use fondo full-width.
-- - Actualiza el template GLOBAL (communication.email_templates)
-- - Desactiva overrides de grupo/sucursal para que vuelvan a heredar del global

SET search_path TO public, core, communication;

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
<body style="margin: 0; padding: 0; background-color: #333; font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#333333" style="background-color: #333333; width: 100%;">
    <tr>
      <td align="center" style="padding: 40px 16px 18px 16px;">
        <img src="https://agoramp.mx/_next/static/media/agora_logo_white.7075c997.png" alt="AGORA" data-email-logo="true" style="max-width: 180px; height: auto; display: block;" />
        <div style="height: 10px; line-height: 10px;">&nbsp;</div>
        <div style="color: #ffffff; font-size: 13px; opacity: 0.9; font-weight: 400; font-family: Arial, sans-serif;">
          {{business_name}}
        </div>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 0 16px 48px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px;">
          <tr>
            <td align="center" style="padding: 34px 28px 22px 28px;">
              <div style="width: 72px; height: 72px; border-radius: 999px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); display: inline-block;">
                <div style="line-height: 72px; text-align: center; color: white; font-size: 30px; font-weight: 700; font-family: Arial, sans-serif;">&#9993;</div>
              </div>
              <div style="height: 18px; line-height: 18px;">&nbsp;</div>
              <div style="font-size: 22px; font-weight: 800; color: #111827; font-family: Arial, sans-serif;">
                {{subject}}
              </div>
              <div style="height: 8px; line-height: 8px;">&nbsp;</div>
              <div style="font-size: 13px; color: #6b7280; font-family: Arial, sans-serif;">
                Has recibido un mensaje de <strong>{{business_name}}</strong>.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 28px 26px 28px;">
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px;">
                {{message_body}}
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 28px 34px 28px;">
              <div style="font-size: 12px; color: #9ca3af; font-family: Arial, sans-serif;">
                Este mensaje fue enviado a {{to_email}}. Si tienes alguna duda, responde a este correo.
              </div>
            </td>
          </tr>
        </table>
        <div style="height: 16px; line-height: 16px;">&nbsp;</div>
        <div style="font-size: 12px; color: #9ca3af; font-family: Arial, sans-serif; text-align: center;">
          &copy; 2026 AGORA. Todos los derechos reservados.
        </div>
      </td>
    </tr>
  </table>
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

-- Desactivar overrides para que hereden del global
UPDATE core.business_group_email_templates
SET is_active = FALSE,
    inherit_from_global = TRUE,
    updated_at = CURRENT_TIMESTAMP
WHERE trigger_type = 'custom_message';

UPDATE core.business_email_templates
SET is_active = FALSE,
    inherit_from_group = TRUE,
    inherit_from_global = TRUE,
    updated_at = CURRENT_TIMESTAMP
WHERE trigger_type = 'custom_message';

-- Verificación rápida
SELECT trigger_type, is_active
FROM communication.email_templates
WHERE trigger_type = 'custom_message';
