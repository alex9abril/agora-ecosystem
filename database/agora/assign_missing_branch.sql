-- ============================================================================
-- SCRIPT: Asignar Sucursal Faltante al Grupo Empresarial
-- ============================================================================
-- Análisis de los datos proporcionados:
--
-- GRUPOS EMPRESARIALES:
-- 1. "Toyota Satelite Group" (0f658686-f3a3-4691-bb24-c5228d8013ef)
--    - Owner: f7cc41d7-f407-4220-b9c4-11009cb229b7
--    - ✅ Sucursal asignada: "Toyota Satelite" (054471c5-0ff3-4adb-8c52-24a24ef25367)
--
-- 2. "Grupo Andrade" (9b256110-66bf-4d59-87b4-a2f711aa1517)
--    - Owner: b107b8d9-d0a2-457e-b689-0ed92c83979d
--    - ❌ Sucursal SIN asignar: "Suzuki Pedregal" (0d417039-bebf-4629-bdb2-95b172810eec)
--
-- 3. "Toyota Group" (a2da9fa3-2196-4952-b78b-a40e6e3c75c2)
--    - Owner: 328b85d1-35e3-4e55-a667-831a7b9a7ab7
--    - ✅ Sucursales asignadas:
--      - "Toyota Pachuca" (5ed4b598-a3d2-48b5-8b6a-ab4aee8711c8)
--      - "Toyota Universidad" (688e8c01-2a77-4fbe-a55e-ed12a93af55e)
--      - "Toyota Coyoacan" (ffced0ad-505e-4cb3-8d6e-b2f0b22f5c5f)
--
-- ============================================================================
-- ASIGNACIÓN FALTANTE: "Suzuki Pedregal" → "Grupo Andrade"
-- ============================================================================

-- Asignar "Suzuki Pedregal" al "Grupo Andrade" por owner_id
UPDATE core.businesses
SET business_group_id = '9b256110-66bf-4d59-87b4-a2f711aa1517'::UUID  -- Grupo Andrade
WHERE id = '0d417039-bebf-4629-bdb2-95b172810eec'::UUID  -- Suzuki Pedregal
  AND business_group_id IS NULL;

-- ============================================================================
-- VERIFICACIÓN: Confirmar que todas las sucursales están asignadas
-- ============================================================================

-- Ver todas las sucursales y sus grupos
SELECT 
  b.id,
  b.name as branch_name,
  b.owner_id,
  b.business_group_id,
  bg.name as group_name,
  CASE 
    WHEN b.business_group_id IS NULL THEN '❌ SIN GRUPO'
    ELSE '✅ ASIGNADA'
  END as status
FROM core.businesses b
LEFT JOIN core.business_groups bg ON b.business_group_id = bg.id
WHERE b.is_active = TRUE
ORDER BY 
  CASE WHEN b.business_group_id IS NULL THEN 0 ELSE 1 END,
  bg.name,
  b.name;

-- Ver sucursales sin grupo (debería estar vacío después de ejecutar el UPDATE)
SELECT 
  b.id,
  b.name as branch_name,
  b.owner_id,
  u.email as owner_email
FROM core.businesses b
LEFT JOIN auth.users u ON b.owner_id = u.id
WHERE b.business_group_id IS NULL
  AND b.is_active = TRUE
ORDER BY b.name;

-- Resumen por grupo
SELECT 
  bg.id as group_id,
  bg.name as group_name,
  bg.slug as group_slug,
  COUNT(b.id) as total_branches,
  COUNT(CASE WHEN b.is_active = TRUE THEN 1 END) as active_branches,
  STRING_AGG(b.name, ', ' ORDER BY b.name) as branch_names
FROM core.business_groups bg
LEFT JOIN core.businesses b ON b.business_group_id = bg.id
GROUP BY bg.id, bg.name, bg.slug
ORDER BY bg.name;

