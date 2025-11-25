# Arquitectura del MVP y Roadmap

## 🏗️ Arquitectura del MVP

### Aplicaciones

#### 📱 App Cliente
- **Tecnología:** React Native / Flutter
- **Funcionalidades:**
  - Realizar pedidos
  - Pagos con LocalCoins
  - Seguimiento en tiempo real
  - Chat con repartidor/local
  - Evaluaciones y propinas

#### 🚴 App Repartidor
- **Tecnología:** React Native / Flutter
- **Funcionalidades:**
  - Ver pedidos disponibles
  - Aceptar/rechazar pedidos
  - Navegación y rutas
  - Gestión de entregas
  - Visualización de ganancias

#### 🏪 App Local
- **Tecnología:** Web / Mobile (React / React Native)
- **Funcionalidades:**
  - Gestión de menú
  - Configuración de horarios
  - Recepción de pedidos
  - Gestión de promociones
  - Estadísticas de ventas

#### ⚙️ Panel Admin
- **Tecnología:** Web (React / Next.js)
- **Funcionalidades:**
  - Control de usuarios
  - Métricas y analytics
  - Gestión de créditos (LCs)
  - Reportes financieros
  - Configuración del sistema

### Backend

#### Stack Tecnológico

- **Framework:** Node.js + NestJS o Express
- **Base de datos:** PostgreSQL / Supabase
- **Autenticación:** Firebase Auth / JWT
- **Infraestructura:** AWS / Render
- **Pagos:** Integración con fintechs (Stripe, Conekta, MercadoPago)

#### Servicios Principales

- API REST para todas las aplicaciones
- Sistema de notificaciones push
- Gestión de LocalCoins
- Integración con servicios de pago
- Sistema de geolocalización
- Chat en tiempo real

## 📅 Roadmap de MVP (4 Semanas)

> 📊 **Ver diagrama de Gantt visual:** [Gantt Conceptual](./GANTT-CONCEPTUAL.md)

### Semana 1: Definición Funcional y Setup Técnico

**Objetivo:** Establecer las bases del proyecto

**Entregables:**
- ✅ Casos de uso documentados
- ✅ Wireframes y mockups
- ✅ Setup del backend inicial
- ✅ Configuración de base de datos
- ✅ Autenticación básica

**Tareas:**
- Definir estructura de base de datos
- Configurar repositorios y CI/CD
- Setup de ambientes (dev, staging, prod)
- Documentación técnica inicial

### Semana 2: Flujo Cliente-Local-Repartidor

**Objetivo:** Implementar el flujo core de pedidos

**Entregables:**
- API funcional para pedidos
- App cliente básica (crear pedido, ver estado)
- App local básica (recibir pedidos)
- App repartidor básica (aceptar pedidos)

**Tareas:**
- Endpoints de pedidos
- Sistema de notificaciones
- Geolocalización básica
- Estados de pedido

### Semana 3: Sistema de Créditos y Propinas

**Objetivo:** Implementar LocalCoins y sistema de pagos

**Entregables:**
- Módulo de LocalCoins
- Sistema de compra de créditos
- Sistema de propinas
- Panel admin básico

**Tareas:**
- Wallet de LocalCoins por usuario
- Integración con fintechs
- Conversión de LCs
- Control de emisión

### Semana 4: Testing y Demo Local

**Objetivo:** Validar el MVP completo

**Entregables:**
- MVP completo end-to-end
- Testing de todos los flujos
- Demo funcional
- Documentación de usuario

**Tareas:**
- Testing de integración
- Corrección de bugs
- Optimización de performance
- Preparación para piloto

## 🎯 Criterios de Éxito del MVP

- ✅ Usuario puede crear cuenta y comprar LCs
- ✅ Cliente puede realizar pedido
- ✅ Local puede recibir y gestionar pedido
- ✅ Repartidor puede aceptar y entregar pedido
- ✅ Pagos funcionan correctamente
- ✅ Notificaciones en tiempo real
- ✅ Panel admin funcional

## 🔄 Próximas Fases (Post-MVP)

- Fase 2: Sistema de membresías Premium
- Fase 3: Marketplace y publicidad
- Fase 4: Expansión a múltiples barrios

---

**Anterior:** [Modelo de Operación](./02-modelo-operacion.md) | **Siguiente:** [Gantt Conceptual](./GANTT-CONCEPTUAL.md) | **Después:** [Modelo Financiero](./04-modelo-financiero.md)

