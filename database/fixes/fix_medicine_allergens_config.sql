-- ============================================================================
-- FIX: Corregir configuración de allergens para medicine
-- ============================================================================
-- Este script asegura que los alergenos estén ocultos para productos de tipo medicine
-- ============================================================================

-- Actualizar configuración de allergens para medicine (debe estar oculto)
UPDATE catalog.product_type_field_config
SET 
    is_visible = FALSE,
    is_required = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE product_type = 'medicine' 
  AND field_name = 'allergens';

-- Verificar que se actualizó correctamente
SELECT 
    product_type,
    field_name,
    is_visible,
    is_required,
    display_order
FROM catalog.product_type_field_config
WHERE product_type = 'medicine' 
  AND field_name = 'allergens';

-- Si no existe el registro, crearlo
INSERT INTO catalog.product_type_field_config (product_type, field_name, is_visible, is_required, display_order)
SELECT 'medicine', 'allergens', FALSE, FALSE, 11
WHERE NOT EXISTS (
    SELECT 1 
    FROM catalog.product_type_field_config 
    WHERE product_type = 'medicine' 
      AND field_name = 'allergens'
);

-- También asegurar que nutritional_info esté oculto para medicine
UPDATE catalog.product_type_field_config
SET 
    is_visible = FALSE,
    is_required = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE product_type = 'medicine' 
  AND field_name = 'nutritional_info';

-- Verificar configuración completa para medicine
SELECT 
    field_name,
    is_visible,
    is_required,
    display_order
FROM catalog.product_type_field_config
WHERE product_type = 'medicine'
ORDER BY display_order;

