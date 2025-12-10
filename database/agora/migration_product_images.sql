-- ============================================================================
-- MIGRACIÓN: Sistema de Imágenes para Productos
-- ============================================================================
-- Esta migración crea una tabla para almacenar múltiples imágenes por producto,
-- permitiendo gestionar galerías de imágenes para cada producto.
--
-- Organización en Supabase Storage:
--   products/{product_id}/{image_id}.{ext}
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLA: catalog.product_images
-- ----------------------------------------------------------------------------
-- Almacena las imágenes asociadas a cada producto.
-- Permite múltiples imágenes por producto con orden y metadata.
--
CREATE TABLE IF NOT EXISTS catalog.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    
    -- Información del archivo
    file_path TEXT NOT NULL, -- Ruta en Supabase Storage: products/{product_id}/{image_id}.{ext}
    file_name VARCHAR(255) NOT NULL, -- Nombre original del archivo
    file_size BIGINT, -- Tamaño en bytes
    mime_type VARCHAR(100), -- image/jpeg, image/png, etc.
    
    -- Metadata de la imagen
    width INTEGER, -- Ancho en píxeles
    height INTEGER, -- Alto en píxeles
    alt_text TEXT, -- Texto alternativo para accesibilidad
    
    -- Orden de visualización (0 = principal, mayor número = más abajo)
    display_order INTEGER DEFAULT 0,
    
    -- Si es la imagen principal del producto
    is_primary BOOLEAN DEFAULT FALSE,
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT product_images_file_path_not_empty CHECK (LENGTH(TRIM(file_path)) > 0),
    CONSTRAINT product_images_file_name_not_empty CHECK (LENGTH(TRIM(file_name)) > 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON catalog.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id_active ON catalog.product_images(product_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON catalog.product_images(product_id, display_order);
CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON catalog.product_images(product_id, is_primary) WHERE is_primary = TRUE;

-- Comentarios
COMMENT ON TABLE catalog.product_images IS 'Imágenes asociadas a productos. Permite múltiples imágenes por producto con orden y metadata.';
COMMENT ON COLUMN catalog.product_images.file_path IS 'Ruta completa en Supabase Storage: products/{product_id}/{image_id}.{ext}';
COMMENT ON COLUMN catalog.product_images.file_name IS 'Nombre original del archivo subido por el usuario';
COMMENT ON COLUMN catalog.product_images.display_order IS 'Orden de visualización (0 = principal, mayor número = más abajo)';
COMMENT ON COLUMN catalog.product_images.is_primary IS 'Si es la imagen principal del producto (solo una por producto)';

-- ----------------------------------------------------------------------------
-- FUNCIÓN: Actualizar updated_at automáticamente
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION catalog.update_product_image_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_image_updated_at
BEFORE UPDATE ON catalog.product_images
FOR EACH ROW
EXECUTE FUNCTION catalog.update_product_image_updated_at();

-- ----------------------------------------------------------------------------
-- FUNCIÓN: Asegurar solo una imagen principal por producto
-- ----------------------------------------------------------------------------
-- Cuando se marca una imagen como principal, desmarca las demás del mismo producto.
--
CREATE OR REPLACE FUNCTION catalog.ensure_single_primary_image()
RETURNS TRIGGER AS $$
BEGIN
    -- Si se está marcando como principal
    IF NEW.is_primary = TRUE THEN
        -- Desmarcar todas las demás imágenes del mismo producto
        UPDATE catalog.product_images
        SET is_primary = FALSE
        WHERE product_id = NEW.product_id
          AND id != NEW.id
          AND is_primary = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_primary_image
BEFORE INSERT OR UPDATE ON catalog.product_images
FOR EACH ROW
WHEN (NEW.is_primary = TRUE)
EXECUTE FUNCTION catalog.ensure_single_primary_image();

-- ----------------------------------------------------------------------------
-- VISTA: product_images_with_urls
-- ----------------------------------------------------------------------------
-- Vista útil para obtener imágenes con URLs completas de Supabase Storage.
-- Asume que el bucket se llama 'products' y la URL base está en la configuración.
--
CREATE OR REPLACE VIEW catalog.product_images_with_urls AS
SELECT 
    pi.id,
    pi.product_id,
    pi.file_path,
    pi.file_name,
    pi.file_size,
    pi.mime_type,
    pi.width,
    pi.height,
    pi.alt_text,
    pi.display_order,
    pi.is_primary,
    pi.is_active,
    pi.created_at,
    pi.updated_at,
    -- URL pública (se construye en el backend con la URL base de Supabase Storage)
    -- Formato: {SUPABASE_STORAGE_URL}/products/{product_id}/{image_id}.{ext}
    CONCAT('/storage/v1/object/public/products/', pi.file_path) as public_url
FROM catalog.product_images pi;

COMMENT ON VIEW catalog.product_images_with_urls IS 'Vista de imágenes de productos con URLs públicas calculadas.';

-- ============================================================================
-- NOTAS DE USO
-- ============================================================================
-- 1. Organización en Supabase Storage:
--    - Bucket: 'products'
--    - Estructura: products/{product_id}/{image_id}.{ext}
--    - Ejemplo: products/123e4567-e89b-12d3-a456-426614174000/image-1234567890.jpg
--
-- 2. Imagen principal:
--    - Solo una imagen puede ser principal por producto (is_primary = TRUE)
--    - Se actualiza automáticamente mediante trigger
--
-- 3. Orden de visualización:
--    - display_order = 0 es la primera imagen
--    - Mayor número = más abajo en la galería
--
-- 4. Eliminación:
--    - Al eliminar un producto, se eliminan todas sus imágenes (CASCADE)
--    - Las imágenes en Storage deben eliminarse manualmente o mediante función
--
-- ============================================================================

