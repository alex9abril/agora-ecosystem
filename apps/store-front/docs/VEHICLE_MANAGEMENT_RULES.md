# Reglas de Gestión de Vehículos

## Objetivo
Permitir que los usuarios seleccionen y gestionen vehículos tanto sin sesión como con sesión, asegurando que las piezas compradas sean compatibles con su vehículo.

## Reglas Principales

### 1. Sin Sesión (Usuario Invitado)

#### 1.1 Agregar Vehículo
- ✅ Usuario puede agregar vehículos sin necesidad de registrarse
- ✅ Los vehículos se guardan **únicamente en localStorage** del dispositivo
- ✅ No se requiere autenticación para esta acción

#### 1.2 Seleccionar Vehículo
- ✅ Usuario puede seleccionar un vehículo de localStorage
- ✅ El vehículo seleccionado se usa para filtrar productos compatibles
- ✅ El vehículo seleccionado persiste durante la sesión del navegador

#### 1.3 Visualización
- ✅ El vehículo seleccionado se muestra en el Header
- ✅ Los productos se filtran según el vehículo seleccionado

### 2. Con Sesión (Usuario Autenticado)

#### 2.1 Fuentes de Vehículos
El usuario autenticado tiene vehículos de **dos fuentes**:
- **Vehículos de la cuenta**: Guardados en la base de datos, disponibles en todos los dispositivos
- **Vehículos locales**: Guardados en localStorage del dispositivo actual

#### 2.2 Visualización Unificada
- ✅ Mostrar TODOS los vehículos: de la cuenta + de localStorage
- ✅ Si el mismo vehículo existe en ambas fuentes, mostrar solo uno (prioridad: cuenta > localStorage)
- ✅ Identificar visualmente el origen de cada vehículo (opcional)

#### 2.3 Selección de Vehículo
- ✅ Usuario puede seleccionar cualquier vehículo (de cuenta o local)
- ✅ Si selecciona un vehículo de la cuenta, se guarda como predeterminado en la cuenta
- ✅ Si selecciona un vehículo local, se guarda en localStorage

### 3. Sincronización al Iniciar Sesión/Registrarse

#### 3.1 Proceso de Sincronización
Cuando el usuario inicia sesión o se registra:

1. **Obtener vehículos de localStorage** (si existen)
2. **Obtener vehículos de la cuenta** (desde BD)
3. **Para cada vehículo de localStorage:**
   - Verificar si ya existe en la cuenta (comparar: `brand_id`, `model_id`, `year_id`, `spec_id`)
   - Si **NO existe**: Crear en la cuenta
   - Si **YA existe**: No duplicar, mantener el de la cuenta
4. **Limpiar localStorage** solo después de sincronización exitosa
5. **Cargar vehículos de la cuenta** y mostrarlos

#### 3.2 Detección de Duplicados
Un vehículo se considera duplicado si tiene:
- Mismo `vehicle_brand_id`
- Mismo `vehicle_model_id` (o ambos null)
- Mismo `vehicle_year_id` (o ambos null)
- Mismo `vehicle_spec_id` (o ambos null)

#### 3.3 Manejo de Errores
- Si la sincronización falla, **NO limpiar localStorage**
- Mantener vehículos locales disponibles
- Registrar error en consola pero no interrumpir el flujo de autenticación

### 4. Al Cerrar Sesión

#### 4.1 Comportamiento
- ✅ **NO limpiar** vehículos de localStorage
- ✅ Mantener vehículos locales disponibles para uso sin sesión
- ✅ El usuario puede seguir usando vehículos locales sin sesión

### 5. Sincronización entre Dispositivos

#### 5.1 Dispositivo A (con vehículos locales)
- Usuario inicia sesión → Vehículos locales se sincronizan a la cuenta
- Usuario cierra sesión → Vehículos locales permanecen

#### 5.2 Dispositivo B (nuevo)
- Usuario inicia sesión → Solo vehículos de la cuenta (no hay locales)
- Usuario puede agregar vehículos locales que se sincronizarán al iniciar sesión

### 6. Prioridades y Resolución de Conflictos

#### 6.1 Prioridad de Fuentes
1. **Vehículos de la cuenta** (mayor prioridad)
2. **Vehículos de localStorage** (menor prioridad)

#### 6.2 Vehículo Predeterminado
- Si hay vehículo predeterminado en la cuenta → Usar ese
- Si no hay predeterminado pero hay vehículos locales → Usar el primero local
- Si no hay ninguno → No hay vehículo seleccionado

### 7. Casos de Uso Específicos

#### 7.1 Usuario Nuevo (sin sesión)
1. Agrega vehículo → Se guarda en localStorage
2. Selecciona vehículo → Se usa para filtrar productos
3. Agrega productos al carrito
4. Va a checkout → Se le pide registrarse/iniciar sesión
5. Se registra → Vehículo se sincroniza a su cuenta

#### 7.2 Usuario Existente (inicia sesión)
1. Tiene vehículos en su cuenta
2. Inicia sesión → Vehículos de cuenta se cargan
3. Si hay vehículos locales → Se sincronizan (sin duplicar)
4. Ve todos sus vehículos unificados

#### 7.3 Usuario en Múltiples Dispositivos
- Dispositivo 1: Tiene vehículos locales + cuenta
- Dispositivo 2: Solo vehículos de cuenta (después de sincronización)
- Ambos dispositivos tienen acceso a los mismos vehículos de cuenta

## Implementación Técnica

### Funciones Clave Necesarias

1. **`syncLocalVehiclesToAccount()`**: Sincroniza vehículos de localStorage a la cuenta
2. **`isVehicleDuplicate(vehicle1, vehicle2)`**: Verifica si dos vehículos son iguales
3. **`mergeVehicles(accountVehicles, localVehicles)`**: Combina vehículos sin duplicar
4. **`getAllUserVehicles()`**: Obtiene vehículos unificados (cuenta + local)

### Estructura de Datos

```typescript
interface VehicleSource {
  source: 'account' | 'local';
  vehicle: UserVehicle | LocalVehicle;
}

interface UnifiedVehicleList {
  vehicles: VehicleSource[];
  defaultVehicle: VehicleSource | null;
}
```

## Resumen Ejecutivo

1. **Sin sesión**: Vehículos solo en localStorage
2. **Con sesión**: Vehículos de cuenta + localStorage (unificados)
3. **Al iniciar sesión**: Sincronizar localStorage → cuenta (sin duplicar)
4. **Al cerrar sesión**: Mantener localStorage
5. **Prioridad**: Cuenta > localStorage
6. **Detección de duplicados**: Por brand_id, model_id, year_id, spec_id

