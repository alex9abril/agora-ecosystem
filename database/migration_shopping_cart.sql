-- ============================================================================
-- MIGRACIÓN: Sistema de Carrito de Compras
-- ============================================================================
-- Descripción: Crea las tablas necesarias para el sistema de carrito de compras
--              que se persiste en la base de datos (no solo en localStorage)
-- 
-- Fecha: 2024-11-19
-- ============================================================================

-- ============================================================================
-- 1. TABLA: SHOPPING_CART
-- ============================================================================
-- Almacena el carrito principal de cada usuario
-- Un usuario solo puede tener un carrito activo a la vez

CREATE TABLE IF NOT EXISTS orders.shopping_cart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Usuario propietario del carrito
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Negocio/tienda del carrito (todos los productos deben ser del mismo negocio)
    business_id UUID REFERENCES core.businesses(id) ON DELETE SET NULL,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- Para limpieza automática de carritos abandonados (ej: 30 días)
    
    -- Constraint: un usuario solo puede tener un carrito activo
    CONSTRAINT shopping_cart_user_unique UNIQUE(user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_shopping_cart_user_id ON orders.shopping_cart(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_cart_business_id ON orders.shopping_cart(business_id);
CREATE INDEX IF NOT EXISTS idx_shopping_cart_expires_at ON orders.shopping_cart(expires_at) WHERE expires_at IS NOT NULL;

-- Comentarios
COMMENT ON TABLE orders.shopping_cart IS 'Carrito de compras persistente de usuarios. Un usuario solo puede tener un carrito activo.';
COMMENT ON COLUMN orders.shopping_cart.business_id IS 'Todos los productos en el carrito deben ser del mismo negocio. Se establece al agregar el primer producto.';
COMMENT ON COLUMN orders.shopping_cart.expires_at IS 'Fecha de expiración para limpieza automática de carritos abandonados. NULL = no expira.';

-- ============================================================================
-- 2. TABLA: SHOPPING_CART_ITEMS
-- ============================================================================
-- Almacena los items individuales del carrito
-- Los items idénticos (mismo producto + mismas variantes) se agrupan por cantidad

CREATE TABLE IF NOT EXISTS orders.shopping_cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Carrito al que pertenece
    cart_id UUID NOT NULL REFERENCES orders.shopping_cart(id) ON DELETE CASCADE,
    
    -- Producto
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    
    -- Variantes seleccionadas (JSONB estructurado)
    -- Formato: {"variant_group_id": "variant_id"} para selección única
    --          {"variant_group_id": ["variant_id1", "variant_id2"]} para selección múltiple
    variant_selections JSONB DEFAULT '{}'::jsonb,
    
    -- Cantidad
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    
    -- Precios (snapshot al momento de agregar al carrito)
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0), -- Precio base del producto
    variant_price_adjustment DECIMAL(10,2) DEFAULT 0.00 CHECK (variant_price_adjustment >= -999999.99), -- Suma de ajustes de precio de variantes
    item_subtotal DECIMAL(10,2) NOT NULL CHECK (item_subtotal >= 0), -- (unit_price + variant_price_adjustment) * quantity
    
    -- Notas especiales del cliente
    special_instructions TEXT,
    
    -- Columna generada para normalizar special_instructions (NULL -> '') para el constraint UNIQUE
    special_instructions_normalized TEXT GENERATED ALWAYS AS (COALESCE(special_instructions, '')) STORED,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: no duplicar items idénticos (se agrupan por cantidad)
    -- Nota: JSONB se compara por contenido, no por referencia
    CONSTRAINT shopping_cart_items_unique UNIQUE(cart_id, product_id, variant_selections, special_instructions_normalized)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_shopping_cart_items_cart_id ON orders.shopping_cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_shopping_cart_items_product_id ON orders.shopping_cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_shopping_cart_items_variant_selections ON orders.shopping_cart_items USING GIN(variant_selections);

-- Comentarios
COMMENT ON TABLE orders.shopping_cart_items IS 'Items individuales del carrito de compras. Items idénticos se agrupan incrementando la cantidad.';
COMMENT ON COLUMN orders.shopping_cart_items.variant_selections IS 'JSONB con selección de variantes. Formato: {"variant_group_id": "variant_id"} o {"variant_group_id": ["variant_id1", "variant_id2"]}';
COMMENT ON COLUMN orders.shopping_cart_items.unit_price IS 'Precio base del producto al momento de agregarlo al carrito (snapshot)';
COMMENT ON COLUMN orders.shopping_cart_items.variant_price_adjustment IS 'Suma total de ajustes de precio de las variantes seleccionadas';
COMMENT ON COLUMN orders.shopping_cart_items.item_subtotal IS 'Subtotal del item: (unit_price + variant_price_adjustment) * quantity';
COMMENT ON COLUMN orders.shopping_cart_items.special_instructions IS 'Notas especiales del cliente para este item específico';

-- ============================================================================
-- 3. FUNCIÓN: Actualizar updated_at automáticamente
-- ============================================================================

-- Función para actualizar updated_at en shopping_cart
CREATE OR REPLACE FUNCTION orders.update_shopping_cart_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para shopping_cart
DROP TRIGGER IF EXISTS trigger_update_shopping_cart_updated_at ON orders.shopping_cart;
CREATE TRIGGER trigger_update_shopping_cart_updated_at
    BEFORE UPDATE ON orders.shopping_cart
    FOR EACH ROW
    EXECUTE FUNCTION orders.update_shopping_cart_updated_at();

-- Función para actualizar updated_at en shopping_cart_items
CREATE OR REPLACE FUNCTION orders.update_shopping_cart_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para shopping_cart_items
DROP TRIGGER IF EXISTS trigger_update_shopping_cart_items_updated_at ON orders.shopping_cart_items;
CREATE TRIGGER trigger_update_shopping_cart_items_updated_at
    BEFORE UPDATE ON orders.shopping_cart_items
    FOR EACH ROW
    EXECUTE FUNCTION orders.update_shopping_cart_items_updated_at();

-- ============================================================================
-- 4. FUNCIÓN: Actualizar updated_at del carrito cuando se modifica un item
-- ============================================================================

CREATE OR REPLACE FUNCTION orders.update_cart_on_item_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar updated_at del carrito cuando se modifica un item
    UPDATE orders.shopping_cart
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.cart_id, OLD.cart_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar carrito cuando se inserta/actualiza/elimina un item
DROP TRIGGER IF EXISTS trigger_update_cart_on_item_insert ON orders.shopping_cart_items;
CREATE TRIGGER trigger_update_cart_on_item_insert
    AFTER INSERT ON orders.shopping_cart_items
    FOR EACH ROW
    EXECUTE FUNCTION orders.update_cart_on_item_change();

DROP TRIGGER IF EXISTS trigger_update_cart_on_item_update ON orders.shopping_cart_items;
CREATE TRIGGER trigger_update_cart_on_item_update
    AFTER UPDATE ON orders.shopping_cart_items
    FOR EACH ROW
    EXECUTE FUNCTION orders.update_cart_on_item_change();

DROP TRIGGER IF EXISTS trigger_update_cart_on_item_delete ON orders.shopping_cart_items;
CREATE TRIGGER trigger_update_cart_on_item_delete
    AFTER DELETE ON orders.shopping_cart_items
    FOR EACH ROW
    EXECUTE FUNCTION orders.update_cart_on_item_change();

-- ============================================================================
-- 5. VISTA: Carrito con totales calculados
-- ============================================================================

CREATE OR REPLACE VIEW orders.shopping_cart_with_totals AS
SELECT 
    sc.id,
    sc.user_id,
    sc.business_id,
    sc.created_at,
    sc.updated_at,
    sc.expires_at,
    -- Totales calculados
    COALESCE(SUM(sci.item_subtotal), 0)::DECIMAL(10,2) as cart_subtotal,
    COUNT(sci.id) as item_count,
    SUM(sci.quantity) as total_quantity
FROM orders.shopping_cart sc
LEFT JOIN orders.shopping_cart_items sci ON sci.cart_id = sc.id
GROUP BY sc.id, sc.user_id, sc.business_id, sc.created_at, sc.updated_at, sc.expires_at;

COMMENT ON VIEW orders.shopping_cart_with_totals IS 'Vista que incluye el carrito con totales calculados (subtotal, cantidad de items, cantidad total de productos)';

-- ============================================================================
-- 6. FUNCIÓN: Limpiar carritos expirados
-- ============================================================================
-- Función para eliminar carritos que han expirado (carritos abandonados)

CREATE OR REPLACE FUNCTION orders.cleanup_expired_carts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Eliminar carritos expirados (y sus items por CASCADE)
    WITH deleted AS (
        DELETE FROM orders.shopping_cart
        WHERE expires_at IS NOT NULL 
          AND expires_at < CURRENT_TIMESTAMP
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION orders.cleanup_expired_carts() IS 'Elimina carritos que han expirado. Retorna el número de carritos eliminados.';

-- ============================================================================
-- 7. NOTAS Y CONSIDERACIONES
-- ============================================================================

-- IMPORTANTE: 
-- 1. El constraint UNIQUE en shopping_cart_items previene duplicados
--    pero permite agrupar items idénticos incrementando la cantidad
-- 2. variant_selections es JSONB, por lo que se compara por contenido
-- 3. Los precios son snapshots (se guardan al momento de agregar)
-- 4. El business_id se establece al agregar el primer producto
-- 5. Todos los productos en el carrito deben ser del mismo business_id
-- 6. Los carritos expirados se pueden limpiar con la función cleanup_expired_carts()

-- Para establecer expiración automática al crear carrito:
-- INSERT INTO orders.shopping_cart (user_id, expires_at) 
-- VALUES (user_id, CURRENT_TIMESTAMP + INTERVAL '30 days');

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

