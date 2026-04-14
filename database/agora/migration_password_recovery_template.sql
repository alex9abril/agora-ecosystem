-- ============================================================================
-- AGORA ECOSYSTEM - Create: Password Recovery Email Template
-- ============================================================================
-- Descripción: Crea el template de correo para recuperación de contraseña.
--              Usa el sistema de jerarquía existente (global > grupo > sucursal)
--              para que cada tienda pueda personalizar el diseño.
--              Variables: user_name, recovery_link, business_name, business_logo
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-04-13
-- Hora: 12:00:00
-- ============================================================================

SET search_path = communication, public;

-- Insertar template global de recuperación de contraseña
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
    'password_recovery',
    'Recuperación de Contraseña',
    'Se envía cuando un usuario solicita restablecer su contraseña',
    'Recupera tu contraseña — AGORA',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperar Contraseña - AGORA</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 0; margin: 0;">
    <tr>
      <td align="center" style="padding: 24px 16px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; border-collapse: separate; border-spacing: 0;">
          <tr>
            <td style="background-color: #333; padding: 36px 24px; text-align: center; border-radius: 16px 16px 0 0;">
              <img src="{{business_logo}}" alt="AGORA" style="max-width: 200px; height: auto; display: block; margin: 0 auto 16px;" />
              <p style="color: #ffffff; font-size: 14px; margin: 0; opacity: 0.9; font-weight: 300;">
                {{business_name}}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 40px 32px; border-radius: 0 0 16px 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 88px; height: 88px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50%; box-shadow: 0 8px 18px rgba(245, 158, 11, 0.3);">
                  <div style="line-height: 88px; color: #ffffff; font-size: 44px; font-weight: 700;">🔑</div>
                </div>
              </div>
              <h1 style="text-align: center; font-size: 28px; font-weight: 700; color: #111827; margin: 0 0 16px 0; line-height: 1.2;">
                Recupera tu contraseña
              </h1>
              <p style="text-align: center; font-size: 16px; color: #4b5563; margin: 0 0 24px 0; line-height: 1.6;">
                Hola {{user_name}},
              </p>
              <p style="text-align: center; font-size: 16px; color: #4b5563; margin: 0 0 28px 0; line-height: 1.6;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón de abajo para crear una nueva contraseña.
              </p>
              <div style="text-align: center; margin-bottom: 28px;">
                <a href="{{recovery_link}}" style="display: inline-block; background: linear-gradient(135deg, #111827 0%, #374151 100%); color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                  Restablecer Contraseña
                </a>
              </div>
              <div style="background-color: #fef3c7; border-radius: 12px; padding: 20px; margin-bottom: 28px; border: 1px solid #fde68a;">
                <p style="font-size: 14px; color: #92400e; margin: 0; line-height: 1.6; text-align: center;">
                  Este enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
                </p>
              </div>
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <p style="text-align: center; font-size: 13px; color: #6b7280; margin: 0 0 8px 0; line-height: 1.6;">
                  Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:
                </p>
                <p style="text-align: center; font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.6; word-break: break-all;">
                  {{recovery_link}}
                </p>
              </div>
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
    ARRAY['user_name', 'recovery_link', 'business_name', 'business_logo'],
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
        WHERE trigger_type = 'password_recovery'
    ) THEN
        RAISE EXCEPTION 'El template de recuperación de contraseña no se creó correctamente';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM communication.email_templates 
        WHERE trigger_type = 'password_recovery'
        AND template_html LIKE '%recovery_link%'
    ) THEN
        RAISE EXCEPTION 'El template no contiene la variable recovery_link';
    END IF;
    
    RAISE NOTICE 'Template de recuperación de contraseña creado exitosamente';
    RAISE NOTICE 'Variables disponibles: user_name, recovery_link, business_name, business_logo';
END $$;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. Este template usa ON CONFLICT para ser idempotente (puede re-ejecutarse)
-- 2. Las variables disponibles son:
--    - {{user_name}}: Nombre del usuario que solicita el reset
--    - {{recovery_link}}: URL con el token de recuperación
--    - {{business_name}}: Nombre del negocio/tienda (fallback: "AGORA")
--    - {{business_logo}}: URL del logo del negocio (fallback: logo AGORA)
-- 3. El botón de acción usa colores oscuros (#111827) en lugar de verde
--    para diferenciarlo de correos de éxito (registro, confirmación)
-- 4. Incluye aviso de expiración de 1 hora y enlace de texto como fallback
-- 5. Se integra con el sistema de jerarquía de templates:
--    - Tiendas pueden crear overrides en core.business_email_templates
--    - Grupos pueden crear overrides en core.business_group_email_templates
-- ============================================================================
