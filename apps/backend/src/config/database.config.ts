// IMPORTANTE: Cargar variables de entorno ANTES de usarlas
import './env.loader';
import { Pool, PoolConfig } from 'pg';

/**
 * Configuración de conexión directa a PostgreSQL
 * 
 * Se usa para acceder a tablas en schemas que PostgREST no expone (como 'core')
 * o para consultas complejas que requieren SQL directo.
 */

// Obtener DATABASE_URL original
let databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

// Si DATABASE_URL tiene corchetes, extraer la contraseña y reconstruir
// El formato puede ser:
// - postgresql://postgres:[PASSWORD]@host:port/db (con corchetes)
// - postgresql://postgres.[PROJECT_REF]:[PASSWORD]@host:port/db (pooler con corchetes)
if (databaseUrl && databaseUrl.includes('[') && databaseUrl.includes(']')) {
  // Intentar match para formato estándar: postgresql://postgres:[PASSWORD]@...
  let match = databaseUrl.match(/postgresql:\/\/([^:]+):\[([^\]]+)\]@(.+)/);
  
  if (match) {
    const user = match[1]; // Puede ser "postgres" o "postgres.PROJECT_REF"
    const password = match[2];
    const rest = match[3];
    const host = rest.split(':')[0];
    const port = rest.split(':')[1]?.split('/')[0] || '5432';
    const database = rest.split('/')[1] || 'postgres';
    
    // Reconstruir URL sin corchetes
    databaseUrl = `postgresql://${user}:${password}@${host}:${port}/${database}`;
  } else if (databaseUrl.includes('[password]')) {
    // Si tiene el placeholder [password], intentar construir desde otras variables
    console.warn('⚠️  DATABASE_URL tiene placeholder [password], intentando construir desde variables...');
    databaseUrl = null; // Forzar construcción
  } else {
    console.warn('⚠️  DATABASE_URL tiene corchetes pero no coincide con el formato esperado');
    console.warn('   URL original:', databaseUrl.replace(/:[^:@]+@/, ':****@'));
  }
}

/**
 * Pool: timeouts y tamaño configurables por entorno.
 * - connectionTimeoutMillis demasiado bajo (p. ej. 2s) provoca "Connection terminated due to connection timeout"
 *   cuando hay cola en el pool (N+1 / muchas peticiones concurrentes) o red lenta hacia Supabase.
 * - idleTimeoutMillis: el pooler de Supabase puede cerrar conexiones inactivas; 60s suele ser más estable.
 */
const poolMaxRaw = parseInt(process.env.PG_POOL_MAX || '20', 10);
const poolMax = Number.isFinite(poolMaxRaw) ? Math.min(50, Math.max(5, poolMaxRaw)) : 20;
const idleMsRaw = parseInt(process.env.PG_IDLE_TIMEOUT_MS || '60000', 10);
const connTimeoutRaw = parseInt(process.env.PG_CONNECTION_TIMEOUT_MS || '30000', 10);

const dbConfig: PoolConfig = {
  connectionString: databaseUrl,
  // Supabase requiere SSL para conexiones directas
  ssl: {
    rejectUnauthorized: false, // Supabase usa certificados autofirmados
  },
  max: poolMax,
  idleTimeoutMillis: Number.isFinite(idleMsRaw) ? idleMsRaw : 60000,
  connectionTimeoutMillis: Number.isFinite(connTimeoutRaw) ? connTimeoutRaw : 30000,
};

// Si no hay DATABASE_URL pero hay SUPABASE_URL, intentar construir la URL
if (!dbConfig.connectionString && process.env.SUPABASE_URL) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  
  if (dbPassword) {
    // Construir URL de conexión usando el pooler de Supabase (más confiable)
    // Formato: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
    // O formato directo: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
    const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (projectRef) {
      // Intentar primero con el pooler (puerto 6543) - más confiable
      // El formato del pooler es: postgres.[PROJECT_REF]@aws-0-[REGION].pooler.supabase.com:6543
      // Pero necesitamos la región. Por ahora, usemos el formato directo que debería funcionar
      dbConfig.connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;
    }
  }
}

/**
 * Pool de conexiones a PostgreSQL
 * 
 * Se crea solo si hay DATABASE_URL configurada
 */
export const dbPool: Pool | null = dbConfig.connectionString
  ? new Pool(dbConfig)
  : null;

// Logs de debug
if (process.env.NODE_ENV !== 'production') {
  if (dbPool) {
    const maskedUrl = dbConfig.connectionString?.replace(/:[^:@]+@/, ':****@') || 'N/A';
    
    // Extraer y mostrar el hostname para verificación
    const hostMatch = dbConfig.connectionString?.match(/@([^:]+):/);
    if (hostMatch) {
    }
  } else {
    console.warn('⚠️  Pool de PostgreSQL NO creado');
    console.warn('   DATABASE_URL:', process.env.DATABASE_URL ? 'Configurado' : '❌ NO configurado');
    console.warn('   SUPABASE_DB_URL:', process.env.SUPABASE_DB_URL ? 'Configurado' : '❌ NO configurado');
    console.warn('   dbConfig.connectionString:', dbConfig.connectionString ? 'Tiene valor' : '❌ NULL');
    if (dbConfig.connectionString) {
      const hostMatch = dbConfig.connectionString.match(/@([^:]+):/);
      if (hostMatch) {
        console.warn('   Hostname detectado:', hostMatch[1]);
      }
    }
  }
}

// Manejar errores del pool
if (dbPool) {
  dbPool.on('error', (err) => {
    console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
  });
  
  // Probar conexión al iniciar
  dbPool.query('SELECT NOW()')
    .then(() => {
    })
    .catch((err) => {
      console.error('❌ Error al verificar conexión a PostgreSQL:', err.message);
      if (err.code === 'ENOTFOUND' || err.message.includes('getaddrinfo')) {
        console.error('');
        console.error('🔧 SOLUCIÓN: El hostname no se puede resolver.');
        console.error('   Esto generalmente significa que necesitas usar el POOLER de Supabase en lugar de la conexión directa.');
        console.error('');
        console.error('   Pasos para obtener la URL correcta:');
        console.error('   1. Ve a: https://app.supabase.com/project/[tu-proyecto]/settings/database');
        console.error('   2. En "Connection string", selecciona "Connection pooling" (NO "Direct connection")');
        console.error('   3. Copia la URL que se muestra');
        console.error('   4. Actualiza DATABASE_URL en tu archivo .env con esa URL');
        console.error('');
        console.error('   Formato esperado del pooler:');
        console.error('   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres');
        console.error('');
      } else if (err.message.includes('password authentication failed')) {
        console.error('');
        console.error('🔧 SOLUCIÓN: Error de autenticación con la contraseña.');
        console.error('   Posibles causas:');
        console.error('   1. La contraseña en DATABASE_URL es incorrecta');
        console.error('   2. Los corchetes [PASSWORD] no se están removiendo correctamente');
        console.error('   3. La contraseña tiene caracteres especiales que necesitan ser codificados');
        console.error('');
        console.error('   Verifica:');
        console.error('   - Que la contraseña en .env sea correcta (sin corchetes o con corchetes, el código los remueve)');
        console.error('   - Que la contraseña no tenga espacios al inicio o final');
        console.error('   - Que estés usando la contraseña correcta del proyecto Supabase');
        console.error('');
        console.error('   Para obtener la contraseña correcta:');
        console.error('   1. Ve a: https://app.supabase.com/project/[tu-proyecto]/settings/database');
        console.error('   2. Busca "Database password" o "Reset database password"');
        console.error('   3. Si no la recuerdas, puedes resetearla');
        console.error('');
      }
    });
}

export default dbPool;

