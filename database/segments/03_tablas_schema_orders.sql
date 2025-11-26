-- ============================================================================
-- SEGMENTO 03: TABLAS DEL SCHEMA ORDERS
-- ============================================================================
-- Descripción: Tablas del schema orders
--              - orders: Pedidos realizados por clientes
--              - order_items: Items individuales dentro de un pedido
--              - deliveries: Entregas asignadas a repartidores
-- 
-- Dependencias: Segmentos 01 y 02
-- Orden de ejecución: 03
-- ============================================================================

-- ============================================================================
-- SCHEMA: orders
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PEDIDOS
-- ----------------------------------------------------------------------------
CREATE TABLE orders.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relaciones principales
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE RESTRICT,
    
    -- Estado
    status order_status NOT NULL DEFAULT 'pending',
    
    -- Direcciones
    delivery_address_id UUID REFERENCES core.addresses(id) ON DELETE SET NULL,
    delivery_address_text TEXT, -- Dirección completa como texto
    
    -- Geolocalización de entrega
    delivery_location POINT,
    
    -- Montos
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    tax_amount DECIMAL(10,2) DEFAULT 0.00 CHECK (tax_amount >= 0), -- IVA
    delivery_fee DECIMAL(10,2) DEFAULT 0.00 CHECK (delivery_fee >= 0),
    discount_amount DECIMAL(10,2) DEFAULT 0.00 CHECK (discount_amount >= 0),
    tip_amount DECIMAL(10,2) DEFAULT 0.00 CHECK (tip_amount >= 0),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    
    -- Pago
    payment_method VARCHAR(50), -- 'localcoins', 'card', 'cash'
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
    payment_transaction_id VARCHAR(255), -- ID de transacción del Wallet o fintech
    
    -- Información de entrega
    estimated_delivery_time INTEGER, -- Minutos estimados
    actual_delivery_time INTEGER, -- Minutos reales
    delivery_notes TEXT, -- Notas especiales para la entrega
    
    -- Empaque
    packaging_type packaging_type DEFAULT 'traditional',
    
    -- Referencias externas
    wallet_transaction_id VARCHAR(255), -- ID de transacción en el Wallet (puede ser UUID o string)
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT
);

CREATE INDEX idx_orders_client_id ON orders.orders(client_id);
CREATE INDEX idx_orders_business_id ON orders.orders(business_id);
CREATE INDEX idx_orders_status ON orders.orders(status);
CREATE INDEX idx_orders_created_at ON orders.orders(created_at DESC);
CREATE INDEX idx_orders_delivery_location ON orders.orders USING GIST(delivery_location);
CREATE INDEX idx_orders_payment_status ON orders.orders(payment_status);

-- ----------------------------------------------------------------------------
-- ITEMS DE PEDIDO
-- ----------------------------------------------------------------------------
CREATE TABLE orders.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
    
    -- Relación: puede ser un producto individual O una colección
    product_id UUID REFERENCES catalog.products(id) ON DELETE SET NULL,
    collection_id UUID REFERENCES catalog.collections(id) ON DELETE SET NULL,
    
    -- Constraint: debe ser producto O colección, no ambos ni ninguno
    CONSTRAINT order_items_item_check CHECK (
        (product_id IS NOT NULL AND collection_id IS NULL) OR
        (product_id IS NULL AND collection_id IS NOT NULL)
    ),
    
    -- Información del item (snapshot al momento del pedido)
    item_name VARCHAR(255) NOT NULL, -- Nombre del producto o colección
    item_price DECIMAL(10,2) NOT NULL CHECK (item_price >= 0),
    
    -- Cantidad y variantes
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    variant_selection JSONB, -- Selección de variantes del producto (solo para productos)
    
    -- Montos
    item_subtotal DECIMAL(10,2) NOT NULL CHECK (item_subtotal >= 0),
    
    -- Notas especiales
    special_instructions TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order_id ON orders.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON orders.order_items(product_id);
CREATE INDEX idx_order_items_collection_id ON orders.order_items(collection_id);

-- ----------------------------------------------------------------------------
-- REPARTIDORES
-- ----------------------------------------------------------------------------
CREATE TABLE core.repartidores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Información del repartidor
    vehicle_type vehicle_type NOT NULL,
    vehicle_description VARCHAR(255), -- Marca, modelo, color
    license_plate VARCHAR(20),
    
    -- Documentación
    id_document_url TEXT, -- URL de identificación oficial
    license_document_url TEXT, -- URL de licencia de conducir
    
    -- Estado operativo
    is_available BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Ubicación actual
    current_location POINT,
    last_location_update TIMESTAMP,
    
    -- Métricas
    total_deliveries INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    
    -- Configuración ecológica
    is_green_repartidor BOOLEAN DEFAULT FALSE, -- Repartidor ecológico (bicicleta, eléctrico)
    
    -- Referencia externa al Wallet
    wallet_repartidor_id VARCHAR(255), -- ID del repartidor en el sistema Wallet (puede ser UUID o string)
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_repartidores_user_id ON core.repartidores(user_id);
CREATE INDEX idx_repartidores_is_available ON core.repartidores(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_repartidores_current_location ON core.repartidores USING GIST(current_location);
CREATE INDEX idx_repartidores_is_green ON core.repartidores(is_green_repartidor);

-- ----------------------------------------------------------------------------
-- ENTREGAS
-- ----------------------------------------------------------------------------
CREATE TABLE orders.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders.orders(id) ON DELETE CASCADE,
    repartidor_id UUID REFERENCES core.repartidores(id) ON DELETE SET NULL,
    
    -- Estado
    status delivery_status NOT NULL DEFAULT 'available',
    
    -- Ubicaciones
    pickup_location POINT NOT NULL, -- Ubicación del local
    delivery_location POINT NOT NULL, -- Ubicación de entrega
    
    -- Distancia y tiempo
    distance_km DECIMAL(8,2), -- Distancia en kilómetros
    estimated_time_minutes INTEGER,
    actual_time_minutes INTEGER,
    
    -- Información de entrega
    pickup_instructions TEXT,
    delivery_instructions TEXT,
    
    -- Timestamps
    assigned_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    delivered_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deliveries_order_id ON orders.deliveries(order_id);
CREATE INDEX idx_deliveries_repartidor_id ON orders.deliveries(repartidor_id);
CREATE INDEX idx_deliveries_status ON orders.deliveries(status);
CREATE INDEX idx_deliveries_pickup_location ON orders.deliveries USING GIST(pickup_location);
CREATE INDEX idx_deliveries_delivery_location ON orders.deliveries USING GIST(delivery_location);

-- ============================================================================
