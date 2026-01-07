# Módulo de Gestión de Sliders del Landing Page

## 📋 Descripción General

El módulo de gestión de sliders permite a los administradores de grupos empresariales y sucursales crear y gestionar sliders promocionales que se mostrarán en el landing page del store-front. Los sliders son elementos visuales importantes que pueden redirigir a categorías, promociones, sucursales o URLs externas.

## 🎯 Características Principales

### Contexto Dual
- **Nivel de Grupo**: Los sliders pueden gestionarse a nivel de grupo empresarial (se muestran en `/grupo/{slug}`)
- **Nivel de Sucursal**: Los sliders pueden gestionarse a nivel de sucursal individual (se muestran en `/sucursal/{slug}`)

### Funcionalidades
- ✅ Crear, editar, eliminar y activar/desactivar sliders
- ✅ Configuración de contenido visual (imágenes, colores, textos)
- ✅ Redirecciones a categorías, promociones, sucursales o URLs externas
- ✅ Orden de visualización personalizable
- ✅ Fechas de validez (opcional)
- ✅ Gestión de estado (activo/inactivo)

## 🗄️ Estructura de Base de Datos

### Tabla: `commerce.landing_sliders`

```sql
CREATE TABLE commerce.landing_sliders (
    id UUID PRIMARY KEY,
    business_group_id UUID REFERENCES core.business_groups(id),
    business_id UUID REFERENCES core.businesses(id),
    content JSONB NOT NULL, -- Contenido del slider (compatible con SlideContent)
    redirect_type VARCHAR(50), -- 'category', 'promotion', 'branch', 'url', 'none'
    redirect_target_id UUID, -- ID del objetivo de redirección
    redirect_url TEXT, -- URL externa (si redirect_type = 'url')
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);
```

**Constraints:**
- Solo uno de `business_group_id` o `business_id` debe estar presente
- El contenido se almacena en formato JSONB compatible con el componente `PromotionalSlider`

### Migración

El script de migración se encuentra en:
```
database/agora/migration_landing_sliders.sql
```

**Para ejecutar:**
```sql
\i database/agora/migration_landing_sliders.sql
```

## 🔌 API Backend

### Endpoints

#### Crear Slider
```http
POST /landing-sliders
Authorization: Bearer {token}
Content-Type: application/json

{
  "business_group_id": "uuid", // Opcional, solo si es para grupo
  "business_id": "uuid", // Opcional, solo si es para sucursal
  "content": {
    "imageUrl": "https://...",
    "overlay": {
      "title": "Título",
      "subtitle": "Subtítulo",
      "position": "left|center|right"
    }
  },
  "redirect_type": "category|promotion|branch|url|none",
  "redirect_target_id": "uuid", // Si redirect_type requiere ID
  "redirect_url": "https://...", // Si redirect_type = 'url'
  "display_order": 0,
  "is_active": true,
  "start_date": "2024-01-01T00:00:00Z", // Opcional
  "end_date": "2024-12-31T23:59:59Z" // Opcional
}
```

#### Listar Sliders
```http
GET /landing-sliders?business_group_id={uuid}&business_id={uuid}&only_active=true&page=1&limit=20
Authorization: Bearer {token}
```

#### Obtener Slider por ID
```http
GET /landing-sliders/{id}
Authorization: Bearer {token}
```

#### Actualizar Slider
```http
PUT /landing-sliders/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": { ... },
  "is_active": false,
  // ... otros campos opcionales
}
```

#### Eliminar Slider
```http
DELETE /landing-sliders/{id}
Authorization: Bearer {token}
```

#### Obtener Sliders Activos (Público)
```http
GET /landing-sliders/public?business_group_id={uuid}&business_id={uuid}
```

### Permisos

- Solo el **owner** del grupo empresarial o usuarios con rol **admin/superadmin** pueden gestionar sliders
- Los sliders se validan según el contexto (grupo o sucursal)

## 🎨 Frontend (web-local)

### Ubicación
```
apps/web-local/src/pages/sliders/index.tsx
```

### Servicio
```
apps/web-local/src/lib/landing-sliders.ts
```

### Acceso
- Ruta: `/sliders`
- Requiere permiso: `canManageSettings`
- Disponible para roles: `admin`, `superadmin`

### Funcionalidades de la UI

1. **Selector de Contexto**
   - Si el usuario tiene un grupo empresarial, puede elegir gestionar sliders para:
     - El grupo completo (se muestran en `/grupo/{slug}`)
     - Cada sucursal individual (se muestran en `/sucursal/{slug}`)
   - Si el usuario solo tiene sucursales, gestiona sliders para su sucursal

2. **Lista de Sliders**
   - Vista en grid con preview visual
   - Muestra orden, estado (activo/inactivo), y tipo de redirección
   - Acciones: Editar, Activar/Desactivar, Eliminar

3. **Formulario de Creación/Edición**
   - Campos principales:
     - Título, Subtítulo, Descripción
     - URL de imagen de fondo
     - Color de fondo (si no hay imagen)
     - Posición del contenido (izquierda, centro, derecha)
     - Texto del botón CTA
     - Tipo de redirección
     - URL de redirección (si aplica)
     - Orden de visualización
     - Estado activo/inactivo

## 🔗 Integración con Store-Front

### Uso en Store-Front

Los sliders se obtienen desde el store-front usando el endpoint público:

```typescript
// En store-front
const sliders = await landingSlidersService.getActiveSliders(
  groupId, // Si está en contexto de grupo
  branchId // Si está en contexto de sucursal
);
```

### Componente PromotionalSlider

El componente `PromotionalSlider` en store-front ya está preparado para recibir el contenido de los sliders:

```tsx
<PromotionalSlider
  slides={sliders.map(slider => ({
    id: slider.id,
    ...slider.content,
    // El contenido ya viene en el formato correcto
  }))}
  autoPlay={true}
  autoPlayInterval={5000}
/>
```

### Ejemplo de Uso en Landing

```tsx
// En apps/store-front/src/pages/[origen]/[slug]/index.tsx
import { landingSlidersService } from '@/lib/landing-sliders';
import { useStoreContext } from '@/contexts/StoreContext';

export default function StoreHomePage() {
  const { contextType, groupId, branchId } = useStoreContext();
  const [sliders, setSliders] = useState([]);

  useEffect(() => {
    const loadSliders = async () => {
      const activeSliders = await landingSlidersService.getActiveSliders(
        contextType === 'grupo' ? groupId : undefined,
        contextType === 'sucursal' ? branchId : undefined
      );
      setSliders(activeSliders);
    };
    loadSliders();
  }, [contextType, groupId, branchId]);

  return (
    <div>
      {sliders.length > 0 && (
        <PromotionalSlider slides={sliders.map(s => s.content)} />
      )}
      {/* Resto del contenido */}
    </div>
  );
}
```

## 📝 Estructura del Contenido (JSONB)

El campo `content` debe seguir la estructura compatible con `SlideContent`:

```typescript
interface SlideContent {
  imageUrl?: string;
  imageAlt?: string;
  backgroundColor?: string;
  gradientColors?: string[];
  overlay?: {
    position?: 'left' | 'center' | 'right';
    title?: string;
    titleHighlight?: string;
    subtitle?: string;
    description?: string;
    badge?: string;
    badgeColor?: string;
    badgePosition?: 'top-left' | 'top-right' | 'top-center';
    ctaText?: string;
    ctaLink?: string;
    ctaColor?: string;
    secondaryText?: string;
    discountCode?: string;
    validUntil?: string;
    termsText?: string;
  };
  productImages?: Array<{
    url: string;
    alt?: string;
    position?: { top?: string; left?: string; right?: string; bottom?: string };
    size?: string;
    rotation?: number;
    zIndex?: number;
  }>;
  decorativeElements?: boolean;
}
```

## 🔄 Flujo de Funcionamiento

### 1. Gestión en web-local

```
Usuario → web-local → /sliders
  ↓
Selecciona contexto (Grupo o Sucursal)
  ↓
Crea/Edita sliders
  ↓
Sliders guardados en commerce.landing_sliders
```

### 2. Visualización en store-front

```
Cliente → store-front → /grupo/{slug} o /sucursal/{slug}
  ↓
Store-front consulta GET /landing-sliders/public
  ↓
Obtiene sliders activos para el contexto
  ↓
Muestra sliders en PromotionalSlider
```

### 3. Redirecciones

Cuando un usuario hace clic en un slider:

- **Tipo `category`**: Redirige a `/products?category={redirect_target_id}`
- **Tipo `promotion`**: Redirige a la página de la promoción
- **Tipo `branch`**: Redirige a `/sucursal/{slug}` de la sucursal
- **Tipo `url`**: Redirige a `redirect_url`
- **Tipo `none`**: No redirige (solo visual)

## 🎯 Casos de Uso

### Caso 1: Grupo con Múltiples Sucursales

**Escenario**: Grupo "Premier Automotriz" con 5 sucursales

1. El administrador del grupo puede crear sliders que se muestren en `/grupo/grupo-premier-automotriz`
2. También puede crear sliders específicos para cada sucursal que se muestren en `/sucursal/{slug-sucursal}`
3. Los sliders del grupo se muestran cuando el usuario navega al grupo
4. Los sliders de la sucursal se muestran cuando el usuario navega a la sucursal específica

### Caso 2: Sucursal Independiente

**Escenario**: Sucursal sin grupo empresarial

1. El administrador de la sucursal gestiona sliders solo para su sucursal
2. Los sliders se muestran en `/sucursal/{slug-sucursal}`

### Caso 3: Promoción Especial

**Escenario**: Promoción de "20% OFF en Refacciones"

1. Crear slider con:
   - Imagen promocional
   - Título: "20% OFF"
   - Subtítulo: "En todas las refacciones"
   - `redirect_type`: `promotion`
   - `redirect_target_id`: ID de la promoción
2. El slider redirige a la página de la promoción cuando se hace clic

## ⚠️ Consideraciones Importantes

1. **Permisos**: Solo usuarios con rol `admin` o `superadmin` pueden gestionar sliders
2. **Contexto**: Un slider solo puede pertenecer a un grupo O una sucursal, no ambos
3. **Orden**: Los sliders se ordenan por `display_order` (menor = primero)
4. **Validez**: Los sliders con fechas solo se muestran si están dentro del rango `start_date` - `end_date`
5. **Estado**: Solo los sliders con `is_active = TRUE` se muestran en el store-front
6. **Imágenes**: Las URLs de imágenes deben ser accesibles públicamente

## 🚀 Próximos Pasos (Mejoras Futuras)

- [ ] Editor visual de sliders (drag & drop)
- [ ] Plantillas predefinidas de sliders
- [ ] Preview en tiempo real del slider
- [ ] Estadísticas de clics en sliders
- [ ] Programación automática de sliders
- [ ] Soporte para videos en sliders
- [ ] A/B testing de sliders

## 📚 Referencias

- Componente PromotionalSlider: `apps/store-front/src/components/PromotionalSlider.tsx`
- Servicio backend: `apps/backend/src/modules/commerce/landing-sliders/`
- Servicio frontend: `apps/web-local/src/lib/landing-sliders.ts`
- Migración SQL: `database/agora/migration_landing_sliders.sql`

