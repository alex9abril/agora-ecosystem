# Sistema de Configuraciones e Impuestos

## 📋 Resumen Ejecutivo

Este documento describe el sistema de configuraciones del sitio y específicamente la configuración de impuestos en AGORA. El sistema permite gestionar cómo se aplican y muestran los impuestos en el storefront.

## 🎯 Objetivo

Permitir configurar cómo se aplican los impuestos a los productos:
- **Impuestos incluidos**: El precio mostrado ya incluye los impuestos
- **Impuestos agregados**: Los impuestos se calculan y agregan al precio base

## 🏗️ Arquitectura del Sistema

### Modelo de Datos

El sistema utiliza una tabla genérica `catalog.site_settings` que permite almacenar cualquier tipo de configuración:

```
site_settings
  ├── key (único): "taxes.included_in_price"
  ├── value (JSONB): true/false
  ├── category: "taxes"
  ├── label: "Impuestos Incluidos en Precio"
  ├── description: "Define si los impuestos ya están incluidos..."
  └── value_type: "boolean"
```

### Configuraciones de Impuestos

#### 1. `taxes.included_in_price` (Boolean)

**Descripción:** Define si los impuestos ya están incluidos en el precio base de los productos o si se deben agregar al precio mostrado.

**Valores:**
- `true`: Los impuestos están incluidos en el precio
- `false`: Los impuestos se calculan y agregan al precio

**Ejemplo de uso:**

**Caso 1: Impuestos incluidos (`true`)**
- Producto precio base: $100.00
- IVA 16%: Ya incluido en los $100.00
- Precio mostrado en storefront: **$100.00** (con etiqueta "Impuestos incluidos")

**Caso 2: Impuestos agregados (`false`)**
- Producto precio base: $100.00
- IVA 16%: Se calcula y agrega
- Precio mostrado en storefront: **$116.00** ($100.00 + $16.00 de IVA)

#### 2. `taxes.display_tax_breakdown` (Boolean)

**Descripción:** Define si se debe mostrar el desglose detallado de impuestos en el storefront.

**Valores:**
- `true`: Mostrar desglose (IVA: $16.00, IEPS: $5.00, etc.)
- `false`: Mostrar solo el total de impuestos

#### 3. `taxes.show_tax_included_label` (Boolean)

**Descripción:** Define si se debe mostrar una etiqueta indicando que los impuestos están incluidos en el precio.

**Valores:**
- `true`: Mostrar etiqueta "Precio con impuestos incluidos"
- `false`: No mostrar etiqueta

**Nota:** Solo tiene efecto si `taxes.included_in_price` es `true`.

## 🔄 Flujo de Trabajo

### 1. Configuración en Web-Admin

1. Administrador accede a **Configuración** → **Impuestos**
2. Configura:
   - ✅/❌ Impuestos incluidos en precio
   - ✅/❌ Mostrar desglose de impuestos
   - ✅/❌ Mostrar etiqueta "Impuestos incluidos"

### 2. Aplicación en Storefront

#### Cuando `taxes.included_in_price = true`:

```typescript
// Precio mostrado = precio base (ya incluye impuestos)
const displayPrice = product.price;

// Si show_tax_included_label = true, mostrar:
// "Precio con impuestos incluidos"
```

#### Cuando `taxes.included_in_price = false`:

```typescript
// Calcular impuestos
const taxes = await calculateProductTaxes(productId, product.price);
const totalTax = taxes.total_tax;

// Precio mostrado = precio base + impuestos
const displayPrice = product.price + totalTax;

// Si display_tax_breakdown = true, mostrar desglose:
// Subtotal: $100.00
// IVA (16%): $16.00
// Total: $116.00
```

## 📊 Ejemplos de Cálculo

### Ejemplo 1: Impuestos Incluidos

**Configuración:**
- `taxes.included_in_price`: `true`
- Producto precio: $100.00
- IVA 16%: Ya incluido

**Cálculo:**
```
Precio mostrado = $100.00
IVA incluido = $13.79 (100 / 1.16 * 0.16)
Precio base real = $86.21
```

**Display en storefront:**
```
$100.00
*Impuestos incluidos
```

### Ejemplo 2: Impuestos Agregados

**Configuración:**
- `taxes.included_in_price`: `false`
- Producto precio: $100.00
- IVA 16%: Se agrega

**Cálculo:**
```
Precio base = $100.00
IVA (16%) = $16.00
Total = $116.00
```

**Display en storefront (con desglose):**
```
Subtotal: $100.00
IVA (16%): $16.00
─────────────────
Total: $116.00
```

### Ejemplo 3: Múltiples Impuestos

**Configuración:**
- `taxes.included_in_price`: `false`
- Producto precio: $100.00
- IVA 16%: $16.00
- IEPS 8%: $8.00

**Cálculo:**
```
Precio base = $100.00
IVA (16%) = $16.00
IEPS (8%) = $8.00
Total impuestos = $24.00
Total = $124.00
```

**Display en storefront:**
```
Subtotal: $100.00
IVA (16%): $16.00
IEPS (8%): $8.00
─────────────────
Total: $124.00
```

## 🔧 Implementación Técnica

### Backend

#### Obtener configuración de impuestos
```typescript
const taxSettings = await settingsService.getTaxSettings();
// {
//   included_in_price: false,
//   display_tax_breakdown: true,
//   show_tax_included_label: true
// }
```

#### Calcular precio con impuestos
```typescript
const productPrice = 100.00;
const taxSettings = await settingsService.getTaxSettings();

if (taxSettings.included_in_price) {
  // Precio ya incluye impuestos
  const displayPrice = productPrice;
} else {
  // Calcular y agregar impuestos
  const taxes = await taxesService.calculateProductTaxes(productId, productPrice);
  const displayPrice = productPrice + taxes.total_tax;
}
```

### Frontend (Storefront - Futuro)

```typescript
// Obtener configuración
const taxSettings = await fetch('/api/settings/taxes').then(r => r.json());

// Calcular precio a mostrar
let displayPrice = product.price;
let taxBreakdown = null;

if (!taxSettings.included_in_price) {
  const taxes = await fetch(`/api/catalog/taxes/products/${product.id}/calculate?subtotal=${product.price}`)
    .then(r => r.json());
  
  displayPrice = product.price + taxes.total_tax;
  taxBreakdown = taxes.taxes;
}

// Renderizar
<div>
  <div className="price">${displayPrice.toFixed(2)}</div>
  {taxSettings.included_in_price && taxSettings.show_tax_included_label && (
    <div className="tax-label">*Impuestos incluidos</div>
  )}
  {!taxSettings.included_in_price && taxSettings.display_tax_breakdown && taxBreakdown && (
    <div className="tax-breakdown">
      <div>Subtotal: ${product.price.toFixed(2)}</div>
      {taxBreakdown.map(tax => (
        <div key={tax.tax_type_id}>
          {tax.tax_name} ({tax.rate * 100}%): ${tax.amount.toFixed(2)}
        </div>
      ))}
      <div>Total: ${displayPrice.toFixed(2)}</div>
    </div>
  )}
</div>
```

## 📝 Notas de Implementación

### Ventajas del Diseño

1. **Flexibilidad**: Sistema genérico que permite agregar más configuraciones fácilmente
2. **Escalabilidad**: Fácil agregar nuevas categorías de configuración
3. **Validación**: Validación automática según tipo de valor
4. **UI Amigable**: Descripciones y ayuda para cada configuración

### Consideraciones

1. **Cambio de Configuración**: Si se cambia `taxes.included_in_price`, los precios mostrados cambiarán inmediatamente
2. **Consistencia**: Todos los productos deben seguir la misma configuración
3. **Migración**: Los productos existentes se adaptan automáticamente a la nueva configuración

## 🚀 Próximos Pasos

1. ✅ Crear estructura de base de datos
2. ✅ Crear backend y frontend para gestión
3. ⏳ Integrar con cálculo de impuestos existente
4. ⏳ Implementar en storefront (web-local)
5. ⏳ Agregar más configuraciones según necesidad

## 🔗 Referencias

- [Sistema de Impuestos](../database/segments/17_sistema_impuestos.sql)
- [API de Impuestos](../../apps/backend/src/modules/catalog/taxes)



