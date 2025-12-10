-- ============================================================================
-- AGORA ECOSYSTEM - Fix: Crear funciones de branding si no existen
-- ============================================================================
-- Descripción: Crea las funciones get_group_branding y get_business_branding
--              si no existen en la base de datos
-- 
-- Uso: Ejecutar si obtienes el error "function does not exist"
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- FUNCIÓN: Obtener branding del grupo
-- ============================================================================

CREATE OR REPLACE FUNCTION core.get_group_branding(p_group_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_group_settings JSONB;
BEGIN
  SELECT COALESCE(settings->'branding', '{}'::jsonb) INTO v_group_settings
  FROM core.business_groups
  WHERE id = p_group_id;
  
  RETURN v_group_settings;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_group_branding IS 'Obtiene el branding de un grupo empresarial';

-- ============================================================================
-- FUNCIÓN: Obtener branding completo (grupo + sucursal)
-- ============================================================================

CREATE OR REPLACE FUNCTION core.get_business_branding(p_business_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_business_settings JSONB;
  v_group_settings JSONB;
  v_branding JSONB;
BEGIN
  -- Obtener settings de la sucursal
  SELECT COALESCE(settings, '{}'::jsonb) INTO v_business_settings
  FROM core.businesses
  WHERE id = p_business_id;
  
  -- Obtener settings del grupo (si existe)
  SELECT COALESCE(bg.settings, '{}'::jsonb) INTO v_group_settings
  FROM core.businesses b
  LEFT JOIN core.business_groups bg ON b.business_group_id = bg.id
  WHERE b.id = p_business_id;
  
  -- Combinar: grupo como base, sucursal sobrescribe
  v_branding := COALESCE(v_group_settings->'branding', '{}'::jsonb);
  
  -- Si la sucursal tiene branding, combinar (sucursal tiene prioridad)
  IF v_business_settings ? 'branding' THEN
    v_branding := v_branding || (v_business_settings->'branding');
  END IF;
  
  RETURN jsonb_build_object('branding', v_branding);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_business_branding IS 'Obtiene el branding completo de una sucursal, combinando configuración del grupo (base) y de la sucursal (sobrescritura)';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que las funciones se crearon correctamente
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'core'
  AND p.proname IN ('get_group_branding', 'get_business_branding')
ORDER BY p.proname;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

