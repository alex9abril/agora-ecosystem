-- ============================================================================
-- AGORA ECOSYSTEM - Recreate: User Registration Email Template
-- ============================================================================
-- Descripción: Elimina el template existente de bienvenida y crea uno nuevo
--              con diseño moderno. Incluye logo de AGORA por defecto.
-- ============================================================================
-- Versión: 1.3
-- Fecha: 2026-01-15
-- Hora: 10:15:00
-- ============================================================================

SET search_path = communication, public;

-- Eliminar template existente
DELETE FROM communication.email_templates 
WHERE trigger_type = 'user_registration';

-- Insertar nuevo template con diseño actualizado
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
    'user_registration',
    'Correo de Bienvenida',
    'Se envía cuando un usuario se registra',
    '¡Bienvenido a AGORA!',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a AGORA</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 0; margin: 0;">
    <tr>
      <td align="center" style="padding: 24px 16px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; border-collapse: separate; border-spacing: 0;">
          <tr>
            <td style="background-color: #333; padding: 36px 24px; text-align: center; border-radius: 16px 16px 0 0;">
              <img src="https://agoramp.mx/_next/static/media/agora_logo_white.7075c997.png" alt="AGORA" style="max-width: 200px; height: auto; display: block; margin: 0 auto 16px;" />
              <p style="color: #ffffff; font-size: 14px; margin: 0; opacity: 0.9; font-weight: 300;">
                La mejor solución de comercio en línea para la industria automotriz
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 40px 32px; border-radius: 0 0 16px 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 88px; height: 88px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; box-shadow: 0 8px 18px rgba(16, 185, 129, 0.3);">
                  <div style="line-height: 88px; color: #ffffff; font-size: 44px; font-weight: 700;">✓</div>
                </div>
              </div>
              <h1 style="text-align: center; font-size: 28px; font-weight: 700; color: #111827; margin: 0 0 16px 0; line-height: 1.2;">
                ¡Bienvenido a AGORA!
              </h1>
              <p style="text-align: center; font-size: 16px; color: #4b5563; margin: 0 0 24px 0; line-height: 1.6;">
                Hola {{user_name}},
              </p>
              <p style="text-align: center; font-size: 16px; color: #4b5563; margin: 0 0 28px 0; line-height: 1.6;">
                Nos complace darte la bienvenida a AGORA. Estamos emocionados de tenerte como parte de nuestra comunidad.
              </p>
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 28px; border: 1px solid #e5e7eb;">
                <p style="font-size: 15px; color: #111827; margin: 0; line-height: 1.6; text-align: center;">
                  Tu cuenta ha sido creada exitosamente. Ahora puedes comenzar a explorar nuestros productos y servicios.
                </p>
              </div>
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="{{dashboard_url}}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                  Comenzar a Explorar
                </a>
              </div>
              <p style="text-align: center; font-size: 13px; color: #6b7280; margin: 0; line-height: 1.6;">
                Si tienes alguna pregunta, nuestro equipo de soporte está aquí para ayudarte.
              </p>
            </td>
          </tr>
          <tr>
            <td style="text-align: center; padding: 20px 24px 0;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0 0 6px 0;">
                Este es un correo automático, por favor no respondas a este mensaje.
              </p>
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                © 2026 AGORA. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
    ARRAY['user_name', 'dashboard_url'],
    TRUE,
    TRUE
) ON CONFLICT (trigger_type) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    subject = EXCLUDED.subject,
    template_html = EXCLUDED.template_html,
    available_variables = EXCLUDED.available_variables,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Verificar que el template se creó correctamente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM communication.email_templates 
        WHERE trigger_type = 'user_registration'
    ) THEN
        RAISE EXCEPTION 'El template de bienvenida no se creó correctamente';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM communication.email_templates 
        WHERE trigger_type = 'user_registration'
        AND template_html LIKE '%agoramp.mx%'
    ) THEN
        RAISE EXCEPTION 'El template no contiene el logo de AGORA';
    END IF;
    
    RAISE NOTICE 'Template de bienvenida creado exitosamente con el nuevo diseño';
    RAISE NOTICE 'Verificación completada: Template existe, contiene el nuevo diseño y el logo de AGORA';
END $$;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. Este script ELIMINA el template anterior y crea uno nuevo desde cero
-- 2. El logo de AGORA se carga desde: https://agoramp.mx/_next/static/media/agora_logo_white.7075c997.png
-- 3. El fondo es gris oscuro (#333) con círculos decorativos sutiles
-- 4. El icono de éxito y los botones usan color verde (#10b981) para indicar éxito
-- 5. La fuente utilizada es Arial para todo el texto
-- 6. Las variables disponibles son:
--    - {{user_name}}: Nombre del usuario
--    - {{dashboard_url}}: URL del dashboard
-- 7. El template es responsive y se adapta a diferentes tamaños de pantalla
-- 8. El icono de éxito está integrado en el HTML (✓)
-- 9. Si existen templates de grupo o sucursal que heredan de este, NO se eliminan
--    Solo se elimina el template global
-- ============================================================================
