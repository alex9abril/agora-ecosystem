# 🎯 Roles de Negocio con Interfaces Diferenciadas

Este documento describe la implementación de interfaces diferenciadas para los roles de negocio en `web-local`, basado en las mejores prácticas de aplicaciones de delivery como Uber Eats, Rappi y DoorDash.

---

## 📋 Descripción General

El sistema implementa **3 roles principales** (después de `superadmin`) con interfaces completamente diferenciadas y aisladas:

1. **Administrador (`admin`)**: Acceso completo excepto configuración
2. **Operations Staff (`operations_staff`)**: Panel operativo independiente para gestión de órdenes
3. **Kitchen Staff (`kitchen_staff`)**: Interfaz aislada enfocada en preparación de órdenes

---

## 🔍 Investigación: Aplicaciones de Inspiración

### Uber Eats Restaurant Dashboard

**Características observadas:**
- **Panel de Operaciones**: Vista de órdenes en tiempo real con actualizaciones automáticas
- **Interfaz de Cocina**: Pantalla táctil grande, diseño minimalista, botones grandes para acciones rápidas
- **Estados visuales**: Colores distintivos por estado (rojo=pending, amarillo=preparing, verde=ready)
- **Notificaciones sonoras**: Alertas cuando llegan nuevas órdenes
- **Auto-refresh**: Actualización automática cada 5-10 segundos
- **Filtros rápidos**: Por estado, tiempo de espera, tipo de pedido

### Rappi Restaurant Portal

**Características observadas:**
- **Dashboard Operativo**: Métricas en tiempo real (órdenes pendientes, tiempo promedio)
- **Vista de Cocina**: Lista vertical de órdenes, ordenadas por tiempo de llegada
- **Acciones rápidas**: Botones grandes para "Aceptar", "Preparar", "Listo"
- **Timer visual**: Cuenta regresiva para tiempo estimado de preparación
- **Priorización**: Órdenes urgentes destacadas visualmente

### DoorDash Merchant Portal

**Características observadas:**
- **Panel de Control**: Vista kanban con columnas por estado
- **Interfaz de Cocina**: Diseño tipo "ticket de cocina", información mínima pero esencial
- **Gestión de tiempos**: Tiempo transcurrido desde aceptación, tiempo estimado de preparación
- **Notificaciones push**: Alertas en tiempo real para nuevas órdenes

---

## 👥 Roles y Permisos Detallados

### 1. **Administrador (`admin`)**

**Acceso:**
- ✅ Gestión completa de productos (crear, editar, eliminar)
- ✅ Gestión de precios y promociones
- ✅ Gestión de catálogo (categorías, colecciones)
- ✅ Gestión de órdenes (ver todas, actualizar estados)
- ✅ Estadísticas y reportes del negocio
- ✅ Gestión de horarios y disponibilidad
- ✅ Gestión de reseñas y respuestas
- ❌ **NO** puede acceder a configuración del sistema
- ❌ **NO** puede gestionar usuarios ni roles (solo superadmin)

**Interfaz:**
- Dashboard completo con todas las secciones
- Menú lateral con todas las opciones excepto "Configuración"
- Vista de órdenes completa con todas las funcionalidades

---

### 2. **Operations Staff (`operations_staff`)**

**Acceso:**
- ✅ **Solo** gestión de órdenes
- ✅ Ver todas las órdenes (pendientes, confirmadas, en preparación, listas, en tránsito)
- ✅ Aceptar pedidos (pending → confirmed)
- ✅ Actualizar estados de pedidos (confirmed → preparing → ready)
- ✅ Gestionar entregas cuando llega el repartidor (picked_up → delivered)
- ✅ Cancelar pedidos (con razón)
- ✅ Ver detalles completos de pedidos
- ✅ Notificaciones en tiempo real
- ❌ **NO** puede modificar productos
- ❌ **NO** puede modificar precios
- ❌ **NO** puede crear promociones
- ❌ **NO** puede acceder a otras secciones

**Interfaz Diferenciada:**
- **Panel operativo independiente** con diseño optimizado para operaciones
- **Vista tipo dashboard** con métricas en tiempo real:
  - Órdenes pendientes
  - Órdenes en preparación
  - Órdenes listas
  - Tiempo promedio de preparación
  - Ingresos del día
- **Vista de órdenes tipo kanban** con columnas por estado:
  - Pendientes (rojo)
  - Confirmadas (amarillo)
  - En Preparación (naranja)
  - Listas (verde)
  - En Tránsito (azul)
  - Entregadas (gris)
- **Auto-refresh** cada 5 segundos
- **Notificaciones sonoras** para nuevas órdenes
- **Filtros rápidos** por estado, tiempo, tipo de pago
- **Acciones rápidas** con botones grandes y visibles
- **Diseño minimalista** enfocado en velocidad de operación

**Rutas:**
- `/operations` - Panel principal de operaciones
- `/operations/orders` - Vista de órdenes (si se necesita separar)

---

### 3. **Kitchen Staff (`kitchen_staff`)**

**Acceso:**
- ✅ **Solo** órdenes aceptadas (confirmed) que pasan a preparación
- ✅ Ver órdenes en estado `confirmed` y `preparing`
- ✅ Cambiar estado a `preparing` (cuando comienza a preparar)
- ✅ Cambiar estado a `ready` (cuando termina de preparar)
- ✅ Ver detalles de items de la orden
- ✅ Ver instrucciones especiales
- ✅ Ver tiempo transcurrido desde aceptación
- ✅ Marcar items individuales como listos (opcional)
- ❌ **NO** puede aceptar pedidos nuevos
- ❌ **NO** puede cancelar pedidos
- ❌ **NO** puede gestionar entregas
- ❌ **NO** puede acceder a otras secciones

**Interfaz Aislada:**
- **Componente completamente aislado** diseñado específicamente para cocina
- **Diseño tipo "ticket de cocina"**:
  - Número de orden grande y visible
  - Lista de items con cantidades
  - Instrucciones especiales destacadas
  - Tiempo transcurrido desde aceptación
  - Timer visual para tiempo estimado
- **Vista vertical** con órdenes ordenadas por:
  1. Tiempo de espera (más antiguas primero)
  2. Prioridad (si se implementa)
- **Botones grandes y táctiles**:
  - "Iniciar Preparación" (confirmed → preparing)
  - "Marcar como Listo" (preparing → ready)
- **Colores distintivos**:
  - Amarillo: Orden confirmada, esperando preparación
  - Naranja: En preparación
  - Verde: Lista para recoger
- **Auto-refresh** cada 3 segundos (más frecuente que operations)
- **Notificaciones visuales** para nuevas órdenes (sin sonido, para no interrumpir)
- **Diseño minimalista** con información esencial únicamente
- **Modo pantalla completa** opcional para tablets en cocina

**Rutas:**
- `/kitchen` - Panel de cocina
- `/kitchen/orders` - Vista de órdenes de cocina (si se necesita separar)

---

## 🏗️ Arquitectura de Implementación

### Estructura de Componentes

```
apps/web-local/src/
├── pages/
│   ├── operations/
│   │   ├── index.tsx          # Panel principal de operaciones
│   │   └── orders/
│   │       └── [id].tsx        # Detalle de orden (vista operativa)
│   ├── kitchen/
│   │   ├── index.tsx           # Panel de cocina
│   │   └── orders/
│   │       └── [id].tsx        # Detalle de orden (vista cocina)
│   └── orders/                 # Vista de admin (existente)
│       ├── index.tsx
│       └── [id].tsx
├── components/
│   ├── operations/
│   │   ├── OperationsDashboard.tsx
│   │   ├── OrdersKanban.tsx
│   │   ├── OrderCard.tsx
│   │   └── OperationsStats.tsx
│   ├── kitchen/
│   │   ├── KitchenDashboard.tsx
│   │   ├── KitchenOrderList.tsx
│   │   ├── KitchenOrderCard.tsx
│   │   └── KitchenTimer.tsx
│   └── layout/
│       ├── OperationsLayout.tsx
│       └── KitchenLayout.tsx
└── lib/
    ├── permissions.ts           # Utilidades de permisos
    └── role-guards.tsx          # Guards para rutas basadas en roles
```

### Sistema de Permisos

```typescript
// lib/permissions.ts
export type BusinessRole = 'superadmin' | 'admin' | 'operations_staff' | 'kitchen_staff';

export interface RolePermissions {
  canManageProducts: boolean;
  canManagePrices: boolean;
  canManagePromotions: boolean;
  canManageOrders: boolean;
  canAcceptOrders: boolean;
  canPrepareOrders: boolean;
  canManageDeliveries: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
}

export const ROLE_PERMISSIONS: Record<BusinessRole, RolePermissions> = {
  superadmin: {
    canManageProducts: true,
    canManagePrices: true,
    canManagePromotions: true,
    canManageOrders: true,
    canAcceptOrders: true,
    canPrepareOrders: true,
    canManageDeliveries: true,
    canViewReports: true,
    canManageSettings: true,
    canManageUsers: true,
  },
  admin: {
    canManageProducts: true,
    canManagePrices: true,
    canManagePromotions: true,
    canManageOrders: true,
    canAcceptOrders: true,
    canPrepareOrders: true,
    canManageDeliveries: true,
    canViewReports: true,
    canManageSettings: false, // ❌ NO puede acceder a configuración
    canManageUsers: false,     // ❌ NO puede gestionar usuarios
  },
  operations_staff: {
    canManageProducts: false,
    canManagePrices: false,
    canManagePromotions: false,
    canManageOrders: true,     // ✅ Solo órdenes
    canAcceptOrders: true,
    canPrepareOrders: true,
    canManageDeliveries: true,
    canViewReports: false,
    canManageSettings: false,
    canManageUsers: false,
  },
  kitchen_staff: {
    canManageProducts: false,
    canManagePrices: false,
    canManagePromotions: false,
    canManageOrders: true,     // ✅ Solo órdenes aceptadas/preparación
    canAcceptOrders: false,     // ❌ NO puede aceptar
    canPrepareOrders: true,    // ✅ Solo preparar
    canManageDeliveries: false,
    canViewReports: false,
    canManageSettings: false,
    canManageUsers: false,
  },
};
```

### Guards de Rutas

```typescript
// lib/role-guards.tsx
import { useRouter } from 'next/router';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { BusinessRole, ROLE_PERMISSIONS } from '@/lib/permissions';

export function useRoleGuard(requiredPermission: keyof RolePermissions) {
  const router = useRouter();
  const { selectedBusiness } = useSelectedBusiness();
  
  const userRole = selectedBusiness?.role as BusinessRole;
  const permissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.operations_staff;
  
  if (!permissions[requiredPermission]) {
    router.push('/unauthorized');
    return false;
  }
  
  return true;
}
```

---

## 🎨 Diseño de Interfaces

### Operations Staff Dashboard

**Características:**
- **Layout horizontal** con sidebar colapsable
- **Métricas en la parte superior**:
  - Cards con números grandes y colores distintivos
  - Actualización en tiempo real
- **Vista Kanban** principal:
  - Columnas arrastrables (opcional)
  - Cards de órdenes con información esencial
  - Badges de estado con colores
  - Acciones rápidas en cada card
- **Filtros en la parte superior**:
  - Por estado (dropdown)
  - Por tiempo (última hora, hoy, esta semana)
  - Búsqueda por número de orden o cliente
- **Notificaciones**:
  - Toast notifications para nuevas órdenes
  - Sonido opcional (configurable)
  - Badge con contador de nuevas órdenes

### Kitchen Staff Dashboard

**Características:**
- **Layout vertical** optimizado para tablets
- **Lista de órdenes** ordenada por tiempo:
  - Cards grandes y legibles
  - Número de orden prominente
  - Items con cantidades claras
  - Timer visual
  - Botones grandes para acciones
- **Colores de estado**:
  - Amarillo: Confirmada (esperando)
  - Naranja: En preparación
  - Verde: Lista
- **Información mínima pero esencial**:
  - Número de orden
  - Items y cantidades
  - Instrucciones especiales (si hay)
  - Tiempo transcurrido
  - Botones de acción
- **Sin distracciones**:
  - Sin menús complejos
  - Sin filtros avanzados
  - Solo lo esencial para preparar

---

## 🔄 Flujos de Trabajo

### Flujo Operations Staff

1. **Usuario inicia sesión** → Redirige a `/operations`
2. **Dashboard carga** → Muestra métricas y órdenes en tiempo real
3. **Nueva orden llega** → Notificación + sonido (opcional)
4. **Usuario acepta orden** → Click en "Aceptar" → Estado: `pending` → `confirmed`
5. **Orden pasa a preparación** → Click en "Preparar" → Estado: `confirmed` → `preparing`
6. **Orden está lista** → Click en "Listo" → Estado: `preparing` → `ready`
7. **Repartidor llega** → Click en "Entregar" → Estado: `ready` → `picked_up` → `delivered`

### Flujo Kitchen Staff

1. **Usuario inicia sesión** → Redirige a `/kitchen`
2. **Dashboard carga** → Muestra solo órdenes `confirmed` y `preparing`
3. **Orden confirmada aparece** → En color amarillo, esperando preparación
4. **Usuario inicia preparación** → Click en "Iniciar Preparación" → Estado: `confirmed` → `preparing`
5. **Orden en preparación** → Cambia a color naranja, muestra timer
6. **Usuario termina preparación** → Click en "Marcar como Listo" → Estado: `preparing` → `ready`
7. **Orden lista** → Cambia a color verde, desaparece de la vista de cocina

---

## 📊 Estados de Órdenes por Rol

### Operations Staff puede ver y gestionar:
- `pending` → Puede aceptar
- `confirmed` → Puede preparar o cancelar
- `preparing` → Puede marcar como listo
- `ready` → Puede entregar cuando llega repartidor
- `assigned` → Puede ver estado
- `picked_up` → Puede marcar como entregado
- `delivered` → Solo lectura
- `cancelled` → Solo lectura

### Kitchen Staff puede ver y gestionar:
- `confirmed` → Puede iniciar preparación
- `preparing` → Puede marcar como listo
- `ready` → Solo lectura (ya no aparece en cocina)

---

## 🚀 Checklist de Implementación

### Fase 1: Sistema de Permisos
- [ ] Crear `lib/permissions.ts` con definición de permisos
- [ ] Crear `lib/role-guards.tsx` con guards de rutas
- [ ] Actualizar `SelectedBusinessContext` para incluir rol del usuario
- [ ] Crear middleware para validar permisos en rutas

### Fase 2: Operations Staff
- [ ] Crear layout `OperationsLayout.tsx`
- [ ] Crear componente `OperationsDashboard.tsx`
- [ ] Crear componente `OrdersKanban.tsx`
- [ ] Crear componente `OperationsStats.tsx`
- [ ] Crear página `/operations/index.tsx`
- [ ] Implementar auto-refresh cada 5 segundos
- [ ] Implementar notificaciones sonoras
- [ ] Implementar filtros rápidos

### Fase 3: Kitchen Staff
- [ ] Crear layout `KitchenLayout.tsx`
- [ ] Crear componente `KitchenDashboard.tsx`
- [ ] Crear componente `KitchenOrderList.tsx`
- [ ] Crear componente `KitchenOrderCard.tsx`
- [ ] Crear componente `KitchenTimer.tsx`
- [ ] Crear página `/kitchen/index.tsx`
- [ ] Implementar auto-refresh cada 3 segundos
- [ ] Implementar diseño tipo ticket de cocina
- [ ] Implementar modo pantalla completa

### Fase 4: Admin (Ajustes)
- [ ] Ocultar sección "Configuración" del menú para admin
- [ ] Ocultar opción "Gestionar Usuarios" para admin
- [ ] Validar permisos en todas las rutas de admin

### Fase 5: Navegación Condicional
- [ ] Actualizar `Sidebar.tsx` para mostrar menú según rol
- [ ] Implementar redirección automática según rol al iniciar sesión
- [ ] Crear página `/unauthorized` para acceso denegado

### Fase 6: Testing
- [ ] Probar permisos de cada rol
- [ ] Probar interfaces diferenciadas
- [ ] Probar auto-refresh y notificaciones
- [ ] Probar en diferentes dispositivos (desktop, tablet)

---

## 📝 Notas de Implementación

### Auto-refresh
- **Operations**: Cada 5 segundos (balance entre actualización y rendimiento)
- **Kitchen**: Cada 3 segundos (más frecuente para cocina)
- Usar `setInterval` con cleanup en `useEffect`
- Pausar cuando la ventana no está activa (usar `document.visibilityState`)

### Notificaciones
- **Operations**: Sonido + toast notification
- **Kitchen**: Solo visual (sin sonido para no interrumpir)
- Usar `Notification API` del navegador (con permiso del usuario)
- Implementar badge con contador de nuevas órdenes

### Optimización
- Usar `React.memo` para componentes de órdenes
- Implementar virtualización para listas largas
- Cachear datos de productos para evitar requests repetidos
- Usar WebSockets para actualizaciones en tiempo real (futuro)

---

## 🔗 Referencias

- [Uber Eats Restaurant Dashboard](https://www.ubereats.com/merchant)
- [Rappi Restaurant Portal](https://www.rappi.com.mx/restaurantes)
- [DoorDash Merchant Portal](https://www.doordash.com/merchant)

---

**Última actualización**: 2025-01-XX
**Versión**: 1.0

