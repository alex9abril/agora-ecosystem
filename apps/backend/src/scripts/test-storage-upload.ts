/**
 * Script de prueba para verificar acceso a Supabase Storage
 * 
 * Ejecutar con: npx ts-node src/scripts/test-storage-upload.ts
 */

import '../config/env.loader';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = 'products';


if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testStorage() {
  try {
    // 1. Listar todos los buckets
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listando buckets:', bucketsError.message);
      return;
    }
    
    buckets?.forEach((bucket: any) => {
      const isTarget = bucket.name === bucketName;
    });
    
    const targetBucket = buckets?.find((b: any) => b.name === bucketName);
    
    if (!targetBucket) {
      console.error(`\n❌ El bucket '${bucketName}' NO existe`);
      console.error('\n💡 SOLUCIÓN:');
      console.error('   1. Ve al Dashboard de Supabase → Storage → Buckets');
      console.error('   2. Haz clic en "New bucket"');
      console.error(`   3. Nombre: ${bucketName}`);
      console.error('   4. Marca "Public bucket"');
      console.error('   5. Haz clic en "Create bucket"');
      return;
    }
    
    
    // 2. Intentar listar archivos (prueba de acceso)
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from(bucketName)
      .list('', {
        limit: 5,
      });
    
    if (listError) {
      const errorStatus = (listError as any).statusCode || (listError as any).status || 'unknown';
      console.error('❌ Error accediendo al bucket:', listError.message);
      console.error('   Código:', errorStatus);
      console.error('\n💡 Esto indica un problema con las políticas RLS');
      console.error('   Ejecuta: database/fix_products_policies_with_service_role.sql');
      return;
    }
    
    
    // 3. Intentar subir un archivo de prueba
    const testContent = Buffer.from('test file content');
    const testPath = 'test/test-file.txt';
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(testPath, testContent, {
        contentType: 'text/plain',
        upsert: true,
      });
    
    if (uploadError) {
      const errorStatus = (uploadError as any).statusCode || (uploadError as any).status || 'unknown';
      console.error('❌ Error subiendo archivo:', uploadError.message);
      console.error('   Código:', errorStatus);
      console.error('\n💡 Esto indica un problema con las políticas RLS de INSERT');
      console.error('   Ejecuta: database/fix_products_policies_with_service_role.sql');
      return;
    }
    
    
    // 4. Eliminar el archivo de prueba
    const { error: deleteError } = await supabaseAdmin.storage
      .from(bucketName)
      .remove([testPath]);
    
    if (deleteError) {
      console.warn('⚠️  Error eliminando archivo de prueba:', deleteError.message);
    } else {
    }
    
    
  } catch (error: any) {
    console.error('❌ Error inesperado:', error.message);
    console.error(error);
  }
}

testStorage();

