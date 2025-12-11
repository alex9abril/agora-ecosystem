-- ============================================================================
-- AGORA ECOSYSTEM - Fix: Agregar columna settings a businesses si no existe
-- ============================================================================
-- Descripción: Agrega la columna settings (JSONB) a la tabla core.businesses
--              si no existe, y crea el índice GIN correspondiente
-- 
-- Uso: Ejecutar si obtienes el error "column settings does not exist"
-- ============================================================================

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- AGREGAR COLUMNA SETTINGS A BUSINESSES
-- ============================================================================

-- Verificar si la columna existe y agregarla si no existe
DO $$
BEGIN
  -- Verificar si la columna settings existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'core' 
      AND table_name = 'businesses' 
      AND column_name = 'settings'
  ) THEN
    -- Agregar columna settings
    ALTER TABLE core.businesses
    ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE 'Columna settings agregada a core.businesses';
  ELSE
    RAISE NOTICE 'Columna settings ya existe en core.businesses';
  END IF;
END $$;

-- Agregar comentario a la columna
COMMENT ON COLUMN core.businesses.settings IS 'Configuraciones de personalización y branding de la sucursal (JSONB). Incluye colores, textos, logos, etc.';

-- ============================================================================
-- CREAR ÍNDICE GIN PARA SETTINGS
-- ============================================================================

-- Crear índice GIN para búsquedas eficientes en JSONB (si no existe)
CREATE INDEX IF NOT EXISTS idx_businesses_settings_gin ON core.businesses USING GIN (settings);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que la columna settings existe
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'core' 
  AND table_name = 'businesses' 
  AND column_name = 'settings';

-- Verificar que el índice existe
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'core' 
  AND tablename = 'businesses' 
  AND indexname = 'idx_businesses_settings_gin';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

