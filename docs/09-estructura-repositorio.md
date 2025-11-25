# 📁 Estructura de Repositorio - Monorepo LOCALIA

## 🎯 Decisión: Monorepo

**Recomendación:** Usar un **monorepo** (un solo repositorio) para todas las aplicaciones durante el desarrollo del MVP.

### ✅ Ventajas para un Solo Desarrollador

1. **Contexto Centralizado:** Todo el código en un lugar, fácil de navegar
2. **Código Compartido:** Tipos TypeScript, utilidades, configuraciones compartidas
3. **CI/CD Simplificado:** Un solo pipeline para todo
4. **Menos Overhead:** Un solo repo que gestionar, menos configuración
5. **Refactoring Fácil:** Cambios en API se reflejan inmediatamente en todas las apps
6. **Historial Unificado:** Un solo git log para todo el proyecto

### ⚠️ Consideraciones Futuras

- Si el equipo crece a 3+ desarrolladores, considerar migrar a **multi-repo**
- El monorepo puede separarse fácilmente cuando sea necesario
- Herramientas como **Nx** o **Turborepo** pueden ayudar con la gestión

---

## 📂 Estructura Propuesta del Monorepo

```
localia-platform/
├── README.md                    # Documentación principal
├── .gitignore
├── package.json                 # Workspace root (opcional, para scripts globales)
│
├── docs/                        # 📚 Documentación del proyecto
│   ├── 01-vision-general.md
│   ├── 02-modelo-operacion.md
│   ├── 03-arquitectura-mvp.md
│   └── ...
│
├── database/                    # 🗄️ Scripts de base de datos
│   ├── schema.sql
│   ├── seed_catalog.sql
│   └── seed_delivery_cycle.sql
│
├── packages/                    # 📦 Código compartido
│   ├── shared/                  # Utilidades y tipos compartidos
│   │   ├── src/
│   │   │   ├── types/           # TypeScript types/interfaces
│   │   │   ├── utils/           # Funciones utilitarias
│   │   │   ├── constants/       # Constantes compartidas
│   │   │   └── api-client/     # Cliente API compartido
│   │   └── package.json
│   │
│   └── ui/                      # Componentes UI compartidos (opcional)
│       ├── src/
│       │   ├── components/
│       │   └── styles/
│       └── package.json
│
├── apps/                        # 🚀 Aplicaciones
│   │
│   ├── backend/                 # ⚙️ Backend API
│   │   ├── src/
│   │   │   ├── modules/         # Módulos NestJS/Express
│   │   │   │   ├── auth/
│   │   │   │   ├── orders/
│   │   │   │   ├── users/
│   │   │   │   └── ...
│   │   │   ├── config/
│   │   │   └── main.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .env.example
│   │
│   ├── mobile-client/           # 📱 App Cliente (React Native)
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── navigation/
│   │   │   ├── services/
│   │   │   └── App.tsx
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── app.json
│   │   └── babel.config.js
│   │
│   ├── mobile-repartidor/      # 🚴 App Repartidor (React Native)
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── navigation/
│   │   │   ├── services/
│   │   │   └── App.tsx
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── app.json
│   │   └── babel.config.js
│   │
│   ├── web-local/              # 🏪 App Local (Next.js / React)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── styles/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.js
│   │   └── tailwind.config.js
│   │
│   └── web-admin/              # ⚙️ Panel Admin (Next.js)
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   ├── hooks/
│       │   └── styles/
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.js
│       └── tailwind.config.js
│
├── .github/                     # 🔧 GitHub Actions
│   └── workflows/
│       ├── ci.yml              # CI para todas las apps
│       └── deploy.yml           # Deploy (cuando sea necesario)
│
└── scripts/                    # 🛠️ Scripts de utilidad
    ├── setup.sh                # Setup inicial del proyecto
    ├── db-migrate.sh            # Migraciones de BD
    └── deploy.sh                # Scripts de deploy
```

---

## 🔧 Configuración del Monorepo

### Estructura Actual: Dependencias Independientes

**Cada app tiene sus propias dependencias** instaladas en su propia carpeta:

- ✅ **Sin workspaces:** Cada app es independiente
- ✅ **Sin conflictos:** No hay mezcla de versiones entre apps
- ✅ **Más simple:** Instalación directa en cada carpeta
- ✅ **Más control:** Cada app gestiona sus propias dependencias

**Instalación:**
```bash
# Instalar en cada app individualmente
cd apps/backend && npm install
cd apps/mobile-client && npm install
# etc.
```

**O usar scripts desde la raíz:**
```bash
npm run install:all  # Instala todas las apps
```

---

## 📦 Gestión de Dependencias Compartidas

### Tipos TypeScript Compartidos

```typescript
// packages/shared/src/types/order.ts
export interface Order {
  id: string;
  clientId: string;
  businessId: string;
  status: OrderStatus;
  totalAmount: number;
  // ...
}

// packages/shared/src/types/index.ts
export * from './order';
export * from './user';
export * from './product';
```

**Uso en apps:**
```typescript
// apps/mobile-client/src/screens/Orders.tsx
import { Order, OrderStatus } from '@localia/shared/types';
```

### Utilidades Compartidas

```typescript
// packages/shared/src/utils/format.ts
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
};
```

---

## 🚀 Scripts de Desarrollo

### Desarrollo Local

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

# Terminal 4: App Local (Web)
cd apps/web-local
npm run dev

# Terminal 5: Panel Admin
cd apps/web-admin
npm run dev
```

### Con Workspaces (Más Eficiente)

```bash
# Desde la raíz del proyecto
pnpm dev:backend      # Inicia backend
pnpm dev:client       # Inicia app cliente
pnpm dev:repartidor   # Inicia app repartidor
pnpm dev:local        # Inicia app local
pnpm dev:admin        # Inicia panel admin
```

---

## 🔄 Migración Futura a Multi-Repo

Si en el futuro necesitas separar en repos individuales:

1. **Backend:** `localia-backend` (repo independiente)
2. **Mobile Apps:** `localia-mobile` (Cliente + Repartidor juntos, o separados)
3. **Web Apps:** `localia-web` (Local + Admin juntos, o separados)
4. **Shared:** `localia-shared` (paquete npm privado o submodule)

**Ventaja del monorepo:** La migración es fácil porque ya tienes todo separado en carpetas.

---

## 📋 Checklist de Setup

- [ ] Crear estructura de carpetas
- [ ] Configurar workspaces (pnpm/yarn)
- [ ] Setup de cada app individual
- [ ] Configurar paquete `shared` con tipos y utilidades
- [ ] Configurar CI/CD básico
- [ ] Documentar scripts de desarrollo
- [ ] Configurar variables de entorno compartidas

---

## 🎯 Recomendación Final

**Para el MVP con un solo desarrollador:**
- ✅ **Usar monorepo** con estructura clara
- ✅ **Workspaces** para gestión de dependencias
- ✅ **Paquete `shared`** para código común
- ✅ **Separación clara** en carpetas `apps/` y `packages/`
- ✅ **Documentar bien** la estructura desde el inicio

**Cuando el equipo crezca:**
- Considerar herramientas como **Nx** o **Turborepo** para optimización
- O migrar a multi-repo si es necesario

---

**Última actualización:** Noviembre 2024

