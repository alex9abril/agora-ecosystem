# Sistema de Personalización y Branding

## 📋 Resumen Ejecutivo

Este documento describe el sistema completo de personalización y branding para grupos empresariales y sucursales en AGORA. Permite configurar logos, colores, fuentes, textos y otros elementos visuales de la interfaz.

## 🎯 Objetivo

Permitir que cada grupo empresarial y sucursal personalice su identidad visual en el storefront, incluyendo:
- Logos (principal, light, dark, favicon)
- Colores (primario, secundario, acento, textos, fondos, estados)
- Fuentes (primaria, secundaria, títulos)
- Textos personalizados (bienvenida, tagline, footer, contacto)
- Redes sociales
- CSS/JavaScript personalizado (opcional)

## 🏗️ Arquitectura del Sistema

### Modelo de Datos

El sistema utiliza el campo `settings` (JSONB) tanto en `business_groups` como en `businesses`:

```sql
-- business_groups.settings
{
  "branding": {
    "logo_url": "...",
    "colors": { ... },
    "fonts": { ... },
    "texts": { ... },
    "social_media": { ... }
  }
}

-- businesses.settings
{
  "branding": {
    // Puede sobrescribir valores del grupo
    "logo_url": "...",
    "colors": { ... }
  }
}
```

### Herencia de Branding

Las sucursales **heredan** la configuración de branding del grupo empresarial:
- Si una sucursal no define un campo, usa el valor del grupo
- Si una sucursal define un campo, sobrescribe el valor del grupo
- La función `core.get_business_branding()` combina automáticamente ambos

**Ejemplo:**
```sql
-- Grupo tiene primary_color: "#FF5733"
-- Sucursal no define primary_color
-- Resultado: Sucursal usa "#FF5733" del grupo

-- Grupo tiene primary_color: "#FF5733"
-- Sucursal define primary_color: "#00FF00"
-- Resultado: Sucursal usa "#00FF00" (sobrescribe)
```

## 📊 Estructura de Branding

### Logos

```typescript
{
  logo_url: string;        // Logo principal
  logo_light_url: string;  // Logo para fondos claros
  logo_dark_url: string;   // Logo para fondos oscuros
  favicon_url: string;     // Favicon
}
```

### Colores

```typescript
{
  primary_color: string;           // Color primario (#FF5733)
  secondary_color: string;         // Color secundario (#33C3F0)
  accent_color: string;            // Color de acento (#FFC300)
  text_primary: string;           // Texto primario (#1A1A1A)
  text_secondary: string;         // Texto secundario (#666666)
  background_color: string;        // Fondo principal (#FFFFFF)
  background_secondary: string;   // Fondo secundario (#F5F5F5)
  success_color: string;          // Éxito (#28A745)
  warning_color: string;           // Advertencia (#FFC107)
  error_color: string;            // Error (#DC3545)
  info_color: string;             // Información (#17A2B8)
}
```

### Fuentes

```typescript
{
  primary: string;    // Fuente primaria ("Inter, Arial, sans-serif")
  secondary: string; // Fuente secundaria ("Roboto, Arial, sans-serif")
  heading: string;   // Fuente para títulos ("Poppins, Arial, sans-serif")
}
```

### Textos

```typescript
{
  welcome_message: string;  // "Bienvenido a nuestra tienda"
  tagline: string;          // "Tu tienda de confianza"
  footer_text: string;      // "© 2025 Todos los derechos reservados"
  contact_message: string;   // "¿Necesitas ayuda? Contáctanos"
}
```

### Redes Sociales

```typescript
{
  facebook: string;   // "https://facebook.com/tienda"
  instagram: string; // "https://instagram.com/tienda"
  twitter: string;   // "https://twitter.com/tienda"
  whatsapp: string;  // "+521234567890"
}
```

### Avanzado

```typescript
{
  custom_css: string; // CSS personalizado (opcional)
  custom_js: string;  // JavaScript personalizado (opcional)
}
```

## 🔄 Flujo de Trabajo

### 1. Configuración en Web-Admin

1. Administrador accede a **Tiendas** → **Grupos** o **Sucursales**
2. Hace clic en el botón de personalización (ícono de pincel)
3. Configura:
   - **Logos**: Sube o ingresa URLs de logos
   - **Colores**: Selecciona colores con preview en tiempo real
   - **Fuentes**: Define fuentes personalizadas
   - **Textos**: Personaliza mensajes
   - **Redes Sociales**: Agrega enlaces
   - **Avanzado**: CSS/JS personalizado (opcional)
4. Guarda los cambios

### 2. Aplicación en Storefront

El storefront debe:
1. Obtener branding de la sucursal: `GET /businesses/{id}/branding`
2. Aplicar colores como variables CSS
3. Cargar logos según el contexto (light/dark)
4. Aplicar fuentes personalizadas
5. Mostrar textos personalizados
6. Inyectar CSS/JS personalizado si existe

## 🔧 Implementación Técnica

### Backend

#### Obtener branding de grupo
```typescript
GET /businesses/groups/{id}/branding
Response: { branding: { ... } }
```

#### Actualizar branding de grupo
```typescript
PUT /businesses/groups/{id}/branding
Body: { branding: { ... } }
```

#### Obtener branding de sucursal (con herencia)
```typescript
GET /businesses/{id}/branding
Response: { branding: { ... } } // Combina grupo + sucursal
```

#### Actualizar branding de sucursal
```typescript
PUT /businesses/{id}/branding
Body: { branding: { ... } }
```

### Frontend (Storefront - Futuro)

```typescript
// Obtener branding
const branding = await fetch(`/api/businesses/${businessId}/branding`).then(r => r.json());

// Aplicar colores como variables CSS
document.documentElement.style.setProperty('--primary-color', branding.branding.colors?.primary_color || '#FF5733');
document.documentElement.style.setProperty('--secondary-color', branding.branding.colors?.secondary_color || '#33C3F0');

// Aplicar fuentes
document.documentElement.style.setProperty('--font-primary', branding.branding.fonts?.primary || 'Inter, sans-serif');

// Cargar logo según contexto
const logoUrl = isDarkMode 
  ? branding.branding.logo_dark_url || branding.branding.logo_url
  : branding.branding.logo_light_url || branding.branding.logo_url;

// Inyectar CSS personalizado
if (branding.branding.custom_css) {
  const style = document.createElement('style');
  style.textContent = branding.branding.custom_css;
  document.head.appendChild(style);
}
```

## 📝 Ejemplos de Uso

### Ejemplo 1: Grupo con Branding Completo

```json
{
  "branding": {
    "logo_url": "https://example.com/logo.png",
    "logo_light_url": "https://example.com/logo-light.png",
    "logo_dark_url": "https://example.com/logo-dark.png",
    "favicon_url": "https://example.com/favicon.ico",
    "colors": {
      "primary_color": "#FF5733",
      "secondary_color": "#33C3F0",
      "accent_color": "#FFC300",
      "text_primary": "#1A1A1A",
      "text_secondary": "#666666",
      "background_color": "#FFFFFF",
      "background_secondary": "#F5F5F5"
    },
    "fonts": {
      "primary": "Inter, sans-serif",
      "secondary": "Roboto, sans-serif",
      "heading": "Poppins, sans-serif"
    },
    "texts": {
      "welcome_message": "Bienvenido a Grupo Andrade",
      "tagline": "Tu tienda de confianza",
      "footer_text": "© 2025 Grupo Andrade. Todos los derechos reservados.",
      "contact_message": "¿Necesitas ayuda? Contáctanos"
    },
    "social_media": {
      "facebook": "https://facebook.com/grupoandrade",
      "instagram": "https://instagram.com/grupoandrade",
      "whatsapp": "+521234567890"
    }
  }
}
```

### Ejemplo 2: Sucursal que Sobrescribe Solo el Logo

```json
{
  "branding": {
    "logo_url": "https://example.com/sucursal-logo.png"
    // Hereda todos los demás valores del grupo
  }
}
```

## 🚀 Próximos Pasos

1. ✅ Crear estructura de base de datos
2. ✅ Crear backend y frontend para gestión
3. ⏳ Implementar en storefront (web-local)
4. ⏳ Agregar subida de imágenes (upload)
5. ⏳ Agregar selector de colores visual (color picker)
6. ⏳ Agregar preview en tiempo real

## 🔗 Referencias

- [Migración de Branding](../../database/agora/migration_business_branding.sql)
- [DTOs de Branding](../../apps/backend/src/modules/businesses/dto/branding.dto.ts)
- [Componente BrandingManager](../../apps/web-admin/src/components/branding/BrandingManager.tsx)

