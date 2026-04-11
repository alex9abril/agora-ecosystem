-- ============================================================================
-- AGORA ECOSYSTEM - Migration: Supervisor Notification Email Template
-- ============================================================================
-- Descripción: Agrega el template de correo genérico "Notificación para
-- Supervisores" al sistema de email templates. Este correo se envía a los
-- destinatarios configurados en notification_recipients cuando ocurre un
-- evento relevante: nueva venta, registro de cliente o cambio de estado.
-- Se integra al sistema de 3 niveles (global, grupo, sucursal).
-- ============================================================================
-- Versión: 1.1
-- Fecha: 2026-04-11
-- Hora: 14:00:00
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- 1. AGREGAR VALOR AL ENUM notification_type (si no existe)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'notification_type'::regtype
          AND enumlabel = 'supervisor_notification'
    ) THEN
        ALTER TYPE notification_type ADD VALUE 'supervisor_notification';
    END IF;
END $$;

-- ============================================================================
-- 2. INSERT DEL TEMPLATE GLOBAL
-- ============================================================================
-- El template usa variables genéricas que se adaptan a cada tipo de evento:
--   event_title       → "Nueva Venta Registrada" / "Nuevo Cliente Registrado" / "Cambio de Estado"
--   event_description → Texto descriptivo del evento
--   detail_section    → HTML con los datos (pedido, cliente, etc.) o vacío
--   action_url        → Bloque HTML del botón (o vacío si no aplica)
--   action_label      → (embebido en action_url)
--   business_name     → Nombre de la sucursal

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
    'supervisor_notification',
    'Notificación para Supervisores',
    'Se envía a los supervisores configurados cuando ocurre un evento relevante (nueva venta, registro de cliente, cambio de estado)',
    '{{event_title}} - {{business_name}}',
    '<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Notificación para Supervisores - AGORA</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #333333;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #333333;">
<tr>
<td align="center" style="padding: 40px 20px 60px 20px;">
<img src="https://agoramp.mx/_next/static/media/agora_logo_white.7075c997.png" alt="AGORA" data-email-logo="true" style="max-width: 200px; height: auto;" />
<p style="color: white; font-size: 14px; margin: 20px 0 0 0; opacity: 0.9; font-weight: 300; font-family: Arial, sans-serif;">La mejor solución de comercio en línea para la industria automotriz</p>
</td>
</tr>
<tr>
<td align="center" style="padding: 0 20px;">
<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px 16px 0 0;">
<tr>
<td style="padding: 50px 40px 40px 40px;">
<h1 style="text-align: center; font-size: 28px; font-weight: 700; color: #111827; margin: 0 0 10px 0; line-height: 1.2; font-family: Arial, sans-serif;">{{event_title}}</h1>
<p style="text-align: center; font-size: 16px; color: #6b7280; margin: 0 0 30px 0; line-height: 1.6; font-family: Arial, sans-serif;">{{business_name}}</p>
<p style="text-align: center; font-size: 16px; color: #4b5563; margin: 0 0 30px 0; line-height: 1.6; font-family: Arial, sans-serif;">{{event_description}}</p>
{{detail_section}}
{{action_url}}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr><td style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 0;">
<p style="font-size: 14px; color: #1e40af; margin: 0; line-height: 1.5; font-family: Arial, sans-serif;">Este correo se envía automáticamente a los supervisores configurados para esta sucursal.</p>
</td></tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td align="center" style="padding: 0 20px;">
<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #f9fafb; border-radius: 0 0 16px 16px;">
<tr>
<td style="padding: 30px 40px; text-align: center;">
<p style="font-size: 12px; color: #9ca3af; margin: 0 0 10px 0; font-family: Arial, sans-serif;">Notificación automática para supervisores — no responder a este mensaje.</p>
<p style="font-size: 12px; color: #9ca3af; margin: 0; font-family: Arial, sans-serif;">© 2025 AGORA. Todos los derechos reservados.</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>',
    ARRAY['business_name', 'event_title', 'event_description', 'detail_section', 'action_url'],
    TRUE,
    TRUE
) ON CONFLICT (trigger_type) DO UPDATE
SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    template_html = EXCLUDED.template_html,
    subject = EXCLUDED.subject,
    available_variables = EXCLUDED.available_variables,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 3. COPIAR TEMPLATE A GRUPOS EMPRESARIALES EXISTENTES
-- ============================================================================

DO $$
DECLARE
    v_global_template RECORD;
    v_group RECORD;
BEGIN
    SELECT id, trigger_type, name, description, subject, template_html, template_text, available_variables
    INTO v_global_template
    FROM communication.email_templates
    WHERE trigger_type = 'supervisor_notification'
      AND is_active = TRUE
    LIMIT 1;

    IF v_global_template IS NULL THEN
        RAISE NOTICE 'Template global supervisor_notification no encontrado, saltando copia a grupos.';
        RETURN;
    END IF;

    FOR v_group IN
        SELECT id FROM core.business_groups WHERE is_active = TRUE
    LOOP
        INSERT INTO core.business_group_email_templates (
            business_group_id,
            global_template_id,
            trigger_type,
            name,
            description,
            subject,
            template_html,
            template_text,
            available_variables,
            is_active,
            inherit_from_global
        ) VALUES (
            v_group.id,
            v_global_template.id,
            v_global_template.trigger_type,
            v_global_template.name,
            v_global_template.description,
            v_global_template.subject,
            v_global_template.template_html,
            v_global_template.template_text,
            v_global_template.available_variables,
            TRUE,
            TRUE
        ) ON CONFLICT (business_group_id, trigger_type) DO NOTHING;
    END LOOP;

    RAISE NOTICE 'Templates copiados a todos los grupos existentes.';
END $$;

-- ============================================================================
-- 4. COPIAR TEMPLATE A SUCURSALES EXISTENTES
-- ============================================================================

DO $$
DECLARE
    v_business RECORD;
    v_group_template_id UUID;
    v_global_template RECORD;
BEGIN
    SELECT id, trigger_type, name, description, subject, template_html, template_text, available_variables
    INTO v_global_template
    FROM communication.email_templates
    WHERE trigger_type = 'supervisor_notification'
      AND is_active = TRUE
    LIMIT 1;

    IF v_global_template IS NULL THEN
        RAISE NOTICE 'Template global supervisor_notification no encontrado, saltando copia a sucursales.';
        RETURN;
    END IF;

    FOR v_business IN
        SELECT b.id, b.business_group_id
        FROM core.businesses b
        WHERE b.is_active = TRUE
    LOOP
        v_group_template_id := NULL;
        IF v_business.business_group_id IS NOT NULL THEN
            SELECT id INTO v_group_template_id
            FROM core.business_group_email_templates
            WHERE business_group_id = v_business.business_group_id
              AND trigger_type = 'supervisor_notification'
            LIMIT 1;
        END IF;

        INSERT INTO core.business_email_templates (
            business_id,
            group_template_id,
            global_template_id,
            trigger_type,
            name,
            description,
            subject,
            template_html,
            template_text,
            available_variables,
            is_active,
            inherit_from_group,
            inherit_from_global
        ) VALUES (
            v_business.id,
            v_group_template_id,
            v_global_template.id,
            v_global_template.trigger_type,
            v_global_template.name,
            v_global_template.description,
            v_global_template.subject,
            v_global_template.template_html,
            v_global_template.template_text,
            v_global_template.available_variables,
            TRUE,
            v_group_template_id IS NOT NULL,
            TRUE
        ) ON CONFLICT (business_id, trigger_type) DO NOTHING;
    END LOOP;

    RAISE NOTICE 'Templates copiados a todas las sucursales existentes.';
END $$;

-- ============================================================================
-- VERIFICACIONES
-- ============================================================================

SELECT trigger_type, name, is_active
FROM communication.email_templates
WHERE trigger_type = 'supervisor_notification';

SELECT COUNT(*) AS group_templates
FROM core.business_group_email_templates
WHERE trigger_type = 'supervisor_notification';

SELECT COUNT(*) AS business_templates
FROM core.business_email_templates
WHERE trigger_type = 'supervisor_notification';

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. Este template se envía a los notification_recipients configurados
--    (tabla communication.notification_recipients) por sucursal o grupo.
-- 2. El trigger_type 'supervisor_notification' se usa para los 3 eventos:
--    - Nueva venta (order_confirmation)
--    - Registro de cliente (user_registration)
--    - Cambio de estado de pedido (order_status_change)
-- 3. Las variables genéricas permiten adaptar el contenido por evento:
--    - event_title: título del evento
--    - event_description: descripción breve
--    - detail_section: HTML con datos específicos (o vacío)
--    - action_url: bloque HTML del botón de acción (o vacío)
-- 4. Los triggers existentes copiarán automáticamente este template a
--    nuevos grupos y sucursales que se creen en el futuro.
-- ============================================================================
