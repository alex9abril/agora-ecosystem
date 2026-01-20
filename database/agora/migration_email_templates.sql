-- ============================================================================
-- AGORA ECOSYSTEM - Migration: Email Templates System
-- ============================================================================
-- Descripción: Crea el sistema de templates de correo con tres niveles:
--              1. Global (AGORA) - Templates por defecto
--              2. Grupo Empresarial - Templates personalizados por grupo
--              3. Sucursal - Templates personalizados por sucursal
--
-- Uso: Ejecutar después de migration_business_groups.sql
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-01-XX
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- TABLA 1: communication.email_templates (Nivel Global)
-- ============================================================================

CREATE TABLE IF NOT EXISTS communication.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificación del template
    trigger_type VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Contenido del template
    subject VARCHAR(500) NOT NULL,
    template_html TEXT NOT NULL,
    template_text TEXT,
    
    -- Variables disponibles
    available_variables TEXT[] NOT NULL DEFAULT '{}',
    
    -- Configuración
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_system BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT email_templates_trigger_type_not_empty CHECK (LENGTH(TRIM(trigger_type)) > 0),
    CONSTRAINT email_templates_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT email_templates_subject_not_empty CHECK (LENGTH(TRIM(subject)) > 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_email_templates_trigger_type ON communication.email_templates(trigger_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON communication.email_templates(is_active) WHERE is_active = TRUE;

-- Comentarios
COMMENT ON TABLE communication.email_templates IS 'Templates de correo globales (nivel plataforma AGORA)';
COMMENT ON COLUMN communication.email_templates.trigger_type IS 'Tipo de evento que dispara el correo (user_registration, order_confirmation, order_status_change)';
COMMENT ON COLUMN communication.email_templates.is_system IS 'Siempre TRUE para templates globales, no se pueden eliminar';

-- ============================================================================
-- TABLA 2: core.business_group_email_templates (Nivel Grupo)
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.business_group_email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con grupo empresarial
    business_group_id UUID NOT NULL REFERENCES core.business_groups(id) ON DELETE CASCADE,
    
    -- Relación con template global (opcional, para referencia)
    global_template_id UUID REFERENCES communication.email_templates(id) ON DELETE SET NULL,
    
    -- Identificación del template
    trigger_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Contenido del template (override)
    subject VARCHAR(500) NOT NULL,
    template_html TEXT NOT NULL,
    template_text TEXT,
    
    -- Variables disponibles
    available_variables TEXT[] NOT NULL DEFAULT '{}',
    
    -- Configuración
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    inherit_from_global BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT business_group_email_templates_unique UNIQUE (business_group_id, trigger_type),
    CONSTRAINT business_group_email_templates_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT business_group_email_templates_subject_not_empty CHECK (LENGTH(TRIM(subject)) > 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_business_group_email_templates_group ON core.business_group_email_templates(business_group_id);
CREATE INDEX IF NOT EXISTS idx_business_group_email_templates_trigger ON core.business_group_email_templates(trigger_type);
CREATE INDEX IF NOT EXISTS idx_business_group_email_templates_active ON core.business_group_email_templates(business_group_id, is_active) WHERE is_active = TRUE;

-- Comentarios
COMMENT ON TABLE core.business_group_email_templates IS 'Templates de correo personalizados por grupo empresarial (override del global)';
COMMENT ON COLUMN core.business_group_email_templates.inherit_from_global IS 'Si TRUE y is_active=FALSE, usa el template global como fallback';

-- ============================================================================
-- TABLA 3: core.business_email_templates (Nivel Sucursal)
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.business_email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con sucursal
    business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
    
    -- Relación con template de grupo (opcional, para referencia)
    group_template_id UUID REFERENCES core.business_group_email_templates(id) ON DELETE SET NULL,
    
    -- Relación con template global (opcional, para referencia)
    global_template_id UUID REFERENCES communication.email_templates(id) ON DELETE SET NULL,
    
    -- Identificación del template
    trigger_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Contenido del template (override)
    subject VARCHAR(500) NOT NULL,
    template_html TEXT NOT NULL,
    template_text TEXT,
    
    -- Variables disponibles
    available_variables TEXT[] NOT NULL DEFAULT '{}',
    
    -- Configuración
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    inherit_from_group BOOLEAN NOT NULL DEFAULT TRUE,
    inherit_from_global BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT business_email_templates_unique UNIQUE (business_id, trigger_type),
    CONSTRAINT business_email_templates_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT business_email_templates_subject_not_empty CHECK (LENGTH(TRIM(subject)) > 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_business_email_templates_business ON core.business_email_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_business_email_templates_trigger ON core.business_email_templates(trigger_type);
CREATE INDEX IF NOT EXISTS idx_business_email_templates_active ON core.business_email_templates(business_id, is_active) WHERE is_active = TRUE;

-- Comentarios
COMMENT ON TABLE core.business_email_templates IS 'Templates de correo personalizados por sucursal (override del grupo o global)';
COMMENT ON COLUMN core.business_email_templates.inherit_from_group IS 'Si TRUE y is_active=FALSE, usa el template del grupo como fallback';
COMMENT ON COLUMN core.business_email_templates.inherit_from_global IS 'Si TRUE y no hay template en grupo, usa el global como último recurso';

-- ============================================================================
-- FUNCIÓN: Resolución de Templates (Jerarquía)
-- ============================================================================

CREATE OR REPLACE FUNCTION communication.get_email_template(
    p_trigger_type VARCHAR(50),
    p_business_id UUID DEFAULT NULL,
    p_business_group_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    subject VARCHAR(500),
    template_html TEXT,
    template_text TEXT,
    available_variables TEXT[],
    level VARCHAR(20)
) AS $$
DECLARE
    v_business_group_id UUID;
BEGIN
    -- Si se proporciona business_id, obtener su business_group_id
    IF p_business_id IS NOT NULL THEN
        SELECT business_group_id INTO v_business_group_id
        FROM core.businesses
        WHERE id = p_business_id;
    ELSE
        v_business_group_id := p_business_group_id;
    END IF;
    
    -- 1. Intentar obtener template a nivel sucursal
    IF p_business_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            bet.id,
            bet.subject,
            bet.template_html,
            bet.template_text,
            bet.available_variables,
            'business'::VARCHAR(20) as level
        FROM core.business_email_templates bet
        WHERE bet.business_id = p_business_id
          AND bet.trigger_type = p_trigger_type
          AND bet.is_active = TRUE
        LIMIT 1;
        
        -- Si se encontró, retornar
        IF FOUND THEN
            RETURN;
        END IF;
    END IF;
    
    -- 2. Intentar obtener template a nivel grupo
    IF v_business_group_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            bget.id,
            bget.subject,
            bget.template_html,
            bget.template_text,
            bget.available_variables,
            'group'::VARCHAR(20) as level
        FROM core.business_group_email_templates bget
        WHERE bget.business_group_id = v_business_group_id
          AND bget.trigger_type = p_trigger_type
          AND bget.is_active = TRUE
        LIMIT 1;
        
        -- Si se encontró, retornar
        IF FOUND THEN
            RETURN;
        END IF;
    END IF;
    
    -- 3. Usar template global (siempre existe)
    RETURN QUERY
    SELECT 
        et.id,
        et.subject,
        et.template_html,
        et.template_text,
        et.available_variables,
        'global'::VARCHAR(20) as level
    FROM communication.email_templates et
    WHERE et.trigger_type = p_trigger_type
      AND et.is_active = TRUE
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION communication.get_email_template IS 'Obtiene el template de correo según la jerarquía: business -> group -> global';

-- ============================================================================
-- TRIGGERS: Actualización automática de updated_at
-- ============================================================================

-- Función genérica para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a communication.email_templates
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON communication.email_templates;
CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON communication.email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Aplicar a core.business_group_email_templates
DROP TRIGGER IF EXISTS update_business_group_email_templates_updated_at ON core.business_group_email_templates;
CREATE TRIGGER update_business_group_email_templates_updated_at
    BEFORE UPDATE ON core.business_group_email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Aplicar a core.business_email_templates
DROP TRIGGER IF EXISTS update_business_email_templates_updated_at ON core.business_email_templates;
CREATE TRIGGER update_business_email_templates_updated_at
    BEFORE UPDATE ON core.business_email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VISTA: Templates con información de herencia
-- ============================================================================

CREATE OR REPLACE VIEW communication.email_templates_hierarchy AS
SELECT 
    'global'::VARCHAR(20) as level,
    et.id,
    et.trigger_type,
    et.name,
    et.is_active,
    NULL::UUID as business_group_id,
    NULL::UUID as business_id,
    et.created_at,
    et.updated_at
FROM communication.email_templates et

UNION ALL

SELECT 
    'group'::VARCHAR(20) as level,
    bget.id,
    bget.trigger_type,
    bget.name,
    bget.is_active,
    bget.business_group_id,
    NULL::UUID as business_id,
    bget.created_at,
    bget.updated_at
FROM core.business_group_email_templates bget

UNION ALL

SELECT 
    'business'::VARCHAR(20) as level,
    bet.id,
    bet.trigger_type,
    bet.name,
    bet.is_active,
    b.business_group_id,
    bet.business_id,
    bet.created_at,
    bet.updated_at
FROM core.business_email_templates bet
JOIN core.businesses b ON b.id = bet.business_id;

COMMENT ON VIEW communication.email_templates_hierarchy IS 'Vista unificada de todos los templates en todos los niveles';

-- ============================================================================
-- DATOS INICIALES: Templates Globales por Defecto
-- ============================================================================

-- Template: Correo de Bienvenida
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
    'Se envía cuando un usuario se registra en la plataforma',
    'Bienvenido a LOCALIA',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a LOCALIA</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">¡Bienvenido a LOCALIA!</h1>
  </div>
  <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hola {{user_name}},</p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Nos complace darte la bienvenida a LOCALIA. Estamos emocionados de tenerte como parte de nuestra comunidad.
    </p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Tu cuenta ha sido creada exitosamente. Ahora puedes comenzar a explorar nuestros productos y servicios.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{app_url}}" style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
        Comenzar a Explorar
      </a>
    </div>
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      Si tienes alguna pregunta, no dudes en contactarnos.
    </p>
    <p style="font-size: 14px; color: #6b7280; margin-top: 10px;">
      Saludos,<br>
      El equipo de LOCALIA
    </p>
  </div>
</body>
</html>',
    ARRAY['user_name', 'app_url'],
    TRUE,
    TRUE
) ON CONFLICT (trigger_type) DO NOTHING;

-- Template: Confirmación de Pedido
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
    'order_confirmation',
    'Confirmación de Pedido',
    'Se envía cuando se confirma un pedido',
    'Confirmación de tu pedido #{{order_number}}',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Pedido</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">¡Pedido Confirmado!</h1>
  </div>
  <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hola {{user_name}},</p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Gracias por tu compra. Hemos recibido tu pedido y lo estamos procesando.
    </p>
    <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <h2 style="margin-top: 0; color: #4F46E5;">Detalles del Pedido</h2>
      <p><strong>Número de Pedido:</strong> {{order_number}}</p>
      <p><strong>Fecha:</strong> {{order_date}}</p>
      <p><strong>Total:</strong> {{order_total}}</p>
      <p><strong>Método de Pago:</strong> {{payment_method}}</p>
    </div>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Te notificaremos cuando tu pedido esté en camino.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{order_url}}" style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
        Ver Pedido
      </a>
    </div>
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      Si tienes alguna pregunta sobre tu pedido, contáctanos.
    </p>
  </div>
</body>
</html>',
    ARRAY['user_name', 'order_number', 'order_date', 'order_total', 'payment_method', 'order_url'],
    TRUE,
    TRUE
) ON CONFLICT (trigger_type) DO NOTHING;

-- Template: Cambio de Estado de Pedido
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
    'order_status_change',
    'Cambio de Estado de Pedido',
    'Se envía cuando cambia el estado de un pedido',
    'Actualización de tu pedido #{{order_number}}',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Actualización de Pedido</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">Actualización de Pedido</h1>
  </div>
  <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hola {{user_name}},</p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Tu pedido #{{order_number}} ha cambiado de estado.
    </p>
    <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Estado Anterior:</strong> {{previous_status}}</p>
      <p style="margin: 10px 0 0 0;"><strong>Estado Actual:</strong> <span style="color: #4F46E5; font-weight: bold;">{{current_status}}</span></p>
    </div>
    <p style="font-size: 16px; margin-bottom: 20px;">
      {{status_message}}
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{order_url}}" style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
        Ver Detalles del Pedido
      </a>
    </div>
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      Gracias por confiar en LOCALIA.
    </p>
  </div>
</body>
</html>',
    ARRAY['user_name', 'order_number', 'previous_status', 'current_status', 'status_message', 'order_url'],
    TRUE,
    TRUE
) ON CONFLICT (trigger_type) DO NOTHING;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

