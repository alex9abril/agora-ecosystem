-- ============================================================================
-- Verificar qué productos tienen imágenes en product_images
-- ============================================================================

-- Verificar productos con imágenes
SELECT 
  'PRODUCTOS CON IMÁGENES' as tipo,
  p.id,
  p.name,
  p.sku,
  COUNT(pi.id) as total_imagenes,
  COUNT(CASE WHEN pi.is_primary = TRUE THEN 1 END) as imagenes_principales,
  STRING_AGG(pi.file_path, ', ' ORDER BY pi.is_primary DESC, pi.display_order ASC) as file_paths
FROM catalog.products p
LEFT JOIN catalog.product_images pi ON pi.product_id = p.id AND pi.is_active = TRUE
WHERE p.id IN (
  '00000001-0000-0000-0000-000000000001',
  '00000001-0000-0000-0000-000000000002',
  '00000001-0000-0000-0000-000000000003',
  '00000001-0000-0000-0000-000000000004',
  '00000001-0000-0000-0000-000000000005'
)
GROUP BY p.id, p.name, p.sku
ORDER BY p.name;

-- Verificar la imagen principal usando el mismo query que el backend
SELECT 
  'IMAGEN PRINCIPAL (QUERY BACKEND)' as tipo,
  p.id,
  p.name,
  p.sku,
  pi_main.file_path as primary_image_path
FROM catalog.products p
LEFT JOIN LATERAL (
  SELECT pi_lat.file_path
  FROM catalog.product_images pi_lat
  WHERE pi_lat.product_id = p.id
  AND pi_lat.is_active = TRUE
  ORDER BY pi_lat.is_primary DESC, pi_lat.display_order ASC
  LIMIT 1
) pi_main ON TRUE
WHERE p.id IN (
  '00000001-0000-0000-0000-000000000001',
  '00000001-0000-0000-0000-000000000002',
  '00000001-0000-0000-0000-000000000003',
  '00000001-0000-0000-0000-000000000004',
  '00000001-0000-0000-0000-000000000005'
)
ORDER BY p.name;

-- Verificar todos los productos de la categoría Filtros
SELECT 
  'PRODUCTOS CATEGORÍA FILTROS' as tipo,
  p.id,
  p.name,
  p.sku,
  pi_main.file_path as primary_image_path,
  CASE 
    WHEN pi_main.file_path IS NOT NULL THEN '✅ Tiene imagen'
    ELSE '❌ Sin imagen'
  END as estado
FROM catalog.products p
LEFT JOIN LATERAL (
  SELECT pi_lat.file_path
  FROM catalog.product_images pi_lat
  WHERE pi_lat.product_id = p.id
  AND pi_lat.is_active = TRUE
  ORDER BY pi_lat.is_primary DESC, pi_lat.display_order ASC
  LIMIT 1
) pi_main ON TRUE
WHERE p.category_id = '00000001-0000-0000-0000-000000000001'
ORDER BY p.name
LIMIT 10;

