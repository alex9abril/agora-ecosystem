# 🚀 Aplicaciones LOCALIA

Este directorio contiene todas las aplicaciones del proyecto LOCALIA.

**⚠️ IMPORTANTE:** Cada app tiene sus propias dependencias independientes. Instala las dependencias dentro de cada carpeta de app.

## 📱 Aplicaciones

### ⚙️ Backend (`backend/`)
- **Stack:** NestJS + TypeScript
- **Puerto:** 3000
- **Descripción:** API REST para todas las aplicaciones
- **Instalación:**
  ```bash
  cd apps/backend
  npm install
  ```
- **Ejecución:**
  ```bash
  npm run dev
  ```

### 📱 App Cliente (`mobile-client/`)
- **Stack:** React Native + Expo
- **Descripción:** Aplicación móvil para clientes
- **Instalación:**
  ```bash
  cd apps/mobile-client
  npm install
  ```
- **Ejecución:**
  ```bash
  npm start
  ```

### 🚴 App Repartidor (`mobile-repartidor/`)
- **Stack:** React Native + Expo
- **Descripción:** Aplicación móvil para repartidores
- **Instalación:**
  ```bash
  cd apps/mobile-repartidor
  npm install
  ```
- **Ejecución:**
  ```bash
  npm start
  ```

### 🏪 App Local (`web-local/`)
- **Stack:** Next.js + React + TypeScript
- **Puerto:** 3001
- **Descripción:** Aplicación web para establecimientos
- **Instalación:**
  ```bash
  cd apps/web-local
  npm install
  ```
- **Ejecución:**
  ```bash
  npm run dev
  ```

### ⚙️ Panel Admin (`web-admin/`)
- **Stack:** Next.js + React + TypeScript
- **Puerto:** 3002
- **Descripción:** Panel de administración
- **Instalación:**
  ```bash
  cd apps/web-admin
  npm install
  ```
- **Ejecución:**
  ```bash
  npm run dev
  ```

## 🔧 Setup Inicial

### Opción 1: Instalar todas las apps

Desde la raíz del proyecto:
```bash
npm run install:all
```

### Opción 2: Instalar app por app

```bash
# Backend
cd apps/backend && npm install

# App Cliente
cd apps/mobile-client && npm install

# App Repartidor
cd apps/mobile-repartidor && npm install

# App Local
cd apps/web-local && npm install

# Panel Admin
cd apps/web-admin && npm install
```

## 🚀 Desarrollo

Cada app se ejecuta independientemente en su propia terminal:

```bash
# Terminal 1: Backend
cd apps/backend
npm run dev

# Terminal 2: App Cliente
cd apps/mobile-client
npm start

# Terminal 3: App Repartidor
cd apps/mobile-repartidor
npm start

# Terminal 4: App Local
cd apps/web-local
npm run dev

# Terminal 5: Panel Admin
cd apps/web-admin
npm run dev
```

O desde la raíz usando los scripts:
```bash
npm run dev:backend
npm run dev:client
npm run dev:repartidor
npm run dev:local
npm run dev:admin
```

## 🔗 URLs de Desarrollo

- **Backend API:** http://localhost:3000/api
- **Swagger Docs:** http://localhost:3000/api/docs
- **App Local:** http://localhost:3001
- **Panel Admin:** http://localhost:3002
- **App Cliente:** Expo Dev Client (puerto dinámico)
- **App Repartidor:** Expo Dev Client (puerto dinámico)

## 📦 Estructura de Dependencias

Cada app tiene su propio `node_modules` dentro de su carpeta:
- `apps/backend/node_modules/`
- `apps/mobile-client/node_modules/`
- `apps/mobile-repartidor/node_modules/`
- `apps/web-local/node_modules/`
- `apps/web-admin/node_modules/`

Esto asegura que no haya conflictos de versiones entre apps.
