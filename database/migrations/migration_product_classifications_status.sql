-- ============================================================================
-- MIGRACION: Clasificaciones/Colecciones de Productos con campo status
-- ============================================================================
-- Descripcion:
--   - Renombra (via recreacion) las tablas de clasificaciones/colecciones.
--   - Agrega columna status a ambas tablas.
--   - Incluye indices por business_id.
--
-- Nota: Destructivo. Se eliminan las tablas existentes antes de crearlas.
-- Uso: Ejecutar despues de cargar el schema base.
-- ============================================================================

SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- Limpieza defensiva
DROP TABLE IF EXISTS catalog.product_coleccion_assignments;
DROP TABLE IF EXISTS catalog.product_colecciones;
DROP TABLE IF EXISTS catalog.product_classification_assignments;
DROP TABLE IF EXISTS catalog.product_classifications;

-- Colecciones por negocio (antes "clasificaciones")
CREATE TABLE IF NOT EXISTS catalog.product_colecciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_id, name),
    UNIQUE(business_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_product_colecciones_business_id ON catalog.product_colecciones(business_id);

-- Relacion producto-coleccion por sucursal
CREATE TABLE IF NOT EXISTS catalog.product_coleccion_assignments (
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    coleccion_id UUID NOT NULL REFERENCES catalog.product_colecciones(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    PRIMARY KEY (product_id, coleccion_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_product_coleccion_assignments_business ON catalog.product_coleccion_assignments(business_id);
