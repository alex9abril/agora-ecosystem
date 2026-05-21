/**
 * Cargador de variables de entorno
 * 
 * Este archivo debe importarse ANTES de cualquier otro módulo
 * que use variables de entorno (como supabase.config.ts)
 */
import * as nodeCrypto from 'crypto';

// @nestjs/schedule llama a crypto.randomUUID() sin import (asume global como en Node 19+).
// En Node 18.x globalThis.crypto no expone el módulo completo → ReferenceError al arrancar.
const g = globalThis as typeof globalThis & { crypto?: { randomUUID?: () => string } };
if (typeof g.crypto?.randomUUID !== 'function') {
  Object.assign(globalThis, { crypto: nodeCrypto });
}

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Intentar múltiples rutas posibles para el .env
// En desarrollo (TypeScript): __dirname = apps/backend/src/config
// En producción (compilado): __dirname = apps/backend/dist/config
// También intentar desde la raíz del proyecto
const possiblePaths = [
  path.resolve(__dirname, '../.env'),           // apps/backend/.env (desde src/config o dist/config)
  path.resolve(__dirname, '../../.env'),         // apps/.env (fallback)
  path.resolve(process.cwd(), '.env'),           // Desde donde se ejecuta el proceso
  path.resolve(process.cwd(), 'apps/backend/.env'), // Desde raíz del proyecto
];

let envPath: string | null = null;
let result: dotenv.DotenvConfigOutput | null = null;

// Buscar el primer archivo .env que exista
for (const possiblePath of possiblePaths) {
  if (fs.existsSync(possiblePath)) {
    envPath = possiblePath;
    // Primero cargar sin override para respetar variables del entorno (especialmente en producción).
    result = dotenv.config({ path: envPath, override: false });
    // Si después de cargar NO estamos en producción, recargar con override para que el .env
    // gane sobre variables globales del sistema (común en entornos locales).
    if (process.env.NODE_ENV !== 'production') {
      result = dotenv.config({ path: envPath, override: true });
    }
    break;
  }
}

// Si no se encontró ningún .env, intentar cargar desde la ruta por defecto
if (!envPath) {
  envPath = path.resolve(__dirname, '../.env');
  result = dotenv.config({ path: envPath, override: false });
  if (process.env.NODE_ENV !== 'production') {
    result = dotenv.config({ path: envPath, override: true });
  }
}

// Logs de debug
if (process.env.NODE_ENV !== 'production') {
  if (result?.error) {
    console.warn('⚠️  No se pudo cargar .env desde:', envPath);
    console.warn('   Error:', result.error.message);
    console.warn('   Rutas intentadas:', possiblePaths);
  } else {
  }
}

