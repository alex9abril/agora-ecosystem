# 📋 Plan de Proyecto LOCALIA - 4 Semanas / 3 Desarrolladores

## 👥 Equipo

- **Dev 1:** Backend + Base de Datos + API
- **Dev 2:** Frontend Móvil (React Native) - App Cliente + App Repartidor
- **Dev 3:** Frontend Web (React/Next.js) - App Local + Panel Admin

---

## 📅 SEMANA 1: Setup y Fundamentos

### Objetivo: Establecer infraestructura base y autenticación

#### Dev 1: Backend (40h)
- [ ] **Setup del proyecto backend** (NestJS/Express)
  - Inicializar proyecto
  - Configurar estructura de carpetas
  - Setup de TypeScript
  - Configurar ESLint/Prettier
- [ ] **Configuración de base de datos** (PostgreSQL/Supabase)
  - Crear esquema de base de datos
  - Tablas: users, businesses, delivery_persons, orders, localcoins_transactions
  - Migraciones iniciales
  - Seeders básicos
- [ ] **Sistema de autenticación**
  - Integración Firebase Auth / JWT
  - Endpoints de registro/login
  - Middleware de autenticación
  - Roles y permisos (cliente, local, repartidor, admin)
- [ ] **Configuración de ambientes**
  - Variables de entorno (dev, staging, prod)
  - Configuración CI/CD básica
  - Docker setup (opcional)

#### Dev 2: Frontend Móvil - Setup (40h)
- [ ] **Setup React Native**
  - Inicializar proyecto React Native
  - Configurar navegación (React Navigation)
  - Setup de estructura de carpetas
  - Configurar ESLint/Prettier
- [ ] **Autenticación en móvil**
  - Pantallas de login/registro
  - Integración con Firebase Auth
  - Manejo de tokens
  - Persistencia de sesión
- [ ] **Navegación básica**
  - Stack Navigator inicial
  - Pantallas placeholder
  - Bottom tabs (App Cliente)
- [ ] **Configuración de ambientes**
  - Variables de entorno
  - Configuración de API endpoints

#### Dev 3: Frontend Web - Setup (40h)
- [ ] **Setup Next.js/React**
  - Inicializar proyecto Next.js
  - Configurar estructura de carpetas
  - Setup de TypeScript
  - Configurar ESLint/Prettier
- [ ] **Autenticación web**
  - Pantallas de login/registro (App Local)
  - Integración con Firebase Auth
  - Manejo de tokens
  - Rutas protegidas
- [ ] **Layouts básicos**
  - Layout para App Local
  - Layout para Panel Admin
  - Componentes compartidos
- [ ] **Configuración de ambientes**
  - Variables de entorno
  - Configuración de API endpoints

**Entregables Semana 1:**
- ✅ Backend funcionando con autenticación
- ✅ Base de datos configurada
- ✅ Apps móviles con login funcional
- ✅ Apps web con login funcional
- ✅ Documentación técnica inicial

---

## 📅 SEMANA 2: Flujo Core de Pedidos

### Objetivo: Implementar flujo completo de pedidos (crear → aceptar → entregar)

#### Dev 1: Backend - API de Pedidos (40h)
- [ ] **Modelos y esquemas**
  - Modelo Order completo
  - Estados de pedido (pending, accepted, in_transit, delivered, cancelled)
  - Relaciones entre modelos
- [ ] **Endpoints de pedidos**
  - POST /orders (crear pedido)
  - GET /orders (listar pedidos)
  - GET /orders/:id (detalle de pedido)
  - PUT /orders/:id/accept (aceptar pedido)
  - PUT /orders/:id/update-status (actualizar estado)
- [ ] **Sistema de notificaciones**
  - Integración con Firebase Cloud Messaging
  - Notificaciones push básicas
  - Notificaciones por cambio de estado
- [ ] **Geolocalización**
  - Endpoints para ubicación
  - Cálculo de distancias
  - Validación de radio (3 km)
- [ ] **Filtros y búsqueda**
  - Pedidos disponibles para repartidores
  - Pedidos por local
  - Historial de pedidos

#### Dev 2: Frontend Móvil - App Cliente (40h)
- [ ] **Pantalla de inicio**
  - Lista de locales disponibles
  - Búsqueda y filtros básicos
  - Cards de locales
- [ ] **Pantalla de menú**
  - Visualización de menú del local
  - Agregar items al carrito
  - Cálculo de total
- [ ] **Crear pedido**
  - Formulario de pedido
  - Selección de dirección
  - Confirmación de pedido
  - Envío de pedido a API
- [ ] **Seguimiento de pedido**
  - Pantalla de estado en tiempo real
  - Mapa con ubicación (básico)
  - Información del repartidor
  - Tiempo estimado

#### Dev 2: Frontend Móvil - App Repartidor (40h)
- [ ] **Pantalla de pedidos disponibles**
  - Lista de pedidos pendientes
  - Información del pedido (origen, destino, distancia)
  - Filtros básicos
- [ ] **Aceptar pedido**
  - Detalle del pedido
  - Botón aceptar/rechazar
  - Confirmación
- [ ] **Gestión de entrega**
  - Pantalla de pedido activo
  - Botones de cambio de estado
  - Navegación básica
  - Marcar como entregado
- [ ] **Historial de entregas**
  - Lista de pedidos completados
  - Ganancias acumuladas

#### Dev 3: Frontend Web - App Local (40h)
- [ ] **Dashboard del local**
  - Vista general de pedidos
  - Estadísticas básicas
  - Notificaciones de nuevos pedidos
- [ ] **Gestión de pedidos**
  - Lista de pedidos recibidos
  - Detalle de pedido
  - Aceptar/rechazar pedido
  - Actualizar estado de preparación
- [ ] **Gestión de menú básica**
  - Lista de productos
  - Agregar/editar producto
  - Activar/desactivar productos
- [ ] **Configuración básica**
  - Horarios de operación
  - Información del local

**Entregables Semana 2:**
- ✅ API completa de pedidos
- ✅ Cliente puede crear pedido
- ✅ Repartidor puede aceptar pedido
- ✅ Local puede recibir y gestionar pedido
- ✅ Notificaciones en tiempo real funcionando

---

## 📅 SEMANA 3: Sistema de Créditos y Panel Admin

### Objetivo: Implementar LocalCoins, pagos y panel de administración

#### Dev 1: Backend - LocalCoins y Pagos (40h)
- [ ] **Modelo de LocalCoins**
  - Tabla de wallets (balance por usuario)
  - Tabla de transacciones
  - Tipos de transacción (compra, pago, propina, conversión)
- [ ] **Endpoints de LocalCoins**
  - GET /wallet/balance (consultar balance)
  - POST /wallet/purchase (comprar LCs)
  - POST /wallet/transfer (transferir LCs)
  - GET /wallet/transactions (historial)
- [ ] **Integración con fintechs**
  - Setup de Stripe/Conekta/MercadoPago
  - Endpoint de compra de créditos
  - Webhooks de pagos
  - Conversión de LCs a dinero real
- [ ] **Sistema de propinas**
  - Endpoint para agregar propina
  - Cálculo automático de distribución
- [ ] **Control de emisión**
  - Lógica de LCs bonificados
  - Caducidad de créditos (30 días)
  - Validación de ratios

#### Dev 2: Frontend Móvil - Integración LocalCoins (40h)
- [ ] **Wallet en App Cliente**
  - Pantalla de balance
  - Historial de transacciones
  - Comprar LocalCoins
  - Integración con fintech
- [ ] **Pago con LocalCoins**
  - Selección de método de pago
  - Confirmación de pago
  - Validación de balance
- [ ] **Sistema de propinas**
  - Agregar propina al pedido
  - Selección de monto
  - Confirmación
- [ ] **App Repartidor - Ganancias**
  - Visualización de ganancias
  - Historial de pagos recibidos
  - Opción de conversión a dinero real

#### Dev 3: Frontend Web - Panel Admin (40h)
- [ ] **Dashboard administrativo**
  - Métricas generales (usuarios, pedidos, ingresos)
  - Gráficos básicos
  - Filtros por fecha
- [ ] **Gestión de usuarios**
  - Lista de usuarios (clientes, locales, repartidores)
  - Detalle de usuario
  - Activar/desactivar usuarios
  - Ver historial de transacciones
- [ ] **Gestión de LocalCoins**
  - Balance total de LCs en circulación
  - Emisión de créditos bonificados
  - Control de emisión
  - Reportes de transacciones
- [ ] **Reportes financieros**
  - Ingresos por comisiones
  - Conversiones de LCs
  - Análisis de transacciones
- [ ] **Configuración del sistema**
  - Parámetros generales
  - Comisiones
  - Límites y restricciones

**Entregables Semana 3:**
- ✅ Sistema de LocalCoins funcional
- ✅ Compra de créditos integrada
- ✅ Pagos con LCs funcionando
- ✅ Sistema de propinas implementado
- ✅ Panel admin básico operativo

---

## 📅 SEMANA 4: Red Social Ecológica (MVP) y Testing

### Objetivo: Implementar red social básica y validar MVP completo

#### Dev 1: Backend - Red Social y Optimizaciones (40h)
- [ ] **Modelo de red social**
  - Tabla de publicaciones (posts)
  - Tabla de likes/comentarios
  - Tabla de seguimientos (follows)
- [ ] **Endpoints de red social**
  - POST /posts (crear publicación)
  - GET /posts (feed de publicaciones)
  - POST /posts/:id/like (like/unlike)
  - POST /posts/:id/comment (comentar)
  - GET /posts/user/:id (publicaciones de usuario)
- [ ] **Sistema de tags automáticos**
  - Cálculo de emisiones CO₂ por pedido
  - Cálculo de reducción de plástico
  - Generación automática de tags
- [ ] **Cálculo de impacto ecológico**
  - Endpoint para calcular emisiones
  - Endpoint para calcular plástico evitado
  - Acumulación de impacto por usuario
- [ ] **Testing y optimizaciones**
  - Tests de integración básicos
  - Optimización de queries
  - Corrección de bugs críticos

#### Dev 2: Frontend Móvil - Red Social (40h)
- [ ] **Feed de publicaciones**
  - Lista de publicaciones
  - Scroll infinito
  - Cards de publicación con tags
- [ ] **Crear publicación**
  - Cámara integrada / selección de foto
  - Editor básico (filtros opcionales)
  - Tags automáticos pre-cargados
  - Publicar en feed
- [ ] **Interacción social**
  - Sistema de likes
  - Comentarios básicos
  - Compartir publicación
- [ ] **Perfil ecológico**
  - Estadísticas de impacto
  - Publicaciones del usuario
  - Badges obtenidos
- [ ] **Compartir externo**
  - Generar tarjeta para compartir
  - Compartir en WhatsApp
  - Link de invitación incluido

#### Dev 3: Frontend Web - Mejoras y Testing (40h)
- [ ] **Mejoras en App Local**
  - Gestión completa de menú
  - Promociones básicas
  - Estadísticas de ventas mejoradas
- [ ] **Mejoras en Panel Admin**
  - Reportes avanzados
  - Exportación de datos
  - Gestión de contenido de red social
- [ ] **Testing end-to-end**
  - Flujos completos de usuario
  - Corrección de bugs
  - Optimización de performance
- [ ] **Documentación**
  - Guía de usuario básica
  - Documentación de API
  - Manual de administrador

**Entregables Semana 4:**
- ✅ Red social ecológica básica funcionando
- ✅ Feed de publicaciones con tags
- ✅ Compartir impacto en redes externas
- ✅ MVP completo end-to-end
- ✅ Testing completo realizado
- ✅ Documentación finalizada

---

## 🎯 Criterios de Éxito del MVP

### Funcionalidades Core
- [ ] Usuario puede crear cuenta y autenticarse
- [ ] Cliente puede comprar LocalCoins
- [ ] Cliente puede realizar pedido
- [ ] Local puede recibir y gestionar pedido
- [ ] Repartidor puede aceptar y entregar pedido
- [ ] Pagos con LocalCoins funcionan correctamente
- [ ] Notificaciones en tiempo real
- [ ] Panel admin funcional

### Funcionalidades Red Social
- [ ] Usuario puede crear publicación con foto/video
- [ ] Tags automáticos de emisiones y plástico
- [ ] Feed de publicaciones funcional
- [ ] Compartir en WhatsApp
- [ ] Perfil ecológico con estadísticas

---

## 📊 Distribución de Trabajo

### Por Rol

**Dev 1 (Backend):**
- Semana 1: 40h - Setup + DB + Auth
- Semana 2: 40h - API Pedidos + Notificaciones
- Semana 3: 40h - LocalCoins + Fintech
- Semana 4: 40h - Red Social + Testing
- **Total: 160h**

**Dev 2 (Móvil):**
- Semana 1: 40h - Setup + Auth
- Semana 2: 40h - App Cliente + App Repartidor
- Semana 3: 40h - LocalCoins + Propinas
- Semana 4: 40h - Red Social + Testing
- **Total: 160h**

**Dev 3 (Web):**
- Semana 1: 40h - Setup + Auth
- Semana 2: 40h - App Local
- Semana 3: 40h - Panel Admin
- Semana 4: 40h - Mejoras + Testing
- **Total: 160h**

### Por Semana

- **Semana 1:** 120h total (40h × 3 devs)
- **Semana 2:** 120h total (40h × 3 devs)
- **Semana 3:** 120h total (40h × 3 devs)
- **Semana 4:** 120h total (40h × 3 devs)
- **Total Proyecto: 480h**

---

## 🔄 Notas Importantes

### Proyecto Wallet Separado
- La wallet de LocalCoins se desarrollará como **proyecto adicional separado**
- En este MVP se integrará mediante API externa
- El desarrollo completo del Proyecto Wallet será posterior

### Prioridades
1. **Crítico:** Flujo de pedidos completo
2. **Alto:** Sistema de LocalCoins básico
3. **Medio:** Red social ecológica (MVP básico)
4. **Bajo:** Optimizaciones y mejoras de UI

### Dependencias
- Backend debe estar listo antes de integraciones frontend
- Autenticación debe estar lista antes de otras funcionalidades
- API de pedidos debe estar lista antes de apps móviles

---

## 📝 Checklist de Entrega Final

- [ ] Todos los endpoints documentados
- [ ] Tests básicos implementados
- [ ] Apps móviles funcionando en iOS y Android
- [ ] Apps web responsivas
- [ ] Panel admin completamente funcional
- [ ] Red social ecológica básica operativa
- [ ] Documentación de usuario completa
- [ ] Demo funcional preparada
- [ ] Deployment en ambiente de staging

---

**Este plan puede ser importado a GitHub Projects o usado como referencia para crear las issues y milestones correspondientes.**

