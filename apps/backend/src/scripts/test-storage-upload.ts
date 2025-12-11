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

console.log('\n🧪 PRUEBA DE ACCESO A SUPABASE STORAGE\n');
console.log('='.repeat(60));

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
    console.log('\n1️⃣ Listando buckets disponibles...');
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listando buckets:', bucketsError.message);
      return;
    }
    
    console.log(`✅ Se encontraron ${buckets?.length || 0} buckets:`);
    buckets?.forEach((bucket: any) => {
      const isTarget = bucket.name === bucketName;
      console.log(`   ${isTarget ? '🎯' : '  '} ${bucket.name} (${bucket.public ? 'público' : 'privado'})`);
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
    
    console.log(`\n✅ El bucket '${bucketName}' existe`);
    console.log(`   - Público: ${targetBucket.public ? 'Sí' : 'No'}`);
    
    // 2. Intentar listar archivos (prueba de acceso)
    console.log(`\n2️⃣ Intentando acceder al bucket '${bucketName}'...`);
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
    
    console.log(`✅ Acceso al bucket exitoso`);
    console.log(`   - Archivos encontrados: ${files?.length || 0}`);
    
    // 3. Intentar subir un archivo de prueba
    console.log(`\n3️⃣ Intentando subir un archivo de prueba...`);
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
    
    console.log('✅ Archivo subido exitosamente');
    console.log('   Path:', uploadData.path);
    
    // 4. Eliminar el archivo de prueba
    console.log(`\n4️⃣ Eliminando archivo de prueba...`);
    const { error: deleteError } = await supabaseAdmin.storage
      .from(bucketName)
      .remove([testPath]);
    
    if (deleteError) {
      console.warn('⚠️  Error eliminando archivo de prueba:', deleteError.message);
    } else {
      console.log('✅ Archivo de prueba eliminado');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TODAS LAS PRUEBAS PASARON');
    console.log('✅ El bucket está configurado correctamente');
    console.log('✅ Puedes subir imágenes desde el backend\n');
    
  } catch (error: any) {
    console.error('❌ Error inesperado:', error.message);
    console.error(error);
  }
}

testStorage();

