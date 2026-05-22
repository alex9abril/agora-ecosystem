-- ============================================================================
-- AGORA ECOSYSTEM - Migración: Mejorar diseño template custom_message
-- ============================================================================
-- Descripción:
-- Actualiza el template global `custom_message` para que tenga el mismo
-- look & feel (logo + header) que los correos transaccionales.
-- Nota: si un negocio/grupo ya tiene override, este cambio solo aplica al global.
-- ============================================================================
-- Fecha: 2026-05-22
-- ============================================================================

SET search_path TO public, core, communication;

UPDATE communication.email_templates
SET
  subject = '{{subject}}',
  available_variables = ARRAY['subject','message_body','business_name','to_email'],
  template_html = '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #333; min-height: 100vh;">
  <!-- Fondo gris oscuro con logo -->
  <div style="background-color: #333; padding: 40px 20px 60px 20px; text-align: center; position: relative; overflow: hidden;">
    <div style="margin-bottom: 10px;">
      <img src="https://agoramp.mx/_next/static/media/agora_logo_white.7075c997.png" alt="AGORA" data-email-logo="true" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" />
    </div>
    <p style="color: white; font-size: 13px; margin: 0; opacity: 0.9; font-weight: 300; font-family: Arial, sans-serif;">
      {{business_name}}
    </p>
  </div>

  <!-- Tarjeta blanca -->
  <div style="max-width: 600px; margin: -40px auto 0 auto; background-color: #ffffff; border-radius: 16px 16px 0 0; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1); position: relative; padding: 40px 40px 28px 40px;">
    <h1 style="text-align: center; font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 10px 0; line-height: 1.2; font-family: Arial, sans-serif;">
      {{subject}}
    </h1>
    <p style="text-align: center; font-size: 13px; color: #6b7280; margin: 0 0 24px 0; font-family: Arial, sans-serif;">
      Mensaje para {{to_email}}
    </p>

    <div style="background-color: #f9fafb; border-radius: 12px; padding: 22px; border: 1px solid #e5e7eb;">
      {{message_body}}
    </div>

    <p style="font-size: 12px; color: #9ca3af; margin: 18px 0 0 0; font-family: Arial, sans-serif; text-align: center;">
      Si tienes alguna duda, responde a este correo.
    </p>
  </div>

  <div style="max-width: 600px; margin: 0 auto; background-color: #f9fafb; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: 0; padding: 18px 40px; text-align: center;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0; font-family: Arial, sans-serif;">
      © 2026 AGORA. Todos los derechos reservados.
    </p>
  </div>
</body>
</html>',
  updated_at = CURRENT_TIMESTAMP
WHERE trigger_type = 'custom_message';

SELECT trigger_type, is_active
FROM communication.email_templates
WHERE trigger_type = 'custom_message';

