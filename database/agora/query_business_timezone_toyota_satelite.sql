-- ============================================================================
-- AGORA ECOSYSTEM - Query: Zona horaria de sucursal Toyota Satélite
-- ============================================================================
-- Descripción: Comprueba si la sucursal "Toyota Satelite" tiene guardada
--              la zona horaria (y formato de hora) en core.businesses.settings.
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================================
-- Versión: 1.2
-- Fecha: 2025-03-02
-- ============================================================================

SET search_path TO core, public;

-- Sucursales cuyo nombre contenga "Toyota" y "Satelite" (con o sin tilde)
SELECT
  b.id,
  b.name,
  b.settings,
  b.settings->>'timezone'   AS timezone,
  b.settings->>'time_format' AS time_format,
  CASE
    WHEN b.settings->>'timezone' IS NOT NULL AND b.settings->>'timezone' <> '' THEN 'Sí'
    ELSE 'No'
  END AS tiene_zona_horaria
FROM core.businesses b
WHERE b.name ILIKE '%Toyota%'
  AND (b.name ILIKE '%Satelite%' OR b.name ILIKE '%Satélite%');

-- Si no aparece ninguna fila, la sucursal puede tener otro nombre.
-- Para listar todas las sucursales y buscar manualmente:
-- SELECT id, name, settings->>'timezone' AS timezone, settings->>'time_format' AS time_format FROM core.businesses ORDER BY name;
