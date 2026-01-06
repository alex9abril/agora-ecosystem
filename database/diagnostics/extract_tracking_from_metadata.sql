-- ============================================================================
-- EXTRACCIÓN: Obtener tracking_number de Skydropx desde metadata
-- ============================================================================
-- Este script extrae el tracking_number real de Skydropx desde el campo
-- metadata y muestra cómo actualizarlo en la columna tracking_number.
--
-- Tabla: orders.shipping_labels
-- Columna metadata: JSONB (contiene la respuesta completa de Skydropx)
-- Columna tracking_number: VARCHAR(50) (debe contener el número real de Skydropx)
--
-- Estructura del metadata:
-- {
--   "full_response": {
--     "data": {
--       "attributes": {
--         "master_tracking_number": "5055890016751701856511"  <-- AQUÍ
--       }
--     },
--     "included": [
--       {
--         "attributes": {
--           "tracking_number": "5055890016751701856511"  <-- O AQUÍ
--         }
--       }
--     ]
--   }
-- }
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- VER TODOS LOS TRACKING_NUMBERS Y SUS METADATAS
-- ============================================================================

SELECT 
    sl.id,
    sl.order_id,
    sl.tracking_number as tracking_actual,
    sl.carrier_name,
    sl.created_at,
    -- Extraer tracking_number del metadata en las ubicaciones correctas
    sl.metadata->'full_response'->'data'->'attributes'->>'master_tracking_number' as master_tracking_number,
    (sl.metadata->'full_response'->'included'->0->'attributes'->>'tracking_number') as package_tracking_number,
    -- Verificar si hay metadata de Skydropx
    sl.metadata->>'skydropx_shipment_id' as skydropx_shipment_id,
    sl.metadata->>'workflow_status' as workflow_status,
    sl.metadata->'full_response'->'data'->'attributes'->>'carrier_name' as carrier_from_metadata
FROM orders.shipping_labels sl
WHERE sl.metadata IS NOT NULL
ORDER BY sl.created_at DESC
LIMIT 10;

-- ============================================================================
-- ACTUALIZAR TRACKING_NUMBER DESDE METADATA (para registros con AGO-)
-- ============================================================================
-- ⚠️ IMPORTANTE: Revisa los resultados antes de ejecutar el UPDATE
-- Este query muestra qué se actualizaría sin hacer cambios

SELECT 
    sl.id,
    sl.order_id,
    sl.tracking_number as tracking_actual,
    -- Intentar extraer tracking_number del metadata (priorizar master_tracking_number)
    COALESCE(
        sl.metadata->'full_response'->'data'->'attributes'->>'master_tracking_number',
        (sl.metadata->'full_response'->'included'->0->'attributes'->>'tracking_number')
    ) as tracking_de_skydropx,
    -- Verificar si hay diferencia
    CASE 
        WHEN sl.tracking_number LIKE 'AGO-%' 
             AND COALESCE(
                sl.metadata->'full_response'->'data'->'attributes'->>'master_tracking_number',
                (sl.metadata->'full_response'->'included'->0->'attributes'->>'tracking_number')
             ) IS NOT NULL
        THEN 'DEBE ACTUALIZARSE'
        ELSE 'OK o SIN TRACKING EN METADATA'
    END as accion
FROM orders.shipping_labels sl
WHERE sl.tracking_number LIKE 'AGO-%'
  AND sl.metadata IS NOT NULL
ORDER BY sl.created_at DESC;

-- ============================================================================
-- UPDATE REAL (descomenta para ejecutar)
-- ============================================================================
-- ⚠️ EJECUTAR SOLO DESPUÉS DE REVISAR LOS RESULTADOS ANTERIORES

/*
UPDATE orders.shipping_labels sl
SET 
    tracking_number = COALESCE(
        sl.metadata->'full_response'->'data'->'attributes'->>'master_tracking_number',
        (sl.metadata->'full_response'->'included'->0->'attributes'->>'tracking_number')
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE sl.tracking_number LIKE 'AGO-%'
  AND sl.metadata IS NOT NULL
  AND COALESCE(
        sl.metadata->'full_response'->'data'->'attributes'->>'master_tracking_number',
        (sl.metadata->'full_response'->'included'->0->'attributes'->>'tracking_number')
  ) IS NOT NULL;
*/

-- ============================================================================
-- VERIFICAR ESTRUCTURA DEL METADATA PARA UN REGISTRO ESPECÍFICO
-- ============================================================================
-- Reemplaza 'TU_ORDER_ID' con el ID de la orden que quieres verificar

SELECT 
    sl.id,
    sl.order_id,
    sl.tracking_number,
    -- Ver estructura completa del metadata
    jsonb_pretty(sl.metadata) as metadata_completo,
    -- Intentar todas las rutas posibles para tracking_number
    sl.metadata->'full_response'->'data'->'attributes'->>'master_tracking_number' as master_tracking,
    (sl.metadata->'full_response'->'included'->0->'attributes'->>'tracking_number') as package_tracking,
    sl.metadata->'full_response'->'data'->'attributes'->>'carrier_name' as carrier_name
FROM orders.shipping_labels sl
WHERE sl.order_id = 'TU_ORDER_ID'  -- ⚠️ REEMPLAZA CON EL ORDER_ID REAL
ORDER BY sl.created_at DESC
LIMIT 1;
