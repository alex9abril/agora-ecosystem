-- ============================================================================
-- AGORA ECOSYSTEM - Update: Zona horaria y formato de hora Toyota Satélite
-- ============================================================================
-- Descripción: Asigna timezone y time_format en settings para la sucursal
--              Toyota Satelite (merge con settings existentes, no reemplaza).
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-03-02
-- ============================================================================

SET search_path TO core, public;

-- Actualizar solo la sucursal Toyota Satelite (id conocido)
UPDATE core.businesses
SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(
  'timezone',   'America/Mexico_City',
  'time_format', '24h'
),
updated_at = CURRENT_TIMESTAMP
WHERE id = '4ed0decf-6d29-4681-aa9d-39bc7b8a7e58'
  AND name ILIKE '%Toyota%Satelite%';

-- Verificar
SELECT id, name,
  settings->>'timezone'   AS timezone,
  settings->>'time_format' AS time_format
FROM core.businesses
WHERE id = '4ed0decf-6d29-4681-aa9d-39bc7b8a7e58';
