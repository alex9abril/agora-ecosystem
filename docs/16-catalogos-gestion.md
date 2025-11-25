# 📋 Catálogos Disponibles para Gestión

Este documento lista todos los catálogos disponibles en la base de datos que deben ser gestionados desde el panel de administración.

## 📊 Resumen de Catálogos

| # | Catálogo | Schema | Tabla | Tipo | Gestión Requerida |
|---|----------|--------|-------|------|-------------------|
| 1 | Categorías de Productos | `catalog` | `product_categories` | Global y por Negocio | ✅ Alta Prioridad |
| 2 | Productos | `catalog` | `products` | Por Negocio | ✅ Alta Prioridad |
| 3 | Colecciones | `catalog` | `collections` | Por Negocio | ✅ Alta Prioridad |
| 4 | Promociones | `commerce` | `promotions` | Global y por Negocio | ⚠️ Media Prioridad |
| 5 | Suscripciones | `commerce` | `subscriptions` | Planes Premium | ⚠️ Media Prioridad |
| 6 | Publicidad | `commerce` | `ads` | Anuncios Internos | ⚠️ Baja Prioridad |
| 7 | Roles (Opcional) | `core` | `roles_catalog` | Documentación | ⚠️ Opcional |

---

## 1. 📦 Categorías de Productos (`catalog.product_categories`)

### Descripción
Categorías normalizadas para organizar productos. Pueden ser **globales** (para todos los negocios) o **específicas de un negocio**. Soporta jerarquía padre/hijo.

### Estructura
- **ID**: UUID
- **business_id**: UUID (NULL = categoría global)
- **name**: Nombre de la categoría
- **description**: Descripción
- **icon_url**: URL del icono
- **parent_category_id**: Categoría padre (para subcategorías)
- **display_order**: Orden de visualización
- **is_active**: Estado activo/inactivo

### Funcionalidades de Gestión Requeridas
- ✅ Listar categorías (globales y por negocio)
- ✅ Crear categoría (global o por negocio)
- ✅ Editar categoría
- ✅ Eliminar/Desactivar categoría
- ✅ Reordenar categorías (cambiar `display_order`)
- ✅ Gestionar jerarquía (asignar categoría padre)
- ✅ Filtrar por negocio
- ✅ Buscar categorías

### Ejemplo de Datos (seed_catalog.sql)
```sql
-- Categorías globales
- Entradas
- Platos Principales
- Bebidas (con subcategorías: Bebidas Frías, Bebidas Calientes)
- Postres
- Especialidades
```

---

## 2. 🍔 Productos (`catalog.products`)

### Descripción
Productos del menú de cada local/negocio. Cada producto pertenece a un negocio y a una categoría.

### Estructura
- **ID**: UUID
- **business_id**: UUID (obligatorio)
- **name**: Nombre del producto
- **description**: Descripción
- **image_url**: URL de la imagen
- **price**: Precio (DECIMAL)
- **category_id**: Categoría del producto
- **is_available**: Disponible/No disponible
- **is_featured**: Destacado
- **variants**: JSONB (variantes: tamaños, toppings, etc.)
- **nutritional_info**: JSONB (información nutricional)
- **allergens**: TEXT[] (alérgenos)
- **display_order**: Orden de visualización

### Funcionalidades de Gestión Requeridas
- ✅ Listar productos (por negocio, categoría, estado)
- ✅ Crear producto
- ✅ Editar producto (precio, descripción, disponibilidad)
- ✅ Eliminar/Desactivar producto
- ✅ Gestionar variantes (tamaños, opciones)
- ✅ Gestionar información nutricional y alérgenos
- ✅ Marcar como destacado
- ✅ Reordenar productos
- ✅ Subir/actualizar imagen
- ✅ Buscar productos
- ✅ Filtrar por negocio, categoría, disponibilidad

### Relaciones
- Pertenece a un **negocio** (`business_id`)
- Pertenece a una **categoría** (`category_id`)
- Puede estar en múltiples **colecciones** (`collection_products`)

---

## 3. 📦 Colecciones (`catalog.collections`)

### Descripción
Agrupaciones de productos: combos, menús del día, paquetes promocionales. Permiten ofrecer productos agrupados con precio especial.

### Estructura
- **ID**: UUID
- **business_id**: UUID (obligatorio)
- **name**: Nombre de la colección
- **description**: Descripción
- **type**: ENUM (`combo`, `menu_del_dia`, `paquete`, `promocion_bundle`)
- **price**: Precio de la colección
- **original_price**: Precio original (para mostrar descuento)
- **image_url**: URL de la imagen
- **is_available**: Disponible/No disponible
- **is_featured**: Destacado
- **valid_from**: Fecha de inicio de validez
- **valid_until**: Fecha de fin de validez
- **display_order**: Orden de visualización

### Funcionalidades de Gestión Requeridas
- ✅ Listar colecciones (por negocio, tipo, estado)
- ✅ Crear colección
- ✅ Editar colección
- ✅ Eliminar/Desactivar colección
- ✅ Gestionar productos en la colección (agregar/remover)
- ✅ Definir cantidades de cada producto en la colección
- ✅ Gestionar precios (precio final y precio original)
- ✅ Gestionar fechas de validez
- ✅ Marcar como destacado
- ✅ Reordenar colecciones
- ✅ Subir/actualizar imagen
- ✅ Buscar colecciones
- ✅ Filtrar por negocio, tipo, disponibilidad, fechas

### Relaciones
- Pertenece a un **negocio** (`business_id`)
- Contiene múltiples **productos** (`collection_products`)

---

## 4. 🎁 Promociones (`commerce.promotions`)

### Descripción
Ofertas, descuentos y códigos promocionales que pueden ser aplicados a pedidos. Pueden ser globales o específicas de un negocio.

### Estructura
- **ID**: UUID
- **business_id**: UUID (NULL = promoción global)
- **name**: Nombre de la promoción
- **description**: Descripción
- **type**: ENUM (`percentage`, `fixed_amount`, `free_delivery`, `buy_x_get_y`)
- **discount_value**: Valor del descuento
- **code**: Código promocional (único)
- **min_order_amount**: Monto mínimo de pedido
- **max_uses**: Usos máximos (NULL = ilimitado)
- **max_uses_per_user**: Usos máximos por usuario
- **valid_from**: Fecha de inicio
- **valid_until**: Fecha de fin
- **is_active**: Estado activo/inactivo

### Funcionalidades de Gestión Requeridas
- ✅ Listar promociones (globales y por negocio)
- ✅ Crear promoción
- ✅ Editar promoción
- ✅ Eliminar/Desactivar promoción
- ✅ Gestionar códigos promocionales
- ✅ Ver estadísticas de uso (`promotion_uses`)
- ✅ Gestionar fechas de validez
- ✅ Configurar límites de uso
- ✅ Buscar promociones
- ✅ Filtrar por negocio, tipo, estado, fechas

### Relaciones
- Puede pertenecer a un **negocio** (`business_id`) o ser global
- Tiene historial de **usos** (`promotion_uses`)

---

## 5. 💎 Suscripciones (`commerce.subscriptions`)

### Descripción
Planes premium o suscripciones que los usuarios pueden adquirir para obtener beneficios especiales.

### Estructura
- **ID**: UUID
- **user_id**: UUID (cliente suscrito)
- **plan_type**: ENUM (`premium`, `business_premium`, `repartidor_premium`)
- **status**: ENUM (`active`, `cancelled`, `expired`, `pending`)
- **start_date**: Fecha de inicio
- **end_date**: Fecha de fin
- **price**: Precio de la suscripción
- **billing_cycle**: ENUM (`monthly`, `yearly`)
- **wallet_subscription_id**: ID en el sistema Wallet

### Funcionalidades de Gestión Requeridas
- ✅ Listar suscripciones (por usuario, plan, estado)
- ✅ Ver detalles de suscripción
- ✅ Activar/Cancelar suscripción
- ✅ Gestionar renovaciones
- ✅ Ver estadísticas de suscripciones
- ✅ Filtrar por usuario, plan, estado, fechas

### Relaciones
- Pertenece a un **usuario** (`user_id`)
- Relacionado con **Wallet** (`wallet_subscription_id`)

---

## 6. 📢 Publicidad (`commerce.ads`)

### Descripción
Anuncios internos que los negocios pueden publicar para promocionarse en la plataforma.

### Estructura
- **ID**: UUID
- **business_id**: UUID (obligatorio)
- **title**: Título del anuncio
- **description**: Descripción
- **image_url**: URL de la imagen
- **link_url**: URL de destino
- **start_date**: Fecha de inicio
- **end_date**: Fecha de fin
- **is_active**: Estado activo/inactivo
- **display_order**: Orden de visualización
- **clicks_count**: Contador de clics
- **impressions_count**: Contador de impresiones

### Funcionalidades de Gestión Requeridas
- ✅ Listar anuncios (por negocio, estado, fechas)
- ✅ Crear anuncio
- ✅ Editar anuncio
- ✅ Eliminar/Desactivar anuncio
- ✅ Gestionar fechas de publicación
- ✅ Ver estadísticas (clics, impresiones)
- ✅ Reordenar anuncios
- ✅ Subir/actualizar imagen
- ✅ Filtrar por negocio, estado, fechas

### Relaciones
- Pertenece a un **negocio** (`business_id`)

---

## 7. 👥 Roles (Opcional) (`core.roles_catalog`)

### Descripción
⚠️ **OPCIONAL** - Catálogo de roles para documentación y permisos. No es necesario para el funcionamiento del sistema (los roles están definidos como ENUM).

### Estructura
- **role_code**: VARCHAR (código del rol)
- **role_name**: Nombre del rol
- **description**: Descripción
- **permissions**: JSONB (permisos del rol)
- **display_order**: Orden de visualización
- **is_active**: Estado activo/inactivo

### Funcionalidades de Gestión Requeridas
- ⚠️ Solo si se implementa el catálogo de roles
- ✅ Listar roles
- ✅ Editar descripción y permisos
- ✅ Ver estadísticas de usuarios por rol

### Nota
Los roles reales están definidos como ENUM en `schema.sql`:
- `client`
- `repartidor`
- `local`
- `admin`

---

## 🎯 Prioridades de Implementación

### Alta Prioridad (MVP)
1. **Categorías de Productos** - Esencial para organizar productos
2. **Productos** - Core del negocio
3. **Colecciones** - Importante para combos y ofertas

### Media Prioridad (Post-MVP)
4. **Promociones** - Importante para marketing y retención
5. **Suscripciones** - Modelo de monetización adicional

### Baja Prioridad (Futuro)
6. **Publicidad** - Sistema de anuncios internos
7. **Roles** - Solo si se necesita documentación avanzada

---

## 📝 Notas de Implementación

### Relaciones Importantes
- **Productos** → **Categorías**: Un producto pertenece a una categoría
- **Productos** → **Colecciones**: Un producto puede estar en múltiples colecciones
- **Colecciones** → **Productos**: Una colección contiene múltiples productos (con cantidades)
- **Todo** → **Negocios**: La mayoría de catálogos están vinculados a negocios

### Consideraciones
- Las **categorías globales** (`business_id = NULL`) son compartidas por todos los negocios
- Las **categorías por negocio** permiten personalización
- Los **productos** siempre pertenecen a un negocio específico
- Las **colecciones** pueden tener fechas de validez (menús del día, ofertas temporales)
- Las **promociones** pueden ser globales o por negocio

---

## 🔗 Referencias

- **Schema SQL**: `database/schema.sql`
- **Seed Catalog**: `database/seed_catalog.sql`
- **Seed Delivery Cycle**: `database/seed_delivery_cycle.sql` (incluye ejemplos de productos y colecciones)

