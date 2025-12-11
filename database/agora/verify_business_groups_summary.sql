-- ============================================================================
-- SCRIPT: Verificar Resumen de Grupos Empresariales
-- ============================================================================
-- Este script genera un resumen de grupos empresariales con el formato
-- exacto del JSON proporcionado por el usuario.
-- ============================================================================

-- Consulta que genera el formato JSON exacto
-- Primero agregamos los datos, luego los convertimos a JSON
SELECT 
  json_agg(
    json_build_object(
      'group_id', group_id,
      'group_name', group_name,
      'group_slug', group_slug,
      'total_branches', total_branches,
      'active_branches', active_branches,
      'branch_names', branch_names
    )
    ORDER BY group_name
  ) as groups_summary
FROM (
  SELECT 
    bg.id::text as group_id,
    bg.name as group_name,
    bg.slug as group_slug,
    COUNT(b.id) as total_branches,
    COUNT(CASE WHEN b.is_active = TRUE THEN 1 END) as active_branches,
    COALESCE(STRING_AGG(b.name, ', ' ORDER BY b.name), '') as branch_names
  FROM core.business_groups bg
  LEFT JOIN core.businesses b ON b.business_group_id = bg.id
  WHERE bg.is_active = TRUE
  GROUP BY bg.id, bg.name, bg.slug
) grouped_data;

-- ============================================================================
-- ALTERNATIVA: Formato más legible (una fila por grupo)
-- ============================================================================
SELECT 
  bg.id::text as group_id,
  bg.name as group_name,
  bg.slug as group_slug,
  COUNT(b.id) as total_branches,
  COUNT(CASE WHEN b.is_active = TRUE THEN 1 END) as active_branches,
  STRING_AGG(b.name, ', ' ORDER BY b.name) as branch_names
FROM core.business_groups bg
LEFT JOIN core.businesses b ON b.business_group_id = bg.id
WHERE bg.is_active = TRUE
GROUP BY bg.id, bg.name, bg.slug
ORDER BY bg.name;

-- ============================================================================
-- VERIFICACIÓN: Comparar con los datos esperados
-- ============================================================================
-- Verificar que los grupos específicos existen y tienen las sucursales correctas

-- Grupo Andrade
SELECT 
  'Grupo Andrade' as expected_group,
  bg.id::text as actual_group_id,
  bg.name as actual_group_name,
  COUNT(b.id) as total_branches,
  COUNT(CASE WHEN b.is_active = TRUE THEN 1 END) as active_branches,
  STRING_AGG(b.name, ', ' ORDER BY b.name) as branch_names
FROM core.business_groups bg
LEFT JOIN core.businesses b ON b.business_group_id = bg.id
WHERE bg.id = '9b256110-66bf-4d59-87b4-a2f711aa1517'::UUID
GROUP BY bg.id, bg.name;

-- Toyota Group
SELECT 
  'Toyota Group' as expected_group,
  bg.id::text as actual_group_id,
  bg.name as actual_group_name,
  COUNT(b.id) as total_branches,
  COUNT(CASE WHEN b.is_active = TRUE THEN 1 END) as active_branches,
  STRING_AGG(b.name, ', ' ORDER BY b.name) as branch_names
FROM core.business_groups bg
LEFT JOIN core.businesses b ON b.business_group_id = bg.id
WHERE bg.id = 'a2da9fa3-2196-4952-b78b-a40e6e3c75c2'::UUID
GROUP BY bg.id, bg.name;

-- Toyota Satelite Group
SELECT 
  'Toyota Satelite Group' as expected_group,
  bg.id::text as actual_group_id,
  bg.name as actual_group_name,
  COUNT(b.id) as total_branches,
  COUNT(CASE WHEN b.is_active = TRUE THEN 1 END) as active_branches,
  STRING_AGG(b.name, ', ' ORDER BY b.name) as branch_names
FROM core.business_groups bg
LEFT JOIN core.businesses b ON b.business_group_id = bg.id
WHERE bg.id = '0f658686-f3a3-4691-bb24-c5228d8013ef'::UUID
GROUP BY bg.id, bg.name;

-- ============================================================================
-- DETALLES: Ver todas las sucursales de cada grupo
-- ============================================================================
SELECT 
  bg.id::text as group_id,
  bg.name as group_name,
  b.id::text as branch_id,
  b.name as branch_name,
  b.is_active as branch_is_active,
  b.owner_id::text as branch_owner_id
FROM core.business_groups bg
LEFT JOIN core.businesses b ON b.business_group_id = bg.id
WHERE bg.is_active = TRUE
ORDER BY bg.name, b.name;

