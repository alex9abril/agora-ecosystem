# Checklist de Alta - Grupo Empresarial y Sucursales de Refacciones

Este documento contiene el checklist completo de todos los requisitos, información e insumos necesarios para dar de alta un grupo empresarial y sus sucursales activas para ponerlas en operación como tiendas de refacciones en la plataforma AGORA.

## 🎯 Flujo Recomendado

**Para organizaciones con múltiples sucursales:**
1. **Primero**: Crear el Grupo Empresarial (Parte I)
2. **Después**: Crear las Sucursales y asociarlas al grupo (Parte II)

**Para sucursales independientes:**
- Puedes crear sucursales directamente sin crear un grupo empresarial
- Las sucursales pueden existir sin pertenecer a un grupo

**Nota**: Si planeas tener múltiples sucursales bajo una misma organización, es recomendable crear primero el grupo empresarial para facilitar la gestión centralizada.

---

## 📋 Índice

### Parte I: Grupo Empresarial
1. [Información Básica del Grupo Empresarial](#1-información-básica-del-grupo-empresarial)
2. [Identificación y Branding del Grupo](#2-identificación-y-branding-del-grupo)
3. [Información Fiscal del Grupo](#3-información-fiscal-del-grupo)
4. [Configuración del Grupo Empresarial](#4-configuración-del-grupo-empresarial)

### Parte II: Sucursales
5. [Información Básica de la Sucursal](#5-información-básica-de-la-sucursal)
6. [Información de Contacto y Ubicación](#6-información-de-contacto-y-ubicación)
7. [Configuración de Marcas de Vehículos](#7-configuración-de-marcas-de-vehículos)
8. [Catálogo de Productos](#8-catálogo-de-productos)
9. [Configuración Operativa](#9-configuración-operativa)
10. [Usuarios y Roles](#10-usuarios-y-roles)
11. [Configuración de Wallet](#11-configuración-de-wallet)
12. [Documentos e Imágenes](#12-documentos-e-imágenes)
13. [Configuración de Comisiones y Pagos](#13-configuración-de-comisiones-y-pagos)
14. [Verificaciones Finales](#14-verificaciones-finales)

---

# Parte I: Grupo Empresarial

## 1. Información Básica del Grupo Empresarial

### ✅ Datos Requeridos

- [ ] **Nombre comercial del grupo** (máximo 255 caracteres)
  - Ejemplo: "Grupo Andrade", "AutoParts México", "Refaccionaria Nacional"
  - ⚠️ **Requerido**: Este campo es obligatorio
  - ⚠️ **Nota**: Este es el nombre que aparecerá públicamente para identificar al grupo empresarial

- [ ] **Razón social** (opcional, máximo 255 caracteres)
  - Ejemplo: "Grupo Andrade S.A. de C.V.", "AutoParts México S. de R.L. de C.V."
  - ⚠️ **Opcional**: Recomendado para facturación y documentos legales
  - ⚠️ **Nota**: Si el grupo tiene razón social diferente al nombre comercial, es importante registrarla

- [ ] **Descripción del grupo empresarial** (opcional)
  - Breve descripción del grupo, su misión, especialidades o alcance
  - Ejemplo: "Grupo empresarial dedicado a la venta de refacciones automotrices con presencia en múltiples ciudades"
  - ⚠️ **Opcional**: Ayuda a identificar el propósito y alcance del grupo

### ✅ Usuario Propietario del Grupo

- [ ] **Cuenta de usuario propietario creada**
  - El propietario debe tener una cuenta en `auth.users` (Supabase Auth)
  - Perfil creado en `core.user_profiles` con rol `local` o `admin`
  - ⚠️ **Requerido**: El `owner_id` debe ser un UUID válido de `auth.users`
  - ⚠️ **Nota**: El propietario del grupo será el administrador principal y podrá gestionar todas las sucursales del grupo

---

## 2. Identificación y Branding del Grupo

### ✅ Slug (Identificador Único)

- [ ] **Slug del grupo** (opcional, se genera automáticamente si no se proporciona)
  - Identificador único y amigable para URLs
  - Ejemplo: `grupo-andrade`, `autoparts-mexico`
  - ⚠️ **Opcional**: Si no se proporciona, se genera automáticamente a partir del nombre
  - ⚠️ **Importante**: El slug debe ser único en todo el sistema
  - ⚠️ **Formato**: Solo letras minúsculas, números y guiones. Sin espacios ni caracteres especiales

### ✅ Logo del Grupo

- [ ] **Logo del grupo empresarial** (`logo_url`)
  - URL de la imagen del logo
  - Se sube al storage de Supabase (bucket: `business-logos` o similar)
  - Formato recomendado: PNG con fondo transparente o JPG
  - Tamaño recomendado: 512x512px o mayor (cuadrado)
  - ⚠️ **Opcional**: Recomendado para branding consistente en todas las sucursales
  - ⚠️ **Nota**: El logo del grupo puede heredarse a las sucursales si se configura así

### ✅ Sitio Web

- [ ] **Sitio web del grupo** (opcional)
  - URL del sitio web corporativo del grupo si existe
  - Ejemplo: `https://www.grupoandrade.com`
  - ⚠️ **Opcional**: Útil para proporcionar información corporativa adicional

---

## 3. Información Fiscal del Grupo

### ✅ Identificador Fiscal

- [ ] **RFC / Tax ID** (opcional, máximo 50 caracteres)
  - Identificador fiscal del grupo empresarial
  - En México: RFC (Registro Federal de Contribuyentes)
  - En otros países: NIT, CUIT, o equivalente según el país
  - Ejemplo: `GAN850101ABC` (RFC mexicano)
  - ⚠️ **Opcional**: Recomendado para facturación y reportes fiscales
  - ⚠️ **Nota**: Este identificador es a nivel de grupo, no de sucursal individual

---

## 4. Configuración del Grupo Empresarial

### ✅ Configuraciones Adicionales

- [ ] **Settings** (opcional, formato JSONB)
  - Configuraciones adicionales del grupo en formato JSON
  - Puede incluir:
    - Branding (colores, fuentes, estilos)
    - Configuraciones de funcionalidades
    - Preferencias operativas
  - Ejemplo:
    ```json
    {
      "branding": {
        "primary_color": "#FF5733",
        "secondary_color": "#33C3F0",
        "font_family": "Arial"
      },
      "features": {
        "multi_branch": true,
        "centralized_inventory": false
      }
    }
    ```
  - ⚠️ **Opcional**: Permite personalización avanzada del grupo

### ✅ Estado del Grupo

- [ ] **Grupo activo** (`is_active`)
  - Por defecto: `true`
  - Si es `false`, el grupo y todas sus sucursales no aparecerán en búsquedas
  - ⚠️ **Importante**: Un grupo inactivo afecta a todas sus sucursales

### 📝 Notas sobre Grupos Empresariales

- **Relación con Sucursales**: Las sucursales se asocian al grupo mediante el campo `business_group_id`
- **Herencia de Configuraciones**: Las sucursales pueden heredar configuraciones del grupo (branding, colores, etc.)
- **Gestión Centralizada**: El propietario del grupo puede gestionar todas las sucursales desde un panel centralizado
- **Múltiples Grupos**: Un usuario puede ser propietario de múltiples grupos empresariales
- **Sucursales sin Grupo**: Las sucursales pueden existir sin pertenecer a un grupo (campo `business_group_id` en NULL)

---

# Parte II: Sucursales

## 5. Información Básica de la Sucursal

### ✅ Datos Requeridos

- [ ] **Nombre de la sucursal** (máximo 255 caracteres)
  - Ejemplo: "Refaccionaria La Roma", "Auto Parts CDMX", "Grupo Andrade - Sucursal Centro"
  - ⚠️ **Requerido**: Este campo es obligatorio
  - ⚠️ **Nota**: Si la sucursal pertenece a un grupo, puede incluir el nombre del grupo para identificación

- [ ] **Razón social** (opcional, máximo 255 caracteres)
  - Ejemplo: "Refaccionaria La Roma S.A. de C.V."
  - ⚠️ **Opcional**: Recomendado para facturación

- [ ] **Descripción del negocio** (opcional)
  - Breve descripción de los servicios y especialidades
  - Ejemplo: "Especialistas en refacciones para vehículos japoneses y americanos"

- [ ] **Categoría del negocio** (requerido)
  - Valores válidos según catálogo de categorías de negocios
  - Ejemplos: "Refaccionaria General", "Refaccionaria Especializada", "Taller con Refacciones", "Tienda de Accesorios"
  - ⚠️ **Requerido**: Debe existir en el catálogo de categorías

- [ ] **Tags del negocio** (opcional, array de strings)
  - Etiquetas para mejorar la búsqueda
  - Ejemplos: `['multimarca', 'instalacion', 'garantia']`

- [ ] **Asociación al Grupo Empresarial** (opcional)
  - Si la sucursal pertenece a un grupo empresarial, se asigna mediante `business_group_id`
  - ⚠️ **Opcional**: Las sucursales pueden existir sin grupo
  - ⚠️ **Nota**: Si se asigna a un grupo, la sucursal puede heredar configuraciones del grupo

---

## 6. Información de Contacto y Ubicación

### ✅ Datos de Contacto

- [ ] **Teléfono de contacto** (opcional, máximo 20 caracteres)
  - Formato recomendado: `+525555555555`
  - ⚠️ **Recomendado**: Necesario para comunicación con clientes

- [ ] **Email de contacto** (opcional)
  - Email válido para comunicación
  - Si no se proporciona, se usa el email del usuario propietario
  - ⚠️ **Recomendado**: Necesario para notificaciones y comunicación

- [ ] **Sitio web** (opcional)
  - URL del sitio web del negocio si existe
  - Ejemplo: `https://www.refaccionarialaroma.com`

### ✅ Ubicación Física

- [ ] **Coordenadas geográficas** (requerido)
  - **Longitud** (longitude): Entre -180 y 180
  - **Latitud** (latitude): Entre -90 y 90
  - ⚠️ **Requerido**: Debe estar dentro de una zona de cobertura activa
  - ⚠️ **Validación**: El sistema valida automáticamente que la ubicación esté dentro de la zona de servicio

- [ ] **Dirección completa** (recomendado)
  - **Calle y número** (address_line1): Ejemplo: "Avenida Álvaro Obregón 45"
  - **Colonia/Barrio** (address_line2): Ejemplo: "Roma Norte"
  - **Ciudad** (city): Ejemplo: "Ciudad de México"
  - **Estado/Provincia** (state): Ejemplo: "CDMX"
  - **Código postal** (postal_code): Ejemplo: "06700"
  - **País** (country): Por defecto "México"

### ⚠️ Validaciones de Ubicación

- [ ] La ubicación debe estar dentro de una **zona de cobertura activa**
- [ ] El sistema valida automáticamente usando:
  - Polígono de cobertura (validación principal)
  - Radio máximo desde el centro (validación secundaria)
- [ ] Si la ubicación está fuera de zona, el negocio no podrá recibir pedidos

---

## 7. Configuración de Marcas de Vehículos

### ✅ Marcas Comercializadas

- [ ] **Selección de marcas** (opcional pero recomendado)
  - La sucursal debe seleccionar qué marcas de vehículos comercializará
  - Ejemplos: Toyota, Honda, Nissan, Ford, Chevrolet, etc.
  - ⚠️ **Importante**: Solo se pueden crear productos para las marcas asignadas a la sucursal

- [ ] **Marcas disponibles en el sistema**:
  - Las marcas deben existir previamente en `catalog.vehicle_brands`
  - Se pueden asignar múltiples marcas a una sucursal
  - Una sucursal puede ser:
    - **Multimarca**: Comercializa múltiples marcas (ej: Toyota, Honda, Nissan)
    - **Especializada**: Comercializa una sola marca (ej: solo Toyota)
    - **Sin marcas**: Puede no tener marcas asignadas inicialmente

### 📝 Notas sobre Marcas

- Las marcas se asignan después de crear la sucursal
- Se pueden agregar o quitar marcas posteriormente
- Los productos solo pueden asociarse a marcas que la sucursal comercializa

---

## 8. Catálogo de Productos

### ✅ Tipos de Producto Disponibles

La plataforma soporta 5 tipos de productos:

1. **Refacción** (`refaccion`)
   - Piezas de repuesto y componentes
   - Requiere: marca, modelo, año de compatibilidad

2. **Accesorio** (`accesorio`)
   - Productos de personalización y mejora
   - Puede ser universal o específico por vehículo

3. **Servicio de Instalación** (`servicio_instalacion`)
   - Servicios profesionales de instalación
   - Requiere: tiempo estimado, nivel de dificultad

4. **Servicio de Mantenimiento** (`servicio_mantenimiento`)
   - Servicios de mantenimiento y reparación
   - Requiere: tipo de servicio, tiempo estimado

5. **Fluidos y Lubricantes** (`fluido`)
   - Aceites, líquidos y fluidos
   - Requiere: tipo, viscosidad, especificaciones

### ✅ Información Requerida por Producto

#### Campos Obligatorios

- [ ] **Nombre del producto** (máximo 255 caracteres)
  - Ejemplo: "Filtro de Aire Original Toyota"

- [ ] **Precio** (decimal, mínimo 0)
  - Formato: `150.00`
  - ⚠️ **Requerido**: Precio base del producto

- [ ] **Tipo de producto** (enum)
  - Valores válidos: `refaccion`, `accesorio`, `servicio_instalacion`, `servicio_mantenimiento`, `fluido`
  - ⚠️ **Requerido**

- [ ] **Categoría** (UUID de categoría)
  - Debe existir en `catalog.product_categories`
  - ⚠️ **Requerido**: El producto debe estar en una categoría válida

#### Campos Opcionales pero Recomendados

- [ ] **SKU** (máximo 100 caracteres)
  - Código único del producto
  - Ejemplo: "FIL-AIR-TOY-001"

- [ ] **Descripción**
  - Descripción detallada del producto
  - Incluir especificaciones técnicas si aplica

- [ ] **Imagen del producto**
  - URL de la imagen (se sube al storage de Supabase)
  - Formato recomendado: JPG o PNG
  - Tamaño recomendado: mínimo 800x600px

- [ ] **Disponibilidad** (`is_available`)
  - `true` si está disponible
  - `false` si está temporalmente fuera de stock
  - Por defecto: `true`

- [ ] **Destacado** (`is_featured`)
  - `true` para mostrar en sección destacada
  - Por defecto: `false`

### ✅ Información Específica por Tipo

#### Para Refacciones y Accesorios

- [ ] **Compatibilidad de vehículos** (en campo `variants`)
  - Marca del vehículo
  - Modelo del vehículo
  - Año o rango de años
  - Ejemplo: `{"brand": "Toyota", "model": "Corolla", "year": "2020-2023"}`

- [ ] **Especificaciones técnicas** (en campo `nutritional_info`)
  - Número de parte OEM
  - Número de parte alternativo
  - Garantía (meses)
  - Ejemplo: `{"oem_part_number": "17801-0E010", "warranty_months": 12}`

#### Para Servicios

- [ ] **Tiempo estimado**
  - Ejemplo: "2-6 horas"

- [ ] **Nivel de dificultad**
  - Ejemplo: "Media-Alta"

- [ ] **Garantía del servicio**
  - Ejemplo: "3 meses"

#### Para Productos Físicos (Refacciones, Accesorios, Fluidos)

- [ ] **Datos de envío** (opcional pero recomendado)
  - **Peso** (`weight_kg`): En kilogramos (ej: 0.5, 1.2, 2.5)
  - **Largo** (`length_cm`): En centímetros (ej: 25, 30, 50)
  - **Ancho** (`width_cm`): En centímetros (ej: 20, 15, 30)
  - **Alto** (`height_cm`): En centímetros (ej: 5, 10, 20)
  - ⚠️ **Importante**: Estos datos son necesarios para calcular el costo de envío con paqueterías

### ✅ Carga Masiva de Productos

- [ ] **Template CSV disponible**
  - Archivo: `template_carga_masiva_productos.csv`
  - Incluye ejemplos y formato correcto

- [ ] **Catálogo de categorías**
  - Archivo: `catalogo_categorias.csv`
  - Contiene todas las categorías disponibles con sus slugs
  - Usar el `slug` de la categoría en el CSV de productos

- [ ] **Instrucciones de carga masiva**
  - Ver archivo: `INSTRUCCIONES_CARGA_MASIVA.txt`

---

## 9. Configuración Operativa

### ✅ Horarios de Operación

- [ ] **Horarios de apertura** (opcional, formato JSONB)
  - Estructura: `{"monday": {"open": "09:00", "close": "22:00"}, ...}`
  - Días de la semana: `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`
  - Formato de hora: `HH:MM` (24 horas)
  - Ejemplo completo:
    ```json
    {
      "monday": {"open": "09:00", "close": "22:00"},
      "tuesday": {"open": "09:00", "close": "22:00"},
      "wednesday": {"open": "09:00", "close": "22:00"},
      "thursday": {"open": "09:00", "close": "22:00"},
      "friday": {"open": "09:00", "close": "22:00"},
      "saturday": {"open": "09:00", "close": "20:00"},
      "sunday": {"open": "10:00", "close": "18:00"}
    }
    ```
  - ⚠️ **Recomendado**: Sin horarios, el negocio aparecerá como siempre disponible

### ✅ Configuración de Pedidos

- [ ] **Acepta pedidos** (`accepts_orders`)
  - Por defecto: `true`
  - Si es `false`, el negocio no recibirá pedidos

- [ ] **Acepta recolección** (`accepts_pickup`)
  - `true` si los clientes pueden recoger productos en la tienda física
  - Por defecto: `false`
  - ⚠️ **Recomendado**: Habilitar si la sucursal tiene tienda física

### ✅ Estado del Negocio

- [ ] **Activo** (`is_active`)
  - Por defecto: `true`
  - Si es `false`, el negocio no aparecerá en búsquedas

- [ ] **Verificado** (`is_verified`)
  - Por defecto: `false`
  - Debe ser verificado por un administrador antes de activar completamente
  - ⚠️ **Requerido para producción**: Debe estar verificado

### ✅ Zona de Cobertura

- [ ] **Validación automática**
  - El sistema asigna automáticamente la zona de cobertura según la ubicación
  - La ubicación debe estar dentro de una zona activa
  - ⚠️ **Importante**: Si la ubicación está fuera de zona, el negocio no podrá operar

---

## 10. Usuarios y Roles

### ✅ Usuario Propietario

- [ ] **Cuenta de usuario creada**
  - El propietario debe tener una cuenta en `auth.users` (Supabase Auth)
  - Perfil creado en `core.user_profiles` con rol `local`
  - ⚠️ **Requerido**: El `owner_id` debe ser un UUID válido de `auth.users`

### ✅ Usuarios Adicionales (Opcional)

- [ ] **Personal operativo**
  - Se pueden crear usuarios adicionales con roles específicos:
    - `admin`: Administrador de la sucursal (acceso completo)
    - `operations_staff`: Personal de operaciones (gestionar pedidos)
    - `kitchen_staff`: Personal de almacén/inventario (gestionar productos)
  - ⚠️ **Recomendado**: Crear al menos un usuario `operations_staff` para gestionar pedidos

### 📝 Notas sobre Usuarios

- Los usuarios se crean a través del endpoint `/business-users`
- Se pueden asignar a múltiples sucursales
- Cada usuario necesita email y contraseña válidos

---

## 11. Configuración de Wallet

### ✅ Integración con Wallet

- [ ] **Wallet Business ID** (`wallet_business_id`)
  - ID del negocio en el sistema Wallet (proyecto separado)
  - Tipo: `VARCHAR(255)` (puede ser UUID o string)
  - ⚠️ **Opcional**: Solo necesario si se integra con el sistema de wallet
  - ⚠️ **Nota**: El wallet es un proyecto separado, solo se almacena la referencia

### 📝 Notas sobre Wallet

- El wallet permite pagos con LocalCoins
- La integración se realiza después de crear el negocio
- Sin wallet configurado, solo se aceptan pagos tradicionales (tarjeta, efectivo)

---

## 12. Documentos e Imágenes

### ✅ Imágenes del Negocio

- [ ] **Logo del negocio** (`logo_url`)
  - URL de la imagen del logo
  - Se sube al storage de Supabase (bucket: `business-logos`)
  - Formato recomendado: PNG con fondo transparente o JPG
  - Tamaño recomendado: 512x512px o mayor (cuadrado)
  - ⚠️ **Recomendado**: Mejora la presencia del negocio

- [ ] **Imagen de portada** (`cover_image_url`)
  - URL de la imagen de portada/banner
  - Se sube al storage de Supabase (bucket: `business-covers`)
  - Formato recomendado: JPG o PNG
  - Tamaño recomendado: 1920x600px o mayor (formato banner)
  - ⚠️ **Opcional**: Mejora la presentación visual

### ✅ Imágenes de Productos

- [ ] **Imágenes por producto**
  - Cada producto puede tener una imagen
  - Se suben al storage de Supabase (bucket: `products`)
  - Formato recomendado: JPG o PNG
  - Tamaño recomendado: mínimo 800x600px
  - ⚠️ **Recomendado**: Productos con imagen tienen mejor conversión

### 📝 Notas sobre Storage

- Las imágenes se almacenan en Supabase Storage
- Se requiere configuración de políticas de acceso
- Los buckets deben estar configurados previamente:
  - `business-logos`
  - `business-covers`
  - `products`

---

## 13. Configuración de Comisiones y Pagos

### ✅ Comisiones

- [ ] **Tasa de comisión** (`commission_rate`)
  - Por defecto: `15.00` (15%)
  - Tipo: `DECIMAL(5,2)`
  - ⚠️ **Configurable**: Se puede ajustar según el tipo de negocio

- [ ] **Piloto social** (`is_pilot_social`)
  - Por defecto: `false`
  - Si es `true`, la comisión se reduce a 5-8%
  - ⚠️ **Especial**: Solo para negocios del programa piloto social

### ✅ Métodos de Pago

- [ ] **Métodos aceptados**
  - Tarjeta de crédito/débito
  - Efectivo (si aplica)
  - LocalCoins (si wallet está configurado)
  - ⚠️ **Nota**: La configuración de métodos de pago se realiza en el sistema de pagos

---

## 14. Verificaciones Finales

### ✅ Checklist de Activación - Grupo Empresarial

Antes de crear sucursales, verificar que el grupo esté configurado:

- [ ] **Información básica del grupo completa**
  - [ ] Nombre comercial del grupo
  - [ ] Usuario propietario activo
  - [ ] Slug generado correctamente

- [ ] **Información fiscal** (si aplica)
  - [ ] RFC o identificador fiscal registrado

- [ ] **Branding básico** (recomendado)
  - [ ] Logo del grupo cargado

### ✅ Checklist de Activación - Sucursal

Antes de poner la sucursal en operación, verificar:

- [ ] **Información básica completa**
  - [ ] Nombre del negocio
  - [ ] Categoría asignada
  - [ ] Ubicación dentro de zona de cobertura

- [ ] **Contacto configurado**
  - [ ] Teléfono o email de contacto
  - [ ] Dirección completa

- [ ] **Catálogo inicial**
  - [ ] Al menos 10 productos cargados (recomendado)
  - [ ] Productos con información completa (nombre, precio, categoría)
  - [ ] Productos con imágenes (recomendado)

- [ ] **Marcas asignadas**
  - [ ] Al menos una marca de vehículo asignada (si comercializa refacciones)
  - [ ] Productos asociados a marcas válidas

- [ ] **Usuarios configurados**
  - [ ] Usuario propietario activo
  - [ ] Al menos un usuario operativo (recomendado)

- [ ] **Estado operativo**
  - [ ] Negocio marcado como `is_active = true`
  - [ ] Negocio marcado como `is_verified = true` (por administrador)
  - [ ] `accepts_orders = true`

- [ ] **Horarios configurados**
  - [ ] Horarios de operación definidos (recomendado)

- [ ] **Imágenes cargadas**
  - [ ] Logo del negocio (recomendado)
  - [ ] Imágenes de productos principales (recomendado)

### ✅ Pruebas Recomendadas

- [ ] **Búsqueda del negocio**
  - Verificar que el negocio aparece en búsquedas
  - Verificar que aparece en el mapa

- [ ] **Visualización de productos**
  - Verificar que los productos se muestran correctamente
  - Verificar filtros por marca/modelo/año

- [ ] **Proceso de pedido**
  - Crear un pedido de prueba
  - Verificar que el negocio recibe la notificación
  - Verificar que el estado del pedido se actualiza correctamente

- [ ] **Comunicación**
  - Verificar que las notificaciones llegan al email/teléfono configurado

---

## 📋 Resumen de Campos Requeridos vs Opcionales

### ⚠️ Campos Obligatorios - Grupo Empresarial

1. `name` - Nombre comercial del grupo
2. `owner_id` - ID del usuario propietario (UUID válido)
3. `slug` - Identificador único (se genera automáticamente si no se proporciona)

### ⚠️ Campos Obligatorios - Sucursal

1. `name` - Nombre de la sucursal
2. `category` - Categoría del negocio
3. `longitude` - Longitud (coordenada)
4. `latitude` - Latitud (coordenada)
5. `owner_id` - ID del usuario propietario (UUID válido)

### ✅ Campos Opcionales pero Recomendados - Grupo Empresarial

1. `legal_name` - Razón social del grupo
2. `description` - Descripción del grupo
3. `logo_url` - Logo del grupo
4. `tax_id` - RFC o identificador fiscal
5. `website_url` - Sitio web del grupo

### ✅ Campos Opcionales pero Recomendados - Sucursal

1. `legal_name` - Razón social
2. `description` - Descripción del negocio
3. `phone` - Teléfono de contacto
4. `email` - Email de contacto
5. `address_line1` - Dirección completa
6. `logo_url` - Logo de la sucursal
7. `opening_hours` - Horarios de operación
8. `accepts_pickup` - Acepta recolección en tienda
9. `business_group_id` - ID del grupo empresarial (si pertenece a un grupo)

### 📝 Campos Opcionales - Grupo Empresarial

1. `legal_name` - Razón social
2. `description` - Descripción
3. `logo_url` - Logo del grupo
4. `website_url` - Sitio web
5. `tax_id` - RFC o identificador fiscal
6. `settings` - Configuraciones adicionales (JSONB)

### 📝 Campos Opcionales - Sucursal

1. `legal_name` - Razón social
2. `description` - Descripción
3. `tags` - Tags del negocio
4. `website_url` - Sitio web
5. `cover_image_url` - Imagen de portada
6. `wallet_business_id` - ID del wallet
7. `business_group_id` - ID del grupo empresarial

---

## 🔗 Referencias y Documentación Relacionada

- [Transformación a Refacciones](./01-transformacion-refacciones.md)
- [Estructura de Categorías](./02-estructura-categorias-refacciones.md)
- [Sistema de Compatibilidad de Vehículos](./03-sistema-compatibilidad-vehiculos.md)
- [Gestión de Zonas de Cobertura](../19-gestion-zonas-cobertura.md)
- [Sistema de Catálogos Avanzado](../20-sistema-catalogos-productos-avanzado.md)
- [Roles de Negocio](../18-roles-negocio-multi-tiendas.md)
- [Instrucciones de Carga Masiva](../../INSTRUCCIONES_CARGA_MASIVA.txt)

---

## 📞 Soporte

Si tienes dudas sobre algún requisito o necesitas ayuda con el proceso de alta, contacta al equipo de soporte técnico.

---

**Versión:** 1.0  
**Fecha:** 2025-01-XX  
**Última actualización:** 2025-01-XX

