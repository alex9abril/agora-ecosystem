/**
 * Script de diagnóstico para Supabase Storage
 * 
 * Ejecutar con: npx ts-node src/scripts/diagnose-storage.ts
 */

import '../config/env.loader';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET_PRODUCTS || 'products';

async function diagnoseStorage() {

  // 1. Verificar variables de entorno

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('\n❌ ERROR: Faltan variables de entorno necesarias');
    console.error('   Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en tu archivo .env');
    process.exit(1);
  }

  // 2. Crear cliente de Supabase
  let supabaseAdmin;
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch (error: any) {
    console.error('   ❌ Error creando cliente:', error.message);
    process.exit(1);
  }

  // 3. Verificar que el cliente tiene acceso a Storage
  if (!supabaseAdmin.storage) {
    console.error('   ❌ El cliente no tiene acceso a Storage');
    process.exit(1);
  }

  // 4. Listar todos los buckets disponibles
  try {
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
  
    if (bucketsError) {
      console.error('   ❌ Error listando buckets:', bucketsError.message);
      console.error('   Detalles:', JSON.stringify(bucketsError, null, 2));
    } else {
      buckets?.forEach((bucket: any) => {
        const isTarget = bucket.name === bucketName;
      });
      
      const targetBucket = buckets?.find((b: any) => b.name === bucketName);
      if (!targetBucket) {
        console.error(`\n   ❌ El bucket '${bucketName}' NO existe`);
        console.error('   💡 SOLUCIÓN: Crea el bucket desde el Dashboard de Supabase o ejecuta el script SQL:');
        console.error('      database/create_and_configure_products_bucket.sql');
      } else {
      }
    }
  } catch (error: any) {
    console.error('   ❌ Error inesperado:', error.message);
  }

  // 5. Intentar acceder al bucket específico
  try {
    // Intentar listar archivos (aunque esté vacío)
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from(bucketName)
      .list('', {
        limit: 1,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (listError) {
      const errorStatus = (listError as any).statusCode || (listError as any).status || 'unknown';
      console.error('   ❌ Error accediendo al bucket:', listError.message);
      console.error('   Código de error:', errorStatus);
      console.error('   Detalles:', JSON.stringify(listError, null, 2));
      
      if (listError.message?.includes('not found') || errorStatus === 404 || errorStatus === '404') {
        console.error('\n   💡 SOLUCIÓN:');
        console.error('      1. Verifica que el bucket existe en el Dashboard de Supabase');
        console.error('      2. Ejecuta el script SQL: database/create_and_configure_products_bucket.sql');
        console.error('      3. Verifica las políticas RLS con: database/verify_bucket_exists.sql');
      } else if (listError.message?.includes('permission') || listError.message?.includes('policy')) {
        console.error('\n   💡 SOLUCIÓN:');
        console.error('      El bucket existe pero las políticas RLS no permiten acceso con service_role');
        console.error('      Ejecuta el script SQL: database/fix_products_policies_exact_match.sql');
      }
    } else {
    }
  } catch (error: any) {
    console.error('   ❌ Error inesperado accediendo al bucket:', error.message);
  }

  // 6. Verificar políticas RLS (si es posible)

}

// Ejecutar diagnóstico
diagnoseStorage().catch(console.error);
