-- ============================================================================
-- AGORA ECOSYSTEM - Recreate: communication.get_email_template()
-- ============================================================================
-- Descripción: Recrea la función de resolución de templates de correo para
--              evitar ambigüedad de columnas y garantizar la jerarquía:
--              sucursal -> grupo -> global.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-01-16
-- Hora: 18:30:00
-- ============================================================================

SET search_path = communication, public;

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
-- VERIFICACIONES
-- ============================================================================

DO $$
BEGIN
    PERFORM 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'communication'
      AND p.proname = 'get_email_template';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La función communication.get_email_template no se creó correctamente';
    END IF;

    RAISE NOTICE 'Función communication.get_email_template recreada correctamente';
END $$;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. Corrige ambigüedad de columnas mediante alias explícitos.
-- 2. Respeta la jerarquía: sucursal -> grupo -> global.
-- 3. Requiere que existan las tablas core.business_email_templates,
--    core.business_group_email_templates y communication.email_templates.
-- ============================================================================

