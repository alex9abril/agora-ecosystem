# Importación de catálogo de productos y compatibilidades (AGORA)

Script para importar productos desde `productos.csv` y compatibilidades desde `compatibilidades.csv` a la base de datos AGORA (Supabase/PostgreSQL): `catalog.products`, `catalog.vehicle_variants` y `catalog.product_vehicle_compatibility`.

## Requisitos

- Node.js 18+
- Base de datos con la migración **radical** de compatibilidades aplicada: `database/agora/migration_vehicle_variants_and_compat_radical.sql` (crea `vehicle_variants` y la nueva `product_vehicle_compatibility` por `vehicle_variant_id`).
- Variables de entorno: `BUSINESS_ID`, `DATABASE_URL`

## Variables de entorno

| Variable          | Obligatorio | Descripción |
|-------------------|------------|-------------|
| `BUSINESS_ID`     | Sí         | UUID del negocio al que importar (productos y compatibilidades se asocian a este negocio). |
| `DATABASE_URL`    | Sí         | Cadena de conexión PostgreSQL (ej. la de `apps/backend/.env`). |
| `PRODUCTOS_CSV`   | No         | Ruta a `productos.csv`. Por defecto: `assets/catalogos/productos.csv`. |
| `COMPAT_CSV`      | No         | Ruta a `compatibilidades.csv`. Por defecto: `assets/catalogos/compatibilidades.csv`. |
| `DRY_RUN`         | No         | Si es `1`, no escribe en la BD; solo conecta, lee CSVs y muestra resumen. |
| `DOTENV_CONFIG_PATH` | No      | Ruta al `.env` (ej. `../apps/backend/.env`) para cargar `DATABASE_URL`. |

## Orden de ejecución (estructura radical)

1. **Una sola vez: ejecutar la migración** (crea `vehicle_variants` y la nueva `product_vehicle_compatibility`):
   ```bash
   # Desde la raíz del repo
   DOTENV_CONFIG_PATH=apps/backend/.env node scripts/run-migration-vehicle-variants.js
   ```
   O desde Supabase: SQL Editor → pegar y ejecutar el contenido de `database/agora/migration_vehicle_variants_and_compat_radical.sql`.

2. **Importar productos y compatibilidades:**
   ```bash
   cd scripts
   DOTENV_CONFIG_PATH=../apps/backend/.env BUSINESS_ID='TU-UUID-NEGOCIO' node import-catalog.js
   ```

## Cómo ejecutar

### Opción 1: Desde la raíz del repo (cargando .env del backend)

```bash
cd scripts
npm install   # solo la primera vez
# Reemplaza TU-UUID-AQUI por el UUID real de tu negocio (ej. a1b2c3d4-e5f6-7890-abcd-ef1234567890)
DOTENV_CONFIG_PATH=../apps/backend/.env BUSINESS_ID='TU-UUID-AQUI' node -r dotenv/config import-catalog.js
```

### Opción 2: Desde la carpeta `scripts` con .env en `scripts/`

Copia o enlaza `apps/backend/.env` a `scripts/.env` (o crea `scripts/.env` con `DATABASE_URL` y opcionalmente `BUSINESS_ID`), luego:

```bash
cd scripts
npm install
BUSINESS_ID='TU-UUID-AQUI' node import-catalog.js
```

El script carga `.env` desde `DOTENV_CONFIG_PATH` o desde `apps/backend/.env` por defecto.

### Dry run (solo simulación)

No inserta ni actualiza nada en la BD; solo conecta, lee los CSV y muestra contadores:

```bash
cd scripts
DRY_RUN=1 DOTENV_CONFIG_PATH=../apps/backend/.env BUSINESS_ID='TU-UUID-AQUI' node -r dotenv/config import-catalog.js
```

## Comportamiento

1. **Productos**  
   Por cada fila de `productos.csv`:  
   - Si ya existe un producto con el mismo `business_id` y `sku`: actualiza `description` y `name`.  
   - Si no existe: inserta un nuevo producto (`name`, `sku`, `price` desde `sale_price`, `description`, `image_url` desde `image_1_url`, etc.).

2. **Compatibilidades (estructura radical)**  
   - **Variantes:** Extrae del CSV combinaciones únicas de `(make, model, year, body_trim, engine_transmission)` y las inserta en `catalog.vehicle_variants` (sin duplicar). **Scion** se normaliza a **Toyota**.  
   - **Universal:** Si `year`, `make` y `model` están vacíos en una fila, se inserta una compatibilidad **universal** (`is_universal = TRUE`, `vehicle_variant_id = NULL`) para ese producto (una sola por producto).  
   - **Específica:** Para el resto, se asocia cada producto a la variante correspondiente en `product_vehicle_compatibility` (`product_id`, `vehicle_variant_id`, `is_universal = FALSE`). Los cinco campos (year, make, model, body_trim, engine_transmission) quedan en la variante, no en `notes`.  
   - Idempotente: se evitan duplicados en variantes y en compatibilidades (ON CONFLICT DO NOTHING).

## Resumen de salida

Al final el script imprime algo como:

- Productos: actualizados, insertados, omitidos (sin SKU).
- Compatibilidades: insertadas, universales, omitidas (SKU no encontrado), duplicadas (ya existían).

## Troubleshooting

### "password authentication failed for user postgres"

El script se conecta con **PostgreSQL** usando `DATABASE_URL` del `.env`. Ese error suele significar:

1. **Revisa `DATABASE_URL`** en `apps/backend/.env`. Debe ser la cadena de conexión de tu proyecto Supabase.
2. **Obtén la URL correcta en Supabase:**  
   [Dashboard](https://app.supabase.com) → tu proyecto → **Project Settings** → **Database** → **Connection string**.  
   Elige **URI** y copia la cadena (modo "Session" o "Transaction").
3. **Usuario en Supabase:** Si usas el pooler (puerto 6543), el usuario suele ser `postgres.PROJECT_REF`, no solo `postgres`. La contraseña es la que definiste para el proyecto (o la que aparece en "Database password" en esa misma pantalla).
4. Asegúrate de que no haya espacios ni comillas de más en `DATABASE_URL` en el `.env`.

Ejemplo de formato (sustituye por tus valores reales):

```bash
DATABASE_URL=postgresql://postgres.PROJECT_REF:TU_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
```

## Estructura radical de compatibilidades (vehicle_variants)

La compatibilidad de **productos** con vehículos ya **no** usa `vehicle_brands`, `vehicle_models`, `vehicle_years` ni `vehicle_specs`. Usa:

- **`catalog.vehicle_variants`**: una fila por combinación única de `make`, `model`, `year`, `body_trim`, `engine_transmission` (como en el CSV).
- **`catalog.product_vehicle_compatibility`**: columnas `product_id`, `vehicle_variant_id` (NULL si universal), `is_universal`. Sin `vehicle_spec_id` ni jerarquía brand/model/year.

**Migración (una vez):** ejecutar en Supabase:

- `database/agora/migration_vehicle_variants_and_compat_radical.sql`

Luego ejecutar el script de importación como de costumbre; él construye las variantes desde el CSV y asocia producto ↔ variante. La UI puede listar compatibilidades con los cinco campos usando la vista `catalog.product_vehicle_compatibility_detail` (JOIN con `vehicle_variants`).

Las tablas `vehicle_brands`, `vehicle_models`, `vehicle_years`, `vehicle_specs` se mantienen para `core.user_vehicles` y `catalog.business_vehicle_brands`; solo la compatibilidad de productos pasó a `vehicle_variants`.

## Notas

- El script usa el schema `catalog` y las tablas `catalog.products`, `catalog.vehicle_variants` y `catalog.product_vehicle_compatibility`.  
- Es idempotente en productos (mismo SKU → update), en variantes (por clave única) y en compatibilidades (ON CONFLICT DO NOTHING).
