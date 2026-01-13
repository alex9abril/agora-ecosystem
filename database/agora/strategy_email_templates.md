# Estrategia de Diseño: Templates de Correo Electrónico

## 📋 Resumen Ejecutivo

Sistema de templates de correo con tres niveles de jerarquía:
1. **Global (AGORA)**: Templates por defecto de la plataforma
2. **Grupo Empresarial**: Templates personalizados por grupo
3. **Sucursal**: Templates personalizados por sucursal

**Principio de Herencia**: Si no existe template en un nivel, se usa el del nivel superior.

---

## 🏗️ Arquitectura de Niveles

```
┌─────────────────────────────────────┐
│  NIVEL 1: GLOBAL (AGORA)           │
│  Templates por defecto              │
│  Schema: communication              │
└──────────────┬──────────────────────┘
               │
               │ (herencia si no existe en grupo)
               ▼
┌─────────────────────────────────────┐
│  NIVEL 2: GRUPO EMPRESARIAL        │
│  Templates personalizados          │
│  Schema: core                       │
│  Relación: business_group_id        │
└──────────────┬──────────────────────┘
               │
               │ (herencia si no existe en sucursal)
               ▼
┌─────────────────────────────────────┐
│  NIVEL 3: SUCURSAL                 │
│  Templates personalizados           │
│  Schema: core                       │
│  Relación: business_id              │
└─────────────────────────────────────┘
```

---

## 📊 Diseño de Tablas

### 1. Tabla: `communication.email_templates` (Nivel Global)

**Propósito**: Templates por defecto de la plataforma AGORA.

```sql
CREATE TABLE communication.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificación del template
    trigger_type VARCHAR(50) NOT NULL UNIQUE, -- 'user_registration', 'order_confirmation', 'order_status_change'
    name VARCHAR(255) NOT NULL, -- 'Correo de Bienvenida', 'Confirmación de Pedido', etc.
    description TEXT,
    
    -- Contenido del template
    subject VARCHAR(500) NOT NULL, -- Asunto del correo (puede incluir variables {{variable}})
    template_html TEXT NOT NULL, -- Template HTML completo
    template_text TEXT, -- Versión texto plano (opcional)
    
    -- Variables disponibles
    available_variables TEXT[] NOT NULL DEFAULT '{}', -- ['user_name', 'order_number', etc.]
    
    -- Configuración
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_system BOOLEAN NOT NULL DEFAULT TRUE, -- Siempre TRUE para templates globales
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id), -- Usuario que creó/modificó
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT email_templates_trigger_type_not_empty CHECK (LENGTH(TRIM(trigger_type)) > 0),
    CONSTRAINT email_templates_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT email_templates_subject_not_empty CHECK (LENGTH(TRIM(subject)) > 0)
);

-- Índices
CREATE INDEX idx_email_templates_trigger_type ON communication.email_templates(trigger_type);
CREATE INDEX idx_email_templates_is_active ON communication.email_templates(is_active) WHERE is_active = TRUE;

-- Comentarios
COMMENT ON TABLE communication.email_templates IS 'Templates de correo globales (nivel plataforma AGORA)';
COMMENT ON COLUMN communication.email_templates.trigger_type IS 'Tipo de evento que dispara el correo (user_registration, order_confirmation, order_status_change)';
COMMENT ON COLUMN communication.email_templates.is_system IS 'Siempre TRUE para templates globales, no se pueden eliminar';
```

---

### 2. Tabla: `core.business_group_email_templates` (Nivel Grupo)

**Propósito**: Templates personalizados por grupo empresarial (override del global).

```sql
CREATE TABLE core.business_group_email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con grupo empresarial
    business_group_id UUID NOT NULL REFERENCES core.business_groups(id) ON DELETE CASCADE,
    
    -- Relación con template global (opcional, para referencia)
    global_template_id UUID REFERENCES communication.email_templates(id) ON DELETE SET NULL,
    
    -- Identificación del template
    trigger_type VARCHAR(50) NOT NULL, -- Debe coincidir con el global
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Contenido del template (override)
    subject VARCHAR(500) NOT NULL,
    template_html TEXT NOT NULL,
    template_text TEXT,
    
    -- Variables disponibles (heredadas del global, pero pueden agregarse más)
    available_variables TEXT[] NOT NULL DEFAULT '{}',
    
    -- Configuración
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    inherit_from_global BOOLEAN NOT NULL DEFAULT FALSE, -- Si TRUE, usa el global cuando está inactivo
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT business_group_email_templates_unique UNIQUE (business_group_id, trigger_type),
    CONSTRAINT business_group_email_templates_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT business_group_email_templates_subject_not_empty CHECK (LENGTH(TRIM(subject)) > 0)
);

-- Índices
CREATE INDEX idx_business_group_email_templates_group ON core.business_group_email_templates(business_group_id);
CREATE INDEX idx_business_group_email_templates_trigger ON core.business_group_email_templates(trigger_type);
CREATE INDEX idx_business_group_email_templates_active ON core.business_group_email_templates(business_group_id, is_active) WHERE is_active = TRUE;

-- Comentarios
COMMENT ON TABLE core.business_group_email_templates IS 'Templates de correo personalizados por grupo empresarial (override del global)';
COMMENT ON COLUMN core.business_group_email_templates.inherit_from_global IS 'Si TRUE y is_active=FALSE, usa el template global como fallback';
```

---

### 3. Tabla: `core.business_email_templates` (Nivel Sucursal)

**Propósito**: Templates personalizados por sucursal (override del grupo o global).

```sql
CREATE TABLE core.business_email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con sucursal
    business_id UUID NOT NULL REFERENCES core.businesses(id) ON DELETE CASCADE,
    
    -- Relación con template de grupo (opcional, para referencia)
    group_template_id UUID REFERENCES core.business_group_email_templates(id) ON DELETE SET NULL,
    
    -- Relación con template global (opcional, para referencia)
    global_template_id UUID REFERENCES communication.email_templates(id) ON DELETE SET NULL,
    
    -- Identificación del template
    trigger_type VARCHAR(50) NOT NULL, -- Debe coincidir con el global/grupo
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Contenido del template (override)
    subject VARCHAR(500) NOT NULL,
    template_html TEXT NOT NULL,
    template_text TEXT,
    
    -- Variables disponibles
    available_variables TEXT[] NOT NULL DEFAULT '{}',
    
    -- Configuración
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    inherit_from_group BOOLEAN NOT NULL DEFAULT TRUE, -- Si TRUE, usa el del grupo cuando está inactivo
    inherit_from_global BOOLEAN NOT NULL DEFAULT TRUE, -- Si TRUE, usa el global como último recurso
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT business_email_templates_unique UNIQUE (business_id, trigger_type),
    CONSTRAINT business_email_templates_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT business_email_templates_subject_not_empty CHECK (LENGTH(TRIM(subject)) > 0)
);

-- Índices
CREATE INDEX idx_business_email_templates_business ON core.business_email_templates(business_id);
CREATE INDEX idx_business_email_templates_trigger ON core.business_email_templates(trigger_type);
CREATE INDEX idx_business_email_templates_active ON core.business_email_templates(business_id, is_active) WHERE is_active = TRUE;

-- Comentarios
COMMENT ON TABLE core.business_email_templates IS 'Templates de correo personalizados por sucursal (override del grupo o global)';
COMMENT ON COLUMN core.business_email_templates.inherit_from_group IS 'Si TRUE y is_active=FALSE, usa el template del grupo como fallback';
COMMENT ON COLUMN core.business_email_templates.inherit_from_global IS 'Si TRUE y no hay template en grupo, usa el global como último recurso';
```

---

## 🔄 Función de Resolución de Templates

**Función SQL para obtener el template correcto según la jerarquía:**

```sql
CREATE OR REPLACE FUNCTION communication.get_email_template(
    p_trigger_type VARCHAR(50),
    p_business_id UUID DEFAULT NULL,
    p_business_group_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    subject VARCHAR(500),
    template_html TEXT,
    template_text TEXT,
    available_variables TEXT[],
    level VARCHAR(20) -- 'global', 'group', 'business'
) AS $$
DECLARE
    v_business_group_id UUID;
BEGIN
    -- Si se proporciona business_id, obtener su business_group_id
    IF p_business_id IS NOT NULL THEN
        SELECT business_group_id INTO v_business_group_id
        FROM core.businesses
        WHERE id = p_business_id;
    ELSE
        v_business_group_id := p_business_group_id;
    END IF;
    
    -- 1. Intentar obtener template a nivel sucursal
    IF p_business_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            bet.id,
            bet.subject,
            bet.template_html,
            bet.template_text,
            bet.available_variables,
            'business'::VARCHAR(20) as level
        FROM core.business_email_templates bet
        WHERE bet.business_id = p_business_id
          AND bet.trigger_type = p_trigger_type
          AND bet.is_active = TRUE
        LIMIT 1;
        
        -- Si se encontró, retornar
        IF FOUND THEN
            RETURN;
        END IF;
    END IF;
    
    -- 2. Intentar obtener template a nivel grupo
    IF v_business_group_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            bget.id,
            bget.subject,
            bget.template_html,
            bget.template_text,
            bget.available_variables,
            'group'::VARCHAR(20) as level
        FROM core.business_group_email_templates bget
        WHERE bget.business_group_id = v_business_group_id
          AND bget.trigger_type = p_trigger_type
          AND bget.is_active = TRUE
        LIMIT 1;
        
        -- Si se encontró, retornar
        IF FOUND THEN
            RETURN;
        END IF;
    END IF;
    
    -- 3. Usar template global (siempre existe)
    RETURN QUERY
    SELECT 
        et.id,
        et.subject,
        et.template_html,
        et.template_text,
        et.available_variables,
        'global'::VARCHAR(20) as level
    FROM communication.email_templates et
    WHERE et.trigger_type = p_trigger_type
      AND et.is_active = TRUE
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION communication.get_email_template IS 'Obtiene el template de correo según la jerarquía: business -> group -> global';
```

---

## 📝 Triggers y Funciones de Auditoría

### Trigger para `updated_at` en todas las tablas:

```sql
-- Función genérica para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a communication.email_templates
CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON communication.email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Aplicar a core.business_group_email_templates
CREATE TRIGGER update_business_group_email_templates_updated_at
    BEFORE UPDATE ON core.business_group_email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Aplicar a core.business_email_templates
CREATE TRIGGER update_business_email_templates_updated_at
    BEFORE UPDATE ON core.business_email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 🎯 Casos de Uso

### Caso 1: Usuario se registra (user_registration)
```sql
-- Obtener template según jerarquía
SELECT * FROM communication.get_email_template(
    'user_registration',
    p_business_id := NULL, -- No aplica para registro
    p_business_group_id := NULL -- No aplica para registro
);
-- Resultado: Siempre usa template global
```

### Caso 2: Pedido confirmado (order_confirmation)
```sql
-- Obtener template para una sucursal específica
SELECT * FROM communication.get_email_template(
    'order_confirmation',
    p_business_id := 'business-uuid-here'
);
-- Resultado: 
-- 1. Si existe template en business_email_templates → usa ese
-- 2. Si no, busca en business_group_email_templates del grupo
-- 3. Si no, usa communication.email_templates (global)
```

### Caso 3: Cambio de estado de pedido (order_status_change)
```sql
-- Similar al caso 2, pero con lógica de herencia
SELECT * FROM communication.get_email_template(
    'order_status_change',
    p_business_id := 'business-uuid-here'
);
```

---

## 🔐 Permisos y Seguridad

### RLS (Row Level Security) - Opcional pero recomendado:

```sql
-- Habilitar RLS en las tablas
ALTER TABLE communication.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.business_group_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.business_email_templates ENABLE ROW LEVEL SECURITY;

-- Políticas (ejemplo básico)
-- Solo superadmins pueden modificar templates globales
CREATE POLICY "Only superadmins can modify global templates"
    ON communication.email_templates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM core.user_profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Los dueños del grupo pueden modificar templates de su grupo
CREATE POLICY "Group owners can modify their group templates"
    ON core.business_group_email_templates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM core.business_groups
            WHERE id = business_group_id
            AND owner_id = auth.uid()
        )
    );

-- Los dueños de la sucursal pueden modificar templates de su sucursal
CREATE POLICY "Business owners can modify their business templates"
    ON core.business_email_templates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM core.businesses
            WHERE id = business_id
            AND owner_id = auth.uid()
        )
    );
```

---

## 📊 Vistas Útiles

### Vista: Templates con información de herencia

```sql
CREATE OR REPLACE VIEW communication.email_templates_hierarchy AS
SELECT 
    'global' as level,
    et.id,
    et.trigger_type,
    et.name,
    et.is_active,
    NULL::UUID as business_group_id,
    NULL::UUID as business_id,
    et.created_at,
    et.updated_at
FROM communication.email_templates et

UNION ALL

SELECT 
    'group' as level,
    bget.id,
    bget.trigger_type,
    bget.name,
    bget.is_active,
    bget.business_group_id,
    NULL::UUID as business_id,
    bget.created_at,
    bget.updated_at
FROM core.business_group_email_templates bget

UNION ALL

SELECT 
    'business' as level,
    bet.id,
    bet.trigger_type,
    bet.name,
    bet.is_active,
    b.business_group_id,
    bet.business_id,
    bet.created_at,
    bet.updated_at
FROM core.business_email_templates bet
JOIN core.businesses b ON b.id = bet.business_id;

COMMENT ON VIEW communication.email_templates_hierarchy IS 'Vista unificada de todos los templates en todos los niveles';
```

---

## 🚀 Plan de Implementación

### Fase 1: Crear tablas y estructura base
1. ✅ Crear `communication.email_templates` (global)
2. ✅ Crear `core.business_group_email_templates` (grupo)
3. ✅ Crear `core.business_email_templates` (sucursal)
4. ✅ Crear índices y constraints

### Fase 2: Funciones y lógica
1. ✅ Crear función `get_email_template()`
2. ✅ Crear triggers de `updated_at`
3. ✅ Crear vistas útiles

### Fase 3: Datos iniciales
1. ✅ Insertar templates globales por defecto
2. ✅ Migrar templates existentes (si hay)

### Fase 4: Seguridad
1. ✅ Configurar RLS (opcional)
2. ✅ Crear políticas de acceso

### Fase 5: Backend API
1. ✅ Endpoints para CRUD de templates
2. ✅ Endpoint para obtener template resuelto
3. ✅ Validación de variables

### Fase 6: Frontend
1. ✅ Conectar con API
2. ✅ Mostrar templates según nivel
3. ✅ Editor visual funcional

---

## 📌 Notas Importantes

1. **Unicidad**: Cada nivel tiene UN template por `trigger_type`
2. **Herencia**: Si un template está inactivo, se usa el del nivel superior
3. **Variables**: Las variables disponibles se heredan, pero pueden agregarse más en niveles inferiores
4. **Auditoría**: `created_by` y `updated_by` para rastrear cambios
5. **Soft Delete**: No se eliminan templates, solo se desactivan (`is_active = FALSE`)

---

## 🔄 Migración de Datos Existentes

Si ya existen templates hardcodeados en el frontend:

```sql
-- Insertar templates globales desde el código existente
INSERT INTO communication.email_templates (
    trigger_type,
    name,
    description,
    subject,
    template_html,
    available_variables,
    is_active,
    is_system
) VALUES
('user_registration', 'Correo de Bienvenida', 'Se envía cuando un usuario se registra', 'Bienvenido a LOCALIA', '<html>...', ARRAY['user_name', 'app_url'], TRUE, TRUE),
('order_confirmation', 'Confirmación de Pedido', 'Se envía cuando se confirma un pedido', 'Confirmación de tu pedido #{{order_number}}', '<html>...', ARRAY['user_name', 'order_number', 'order_date', 'order_total', 'payment_method', 'order_url'], TRUE, TRUE),
('order_status_change', 'Cambio de Estado de Pedido', 'Se envía cuando cambia el estado de un pedido', 'Actualización de tu pedido #{{order_number}}', '<html>...', ARRAY['user_name', 'order_number', 'previous_status', 'current_status', 'status_message', 'order_url'], TRUE, TRUE);
```

---

## ✅ Checklist de Validación

- [ ] Tablas creadas en los 3 niveles
- [ ] Índices optimizados
- [ ] Función de resolución implementada
- [ ] Triggers de auditoría funcionando
- [ ] Templates globales insertados
- [ ] RLS configurado (opcional)
- [ ] Vistas útiles creadas
- [ ] Documentación completa

