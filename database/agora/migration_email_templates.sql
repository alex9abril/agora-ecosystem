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
            bet.id AS id,
            bet.subject AS subject,
            bet.template_html AS template_html,
            bet.template_text AS template_text,
            bet.available_variables AS available_variables,
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
            bget.id AS id,
            bget.subject AS subject,
            bget.template_html AS template_html,
            bget.template_text AS template_text,
            bget.available_variables AS available_variables,
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
        et.id AS id,
        et.subject AS subject,
        et.template_html AS template_html,
        et.template_text AS template_text,
        et.available_variables AS available_variables,
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
-- Nota: La función update_updated_at_column() ya existe en el schema principal
--       (definida en schema.sql línea 1054). Solo creamos los triggers.

-- Aplicar a communication.email_templates
-- Nota: La función update_updated_at_column() ya existe en schema.sql (línea 1054)
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
    'Bienvenido a AGORA',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a AGORA</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #333; min-height: 100vh;">
  <!-- Fondo gris oscuro con logo y tagline -->
  <div style="background-color: #333; padding: 40px 20px 60px 20px; text-align: center; position: relative; overflow: hidden;">
    <!-- Elementos decorativos sutiles -->
    <div style="position: absolute; top: 20px; left: 10%; width: 60px; height: 60px; background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; opacity: 0.3;"></div>
    <div style="position: absolute; top: 40px; right: 15%; width: 40px; height: 40px; background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; opacity: 0.3;"></div>
    <div style="position: absolute; bottom: 30px; left: 20%; width: 30px; height: 30px; background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; opacity: 0.3;"></div>
    
    <!-- Logo AGORA -->
    <div style="margin-bottom: 20px;">
      <img src="https://agoramp.mx/_next/static/media/agora_logo_white.7075c997.png" alt="AGORA" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" />
    </div>
    
    <!-- Tagline -->
    <p style="color: white; font-size: 14px; margin: 0; opacity: 0.9; font-weight: 300; font-family: Arial, sans-serif;">
      La mejor solución de comercio en línea para la industria automotriz
    </p>
  </div>

  <!-- Tarjeta blanca principal -->
  <div style="max-width: 600px; margin: -40px auto 0 auto; background-color: #ffffff; border-radius: 16px 16px 0 0; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1); position: relative; padding: 50px 40px 40px 40px;">
    
    <!-- Icono de éxito principal -->
    <div style="text-align: center; margin-bottom: 30px; position: relative;">
      <div style="display: inline-block; width: 100px; height: 100px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; position: relative; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 50px; font-weight: bold; font-family: Arial, sans-serif;">✓</div>
      </div>
    </div>

    <!-- Título principal -->
    <h1 style="text-align: center; font-size: 32px; font-weight: 700; color: #111827; margin: 0 0 20px 0; line-height: 1.2; font-family: Arial, sans-serif;">
      ¡Bienvenido a AGORA!
    </h1>

    <!-- Mensaje de bienvenida -->
    <p style="text-align: center; font-size: 16px; color: #4b5563; margin: 0 0 30px 0; line-height: 1.6; font-family: Arial, sans-serif;">
      Hola {{user_name}},
    </p>
    <p style="text-align: center; font-size: 16px; color: #4b5563; margin: 0 0 40px 0; line-height: 1.6; font-family: Arial, sans-serif;">
      Nos complace darte la bienvenida a AGORA. Estamos emocionados de tenerte como parte de nuestra comunidad.
    </p>

    <!-- Información de cuenta -->
    <div style="background-color: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 30px; border: 1px solid #e5e7eb;">
      <p style="font-size: 16px; color: #111827; margin: 0 0 20px 0; line-height: 1.6; font-family: Arial, sans-serif; text-align: center;">
        Tu cuenta ha sido creada exitosamente. Ahora puedes comenzar a explorar nuestros productos y servicios.
      </p>
    </div>

    <!-- Botón de acción -->
    <div style="text-align: center; margin-bottom: 30px;">
      <a href="{{app_url}}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: all 0.3s ease; font-family: Arial, sans-serif;">
        Comenzar a Explorar
      </a>
    </div>

    <!-- Mensaje final -->
    <p style="text-align: center; font-size: 14px; color: #6b7280; margin: 0; line-height: 1.6; font-family: Arial, sans-serif;">
      Si tienes alguna pregunta, no dudes en contactarnos.
    </p>
    <p style="text-align: center; font-size: 14px; color: #6b7280; margin: 10px 0 0 0; line-height: 1.6; font-family: Arial, sans-serif;">
      Saludos,<br>
      El equipo de AGORA
    </p>
  </div>

  <!-- Footer -->
  <div style="max-width: 600px; margin: 0 auto; padding: 30px 40px; background-color: #f9fafb; text-align: center; border-radius: 0 0 16px 16px;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0 0 10px 0; font-family: Arial, sans-serif;">
      Este es un correo automático, por favor no respondas a este mensaje.
    </p>
    <p style="font-size: 12px; color: #9ca3af; margin: 0; font-family: Arial, sans-serif;">
      © 2025 AGORA. Todos los derechos reservados.
    </p>
  </div>
</body>
</html>',
    ARRAY['user_name', 'app_url'],
    TRUE,
    TRUE
) ON CONFLICT (trigger_type) DO UPDATE
SET
    template_html = EXCLUDED.template_html,
    subject = EXCLUDED.subject,
    updated_at = CURRENT_TIMESTAMP;

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
  <title>Confirmación de Pedido - AGORA</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #333; min-height: 100vh;">
  <!-- Fondo gris oscuro con logo y tagline -->
  <div style="background-color: #333; padding: 40px 20px 60px 20px; text-align: center; position: relative; overflow: hidden;">
    <!-- Elementos decorativos sutiles -->
    <div style="position: absolute; top: 20px; left: 10%; width: 60px; height: 60px; background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; opacity: 0.3;"></div>
    <div style="position: absolute; top: 40px; right: 15%; width: 40px; height: 40px; background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; opacity: 0.3;"></div>
    <div style="position: absolute; bottom: 30px; left: 20%; width: 30px; height: 30px; background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; opacity: 0.3;"></div>
    
    <!-- Logo AGORA -->
    <div style="margin-bottom: 20px;">
      <img src="https://agoramp.mx/_next/static/media/agora_logo_white.7075c997.png" alt="AGORA" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" />
    </div>
    
    <!-- Tagline -->
    <p style="color: white; font-size: 14px; margin: 0; opacity: 0.9; font-weight: 300; font-family: Arial, sans-serif;">
      La mejor solución de comercio en línea para la industria automotriz
    </p>
  </div>

  <!-- Tarjeta blanca principal -->
  <div style="max-width: 600px; margin: -40px auto 0 auto; background-color: #ffffff; border-radius: 16px 16px 0 0; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1); position: relative; padding: 50px 40px 40px 40px;">
    
    <!-- Icono de éxito principal -->
    <div style="text-align: center; margin-bottom: 30px; position: relative;">
      <div style="display: inline-block; width: 100px; height: 100px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; position: relative; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 50px; font-weight: bold; font-family: Arial, sans-serif;">✓</div>
      </div>
    </div>

    <!-- Título principal -->
    <h1 style="text-align: center; font-size: 32px; font-weight: 700; color: #111827; margin: 0 0 20px 0; line-height: 1.2; font-family: Arial, sans-serif;">
      ¡Pedido realizado con éxito!
    </h1>

    <!-- Mensaje de agradecimiento -->
    <p style="text-align: center; font-size: 16px; color: #4b5563; margin: 0 0 40px 0; line-height: 1.6; font-family: Arial, sans-serif;">
      Gracias por realizar tu pedido en línea. Hemos recibido tu orden y la estamos procesando.
    </p>

    <!-- Información del pedido -->
    <div style="background-color: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 30px; border: 1px solid #e5e7eb;">
      <div style="text-align: center; margin-bottom: 20px;">
        <p style="font-size: 14px; color: #6b7280; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; font-family: Arial, sans-serif;">
          Número de Orden
        </p>
        <p style="font-size: 24px; font-weight: 700; color: #111827; margin: 0; font-family: Arial, sans-serif;">
          {{order_number}}
        </p>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span style="font-size: 14px; color: #6b7280; font-family: Arial, sans-serif;">Fecha:</span>
          <span style="font-size: 14px; color: #111827; font-weight: 500; font-family: Arial, sans-serif;">{{order_date}}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span style="font-size: 14px; color: #6b7280; font-family: Arial, sans-serif;">Total:</span>
          <span style="font-size: 16px; color: #111827; font-weight: 700; font-family: Arial, sans-serif;">{{order_total}}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="font-size: 14px; color: #6b7280; font-family: Arial, sans-serif;">Método de Pago:</span>
          <span style="font-size: 14px; color: #111827; font-weight: 500; font-family: Arial, sans-serif;">{{payment_method}}</span>
        </div>
      </div>
    </div>

    <!-- Botón de acción -->
    <div style="text-align: center; margin-bottom: 30px;">
      <a href="{{order_url}}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: all 0.3s ease; font-family: Arial, sans-serif;">
        Ver Detalles del Pedido
      </a>
    </div>

    <!-- Nota sobre comprobante -->
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 30px;">
      <p style="font-size: 14px; color: #92400e; margin: 0; line-height: 1.5; font-family: Arial, sans-serif;">
        <strong>📧 Comprobante adjunto:</strong> Tu comprobante de pedido viene adjunto en este correo.
      </p>
    </div>

    <!-- Mensaje final -->
    <p style="text-align: center; font-size: 14px; color: #6b7280; margin: 0; line-height: 1.6; font-family: Arial, sans-serif;">
      Te notificaremos cuando tu pedido esté en camino. Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos.
    </p>
  </div>

  <!-- Footer -->
  <div style="max-width: 600px; margin: 0 auto; padding: 30px 40px; background-color: #f9fafb; text-align: center; border-radius: 0 0 16px 16px;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0 0 10px 0; font-family: Arial, sans-serif;">
      Este es un correo automático, por favor no respondas a este mensaje.
    </p>
    <p style="font-size: 12px; color: #9ca3af; margin: 0; font-family: Arial, sans-serif;">
      © 2025 AGORA. Todos los derechos reservados.
    </p>
  </div>
</body>
</html>',
    ARRAY['order_number', 'order_date', 'order_total', 'payment_method', 'order_url'],
    TRUE,
    TRUE
) ON CONFLICT (trigger_type) DO UPDATE
SET
    template_html = EXCLUDED.template_html,
    subject = EXCLUDED.subject,
    updated_at = CURRENT_TIMESTAMP;

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
  <title>Actualización de Pedido - AGORA</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #333; min-height: 100vh;">
  <!-- Fondo gris oscuro con logo y tagline -->
  <div style="background-color: #333; padding: 40px 20px 60px 20px; text-align: center; position: relative; overflow: hidden;">
    <!-- Elementos decorativos sutiles -->
    <div style="position: absolute; top: 20px; left: 10%; width: 60px; height: 60px; background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; opacity: 0.3;"></div>
    <div style="position: absolute; top: 40px; right: 15%; width: 40px; height: 40px; background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; opacity: 0.3;"></div>
    <div style="position: absolute; bottom: 30px; left: 20%; width: 30px; height: 30px; background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; opacity: 0.3;"></div>
    
    <!-- Logo AGORA -->
    <div style="margin-bottom: 20px;">
      <img src="https://agoramp.mx/_next/static/media/agora_logo_white.7075c997.png" alt="AGORA" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" />
    </div>
    
    <!-- Tagline -->
    <p style="color: white; font-size: 14px; margin: 0; opacity: 0.9; font-weight: 300; font-family: Arial, sans-serif;">
      La mejor solución de comercio en línea para la industria automotriz
    </p>
  </div>

  <!-- Tarjeta blanca principal -->
  <div style="max-width: 600px; margin: -40px auto 0 auto; background-color: #ffffff; border-radius: 16px 16px 0 0; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1); position: relative; padding: 50px 40px 40px 40px;">
    
    <!-- Icono de éxito principal -->
    <div style="text-align: center; margin-bottom: 30px; position: relative;">
      <div style="display: inline-block; width: 100px; height: 100px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; position: relative; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 50px; font-weight: bold; font-family: Arial, sans-serif;">✓</div>
      </div>
    </div>

    <!-- Título principal -->
    <h1 style="text-align: center; font-size: 32px; font-weight: 700; color: #111827; margin: 0 0 20px 0; line-height: 1.2; font-family: Arial, sans-serif;">
      Actualización de Pedido
    </h1>

    <!-- Mensaje de actualización -->
    <p style="text-align: center; font-size: 16px; color: #4b5563; margin: 0 0 30px 0; line-height: 1.6; font-family: Arial, sans-serif;">
      Hola {{user_name}},
    </p>
    <p style="text-align: center; font-size: 16px; color: #4b5563; margin: 0 0 40px 0; line-height: 1.6; font-family: Arial, sans-serif;">
      Tu pedido #{{order_number}} ha cambiado de estado.
    </p>

    <!-- Información del cambio de estado -->
    <div style="background-color: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 30px; border: 1px solid #e5e7eb;">
      <div style="margin-bottom: 20px;">
        <p style="font-size: 14px; color: #6b7280; margin: 0 0 8px 0; font-family: Arial, sans-serif;">
          <strong>Estado Anterior:</strong>
        </p>
        <p style="font-size: 16px; color: #111827; margin: 0 0 20px 0; font-weight: 500; font-family: Arial, sans-serif;">
          {{previous_status}}
        </p>
      </div>
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
        <p style="font-size: 14px; color: #6b7280; margin: 0 0 8px 0; font-family: Arial, sans-serif;">
          <strong>Estado Actual:</strong>
        </p>
        <p style="font-size: 18px; color: #10b981; margin: 0 0 20px 0; font-weight: 700; font-family: Arial, sans-serif;">
          {{current_status}}
        </p>
      </div>
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
        <p style="font-size: 14px; color: #6b7280; margin: 0; line-height: 1.6; font-family: Arial, sans-serif;">
          {{status_message}}
        </p>
      </div>
    </div>

    <!-- Botón de acción -->
    <div style="text-align: center; margin-bottom: 30px;">
      <a href="{{order_url}}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: all 0.3s ease; font-family: Arial, sans-serif;">
        Ver Detalles del Pedido
      </a>
    </div>

    <!-- Mensaje final -->
    <p style="text-align: center; font-size: 14px; color: #6b7280; margin: 0; line-height: 1.6; font-family: Arial, sans-serif;">
      Gracias por confiar en AGORA.
    </p>
  </div>

  <!-- Footer -->
  <div style="max-width: 600px; margin: 0 auto; padding: 30px 40px; background-color: #f9fafb; text-align: center; border-radius: 0 0 16px 16px;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0 0 10px 0; font-family: Arial, sans-serif;">
      Este es un correo automático, por favor no respondas a este mensaje.
    </p>
    <p style="font-size: 12px; color: #9ca3af; margin: 0; font-family: Arial, sans-serif;">
      © 2025 AGORA. Todos los derechos reservados.
    </p>
  </div>
</body>
</html>',
    ARRAY['user_name', 'order_number', 'previous_status', 'current_status', 'status_message', 'order_url'],
    TRUE,
    TRUE
) ON CONFLICT (trigger_type) DO UPDATE
SET
    template_html = EXCLUDED.template_html,
    subject = EXCLUDED.subject,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- FUNCIONES Y TRIGGERS: Creación Automática de Templates
-- ============================================================================
-- Estas funciones y triggers aseguran que cuando se crea un nuevo grupo
-- empresarial o una nueva sucursal, se crean automáticamente los templates
-- de correo copiando desde el nivel superior (global -> grupo -> sucursal).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FUNCIÓN: Crear templates de grupo desde templates globales
-- ----------------------------------------------------------------------------
-- Cuando se crea un nuevo grupo empresarial, esta función copia todos los
-- templates globales activos a ese grupo, usando el template global como base.
--
CREATE OR REPLACE FUNCTION core.create_group_email_templates_from_global()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_global_template RECORD;
BEGIN
    -- Copiar todos los templates globales activos al nuevo grupo
    FOR v_global_template IN
        SELECT 
            id as global_template_id,
            trigger_type,
            name,
            description,
            subject,
            template_html,
            template_text,
            available_variables
        FROM communication.email_templates
        WHERE is_active = TRUE
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
            inherit_from_global,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            v_global_template.global_template_id,
            v_global_template.trigger_type,
            v_global_template.name,
            v_global_template.description,
            v_global_template.subject,
            v_global_template.template_html,
            v_global_template.template_text,
            v_global_template.available_variables,
            TRUE, -- Activo por defecto
            TRUE, -- Hereda del global por defecto
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (business_group_id, trigger_type) DO NOTHING; -- Evitar duplicados si ya existe
        
        RAISE NOTICE '✅ Template "%" copiado al grupo "%" desde template global', 
            v_global_template.trigger_type, 
            NEW.name;
    END LOOP;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION core.create_group_email_templates_from_global IS 'Copia automáticamente todos los templates globales activos a un nuevo grupo empresarial';

-- ----------------------------------------------------------------------------
-- TRIGGER: Ejecutar después de insertar un nuevo grupo empresarial
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_create_group_email_templates ON core.business_groups;
CREATE TRIGGER trigger_create_group_email_templates
    AFTER INSERT ON core.business_groups
    FOR EACH ROW
    EXECUTE FUNCTION core.create_group_email_templates_from_global();

COMMENT ON TRIGGER trigger_create_group_email_templates ON core.business_groups IS 'Crea automáticamente los templates de correo para un nuevo grupo empresarial copiando desde templates globales';

-- ----------------------------------------------------------------------------
-- FUNCIÓN: Crear templates de sucursal desde templates de grupo o global
-- ----------------------------------------------------------------------------
-- Cuando se crea una nueva sucursal, esta función copia todos los templates
-- del grupo empresarial (si existe) o del global (si no hay grupo) a esa sucursal.
--
CREATE OR REPLACE FUNCTION core.create_business_email_templates_from_group_or_global()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_group_template RECORD;
    v_global_template RECORD;
    v_business_group_id UUID;
BEGIN
    -- Obtener el business_group_id de la sucursal
    v_business_group_id := NEW.business_group_id;
    
    -- Si la sucursal tiene grupo empresarial, copiar templates del grupo
    IF v_business_group_id IS NOT NULL THEN
        FOR v_group_template IN
            SELECT 
                bget.trigger_type,
                bget.name,
                bget.description,
                bget.subject,
                bget.template_html,
                bget.template_text,
                bget.available_variables,
                bget.global_template_id,
                bget.id as group_template_id
            FROM core.business_group_email_templates bget
            WHERE bget.business_group_id = v_business_group_id
              AND bget.is_active = TRUE
        LOOP
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
                inherit_from_global,
                created_at,
                updated_at
            )
            VALUES (
                NEW.id,
                v_group_template.group_template_id,
                v_group_template.global_template_id,
                v_group_template.trigger_type,
                v_group_template.name,
                v_group_template.description,
                v_group_template.subject,
                v_group_template.template_html,
                v_group_template.template_text,
                v_group_template.available_variables,
                TRUE, -- Activo por defecto
                TRUE, -- Hereda del grupo por defecto
                TRUE, -- Hereda del global por defecto
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (business_id, trigger_type) DO NOTHING; -- Evitar duplicados si ya existe
            
            RAISE NOTICE '✅ Template "%" copiado a la sucursal "%" desde template de grupo', 
                v_group_template.trigger_type, 
                NEW.name;
        END LOOP;
    ELSE
        -- Si no tiene grupo, copiar directamente desde templates globales
        FOR v_global_template IN
            SELECT 
                trigger_type,
                name,
                description,
                subject,
                template_html,
                template_text,
                available_variables,
                id as global_template_id
            FROM communication.email_templates
            WHERE is_active = TRUE
        LOOP
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
                inherit_from_global,
                created_at,
                updated_at
            )
            VALUES (
                NEW.id,
                NULL, -- No hay grupo
                v_global_template.global_template_id,
                v_global_template.trigger_type,
                v_global_template.name,
                v_global_template.description,
                v_global_template.subject,
                v_global_template.template_html,
                v_global_template.template_text,
                v_global_template.available_variables,
                TRUE, -- Activo por defecto
                FALSE, -- No hereda del grupo (no hay grupo)
                TRUE, -- Hereda del global por defecto
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (business_id, trigger_type) DO NOTHING; -- Evitar duplicados si ya existe
            
            RAISE NOTICE '✅ Template "%" copiado a la sucursal "%" desde template global', 
                v_global_template.trigger_type, 
                NEW.name;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION core.create_business_email_templates_from_group_or_global IS 'Copia automáticamente todos los templates de correo a una nueva sucursal desde el grupo (si existe) o desde el global';

-- ----------------------------------------------------------------------------
-- TRIGGER: Ejecutar después de insertar una nueva sucursal
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_create_business_email_templates ON core.businesses;
CREATE TRIGGER trigger_create_business_email_templates
    AFTER INSERT ON core.businesses
    FOR EACH ROW
    EXECUTE FUNCTION core.create_business_email_templates_from_group_or_global();

COMMENT ON TRIGGER trigger_create_business_email_templates ON core.businesses IS 'Crea automáticamente los templates de correo para una nueva sucursal copiando desde el grupo o global';

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

