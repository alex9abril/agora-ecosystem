-- ============================================================================
-- ESQUEMA DE API KEYS Y TRACKING DE PETICIONES
-- ============================================================================
-- Descripción: Sistema de autenticación por API Keys para aplicaciones
--              separado de la autenticación de usuarios
-- 
-- Uso: Ejecutar este script después de crear el schema principal
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2024-11-13
-- ============================================================================

-- Configurar search_path
SET search_path TO public, core, commerce;

-- ============================================================================
-- TABLA: API APPLICATIONS
-- ============================================================================
-- Almacena información de las aplicaciones que consumen la API

CREATE TABLE IF NOT EXISTS core.api_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    app_type VARCHAR(50) NOT NULL, -- 'mobile-client', 'mobile-repartidor', 'web-local', 'web-admin', 'external'
    platform VARCHAR(50), -- 'ios', 'android', 'web', 'desktop'
    version VARCHAR(50), -- Versión de la app
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id), -- Usuario que creó la aplicación
    metadata JSONB, -- Información adicional (URL, contactos, etc.)
    
    CONSTRAINT api_applications_name_unique UNIQUE (name)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_api_applications_app_type ON core.api_applications(app_type);
CREATE INDEX IF NOT EXISTS idx_api_applications_is_active ON core.api_applications(is_active);
CREATE INDEX IF NOT EXISTS idx_api_applications_created_by ON core.api_applications(created_by);

-- ============================================================================
-- TABLA: API KEYS
-- ============================================================================
-- Almacena las API Keys para autenticación de aplicaciones

CREATE TABLE IF NOT EXISTS core.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES core.api_applications(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL, -- Hash de la API key (SHA-256)
    key_prefix VARCHAR(20) NOT NULL, -- Primeros caracteres para identificación (ej: "loca_abc123...")
    name VARCHAR(255) NOT NULL, -- Nombre descriptivo de la key
    description TEXT,
    scopes TEXT[], -- Permisos/alcances de la key (ej: ['read:orders', 'write:orders'])
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP, -- Fecha de expiración (NULL = sin expiración)
    last_used_at TIMESTAMP, -- Última vez que se usó
    usage_count BIGINT DEFAULT 0, -- Contador de usos
    rate_limit_per_minute INTEGER DEFAULT 100, -- Límite de requests por minuto
    rate_limit_per_hour INTEGER DEFAULT 1000, -- Límite de requests por hora
    rate_limit_per_day INTEGER DEFAULT 10000, -- Límite de requests por día
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    revoked_at TIMESTAMP, -- Fecha de revocación
    revoked_reason TEXT,
    
    CONSTRAINT api_keys_key_hash_unique UNIQUE (key_hash),
    CONSTRAINT api_keys_key_prefix_unique UNIQUE (key_prefix)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_api_keys_application_id ON core.api_keys(application_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON core.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON core.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON core.api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON core.api_keys(expires_at);

-- ============================================================================
-- TABLA: API REQUEST LOGS
-- ============================================================================
-- Registro de todas las peticiones a la API para estadísticas y auditoría

CREATE TABLE IF NOT EXISTS core.api_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES core.api_keys(id) ON DELETE SET NULL,
    application_id UUID REFERENCES core.api_applications(id) ON DELETE SET NULL,
    method VARCHAR(10) NOT NULL, -- GET, POST, PUT, DELETE, etc.
    endpoint VARCHAR(500) NOT NULL, -- Ruta del endpoint
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER, -- Tiempo de respuesta en milisegundos
    request_size_bytes INTEGER, -- Tamaño del request
    response_size_bytes INTEGER, -- Tamaño de la respuesta
    ip_address INET, -- IP de origen
    user_agent TEXT, -- User agent del cliente
    request_body JSONB, -- Body del request (opcional, para debugging)
    response_body JSONB, -- Body de la respuesta (opcional, para debugging)
    error_message TEXT, -- Mensaje de error si hubo
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Campos adicionales para análisis
    country_code VARCHAR(2), -- Código de país (si se puede determinar)
    city VARCHAR(100), -- Ciudad (si se puede determinar)
    device_type VARCHAR(50), -- 'mobile', 'desktop', 'tablet', 'unknown'
    
    CONSTRAINT api_request_logs_status_code_check CHECK (status_code >= 100 AND status_code < 600)
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_api_request_logs_api_key_id ON core.api_request_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_application_id ON core.api_request_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_created_at ON core.api_request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_endpoint ON core.api_request_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_status_code ON core.api_request_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_method ON core.api_request_logs(method);

-- Índice compuesto para estadísticas por aplicación y fecha
CREATE INDEX IF NOT EXISTS idx_api_request_logs_app_date ON core.api_request_logs(application_id, created_at DESC);

-- ============================================================================
-- TABLA: API RATE LIMITS
-- ============================================================================
-- Tracking de rate limits por API key (para control en tiempo real)

CREATE TABLE IF NOT EXISTS core.api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES core.api_keys(id) ON DELETE CASCADE,
    window_type VARCHAR(20) NOT NULL, -- 'minute', 'hour', 'day'
    window_start TIMESTAMP NOT NULL, -- Inicio de la ventana de tiempo
    request_count INTEGER DEFAULT 0, -- Contador de requests en esta ventana
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT api_rate_limits_unique UNIQUE (api_key_id, window_type, window_start)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_api_key_id ON core.api_rate_limits(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window ON core.api_rate_limits(window_type, window_start);

-- ============================================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_api_applications_updated_at
    BEFORE UPDATE ON core.api_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON core.api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar last_used_at y usage_count en api_keys
CREATE OR REPLACE FUNCTION update_api_key_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.api_key_id IS NOT NULL THEN
        UPDATE core.api_keys
        SET 
            last_used_at = CURRENT_TIMESTAMP,
            usage_count = usage_count + 1
        WHERE id = NEW.api_key_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar uso de API key cuando se registra un request
CREATE TRIGGER update_api_key_usage_on_request
    AFTER INSERT ON core.api_request_logs
    FOR EACH ROW
    WHEN (NEW.api_key_id IS NOT NULL)
    EXECUTE FUNCTION update_api_key_usage();

-- ============================================================================
-- VISTAS ÚTILES
-- ============================================================================

-- Vista: Estadísticas de uso por aplicación
CREATE OR REPLACE VIEW core.api_application_stats AS
SELECT 
    aa.id AS application_id,
    aa.name AS application_name,
    aa.app_type,
    COUNT(DISTINCT ak.id) AS total_api_keys,
    COUNT(DISTINCT CASE WHEN ak.is_active THEN ak.id END) AS active_api_keys,
    COUNT(arl.id) AS total_requests,
    COUNT(CASE WHEN arl.created_at >= CURRENT_DATE THEN arl.id END) AS requests_today,
    COUNT(CASE WHEN arl.created_at >= DATE_TRUNC('hour', CURRENT_TIMESTAMP) THEN arl.id END) AS requests_last_hour,
    AVG(arl.response_time_ms) AS avg_response_time_ms,
    COUNT(CASE WHEN arl.status_code >= 400 THEN 1 END) AS error_count,
    ROUND(
        COUNT(CASE WHEN arl.status_code >= 400 THEN 1 END)::NUMERIC / 
        NULLIF(COUNT(arl.id), 0) * 100, 
        2
    ) AS error_rate_percentage,
    MAX(arl.created_at) AS last_request_at
FROM core.api_applications aa
LEFT JOIN core.api_keys ak ON ak.application_id = aa.id
LEFT JOIN core.api_request_logs arl ON arl.application_id = aa.id
GROUP BY aa.id, aa.name, aa.app_type;

-- Vista: Estadísticas de uso por API key
CREATE OR REPLACE VIEW core.api_key_stats AS
SELECT 
    ak.id AS api_key_id,
    ak.key_prefix,
    ak.name AS key_name,
    aa.name AS application_name,
    ak.usage_count,
    ak.last_used_at,
    COUNT(arl.id) AS total_requests,
    COUNT(CASE WHEN arl.created_at >= CURRENT_DATE THEN arl.id END) AS requests_today,
    AVG(arl.response_time_ms) AS avg_response_time_ms,
    COUNT(CASE WHEN arl.status_code >= 400 THEN 1 END) AS error_count,
    MAX(arl.created_at) AS last_request_at
FROM core.api_keys ak
LEFT JOIN core.api_applications aa ON aa.id = ak.application_id
LEFT JOIN core.api_request_logs arl ON arl.api_key_id = ak.id
GROUP BY ak.id, ak.key_prefix, ak.name, aa.name, ak.usage_count, ak.last_used_at;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON TABLE core.api_applications IS 'Aplicaciones que consumen la API';
COMMENT ON TABLE core.api_keys IS 'API Keys para autenticación de aplicaciones';
COMMENT ON TABLE core.api_request_logs IS 'Log de todas las peticiones a la API para estadísticas';
COMMENT ON TABLE core.api_rate_limits IS 'Tracking de rate limits por API key';

COMMENT ON COLUMN core.api_keys.key_hash IS 'Hash SHA-256 de la API key (nunca almacenar la key en texto plano)';
COMMENT ON COLUMN core.api_keys.key_prefix IS 'Primeros caracteres de la key para identificación (ej: "loca_abc123")';
COMMENT ON COLUMN core.api_keys.scopes IS 'Array de permisos/alcances (ej: ["read:orders", "write:orders"])';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

