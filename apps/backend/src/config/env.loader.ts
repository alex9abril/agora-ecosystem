/**
 * Cargador de variables de entorno
 * 
 * Este archivo debe importarse ANTES de cualquier otro módulo
 * que use variables de entorno (como supabase.config.ts)
 */
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
    result = dotenv.config({ path: envPath });
    break;
  }
}

// Si no se encontró ningún .env, intentar cargar desde la ruta por defecto
if (!envPath) {
  envPath = path.resolve(__dirname, '../.env');
  result = dotenv.config({ path: envPath });
}

// Logs de debug
if (process.env.NODE_ENV !== 'production') {
  if (result?.error) {
    console.warn('⚠️  No se pudo cargar .env desde:', envPath);
    console.warn('   Error:', result.error.message);
    console.warn('   Rutas intentadas:', possiblePaths);
  } else {
    console.log('✅ Variables de entorno cargadas desde:', envPath);
    console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Configurado' : '❌ Faltante');
    console.log('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Faltante');
    console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurado' : '❌ Faltante');
  }
}

