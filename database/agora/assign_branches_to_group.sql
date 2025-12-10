-- ============================================================================
-- SCRIPT: Asignar Sucursales a un Grupo Empresarial
-- ============================================================================
-- Este script permite asignar sucursales a un grupo empresarial específico.
-- 
-- USO:
-- 1. Reemplaza 'TU_GROUP_ID_AQUI' con el ID del grupo empresarial
-- 2. Ajusta la condición WHERE según tus necesidades (por owner_id, por nombre, etc.)
-- 3. Ejecuta el script
--
-- ============================================================================

-- Opción 1: Asignar sucursales por owner_id
-- Útil cuando todas las sucursales de un usuario deben pertenecer al mismo grupo
UPDATE core.businesses
SET business_group_id = '9b256110-66bf-4d59-87b4-a2f711aa1517'::UUID  -- Reemplaza con el ID de tu grupo
WHERE owner_id = 'TU_OWNER_ID_AQUI'::UUID  -- Reemplaza con el owner_id de las sucursales
  AND business_group_id IS NULL;  -- Solo actualizar las que no tienen grupo asignado

-- Opción 2: Asignar sucursales específicas por ID
-- Útil cuando quieres asignar sucursales específicas al grupo
UPDATE core.businesses
SET business_group_id = '9b256110-66bf-4d59-87b4-a2f711aa1517'::UUID  -- Reemplaza con el ID de tu grupo
WHERE id IN (
  'SUCURSAL_ID_1'::UUID,
  'SUCURSAL_ID_2'::UUID,
  'SUCURSAL_ID_3'::UUID
  -- Agrega más IDs de sucursales aquí
)
  AND business_group_id IS NULL;

-- Opción 3: Asignar sucursales por nombre (parcial)
-- Útil cuando las sucursales tienen un patrón en el nombre
UPDATE core.businesses
SET business_group_id = '9b256110-66bf-4d59-87b4-a2f711aa1517'::UUID  -- Reemplaza con el ID de tu grupo
WHERE name ILIKE '%PATRON_AQUI%'  -- Reemplaza con el patrón de nombre (ej: 'Toyota%')
  AND business_group_id IS NULL;

-- ============================================================================
-- VERIFICACIÓN: Ver sucursales asignadas al grupo
-- ============================================================================
-- Ejecuta esta query para verificar que las sucursales fueron asignadas correctamente

SELECT 
  b.id,
  b.name as branch_name,
  b.business_group_id,
  bg.name as group_name,
  b.is_active,
  b.owner_id
FROM core.businesses b
LEFT JOIN core.business_groups bg ON b.business_group_id = bg.id
WHERE b.business_group_id = '9b256110-66bf-4d59-87b4-a2f711aa1517'::UUID  -- Reemplaza con el ID de tu grupo
ORDER BY b.name;

-- ============================================================================
-- VERIFICACIÓN: Ver sucursales SIN grupo asignado
-- ============================================================================
-- Ejecuta esta query para ver qué sucursales no tienen grupo asignado

SELECT 
  b.id,
  b.name as branch_name,
  b.owner_id,
  b.is_active,
  u.email as owner_email
FROM core.businesses b
LEFT JOIN auth.users u ON b.owner_id = u.id
WHERE b.business_group_id IS NULL
  AND b.is_active = TRUE
ORDER BY b.name;

-- ============================================================================
-- VERIFICACIÓN: Ver todos los grupos y sus sucursales
-- ============================================================================

SELECT 
  bg.id as group_id,
  bg.name as group_name,
  bg.slug as group_slug,
  COUNT(b.id) as total_branches,
  COUNT(CASE WHEN b.is_active = TRUE THEN 1 END) as active_branches
FROM core.business_groups bg
LEFT JOIN core.businesses b ON b.business_group_id = bg.id
GROUP BY bg.id, bg.name, bg.slug
ORDER BY bg.name;



