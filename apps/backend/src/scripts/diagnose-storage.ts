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
  console.log('\n🔍 DIAGNÓSTICO DE SUPABASE STORAGE\n');
  console.log('='.repeat(60));

  // 1. Verificar variables de entorno
  console.log('\n1️⃣ VERIFICANDO VARIABLES DE ENTORNO:');
  console.log('   SUPABASE_URL:', supabaseUrl ? `✅ ${supabaseUrl.substring(0, 40)}...` : '❌ NO CONFIGURADO');
  console.log('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? `✅ Configurado (${supabaseServiceRoleKey.length} caracteres)` : '❌ NO CONFIGURADO');
  console.log('   SUPABASE_STORAGE_BUCKET_PRODUCTS:', bucketName);

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('\n❌ ERROR: Faltan variables de entorno necesarias');
    console.error('   Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en tu archivo .env');
    process.exit(1);
  }

  // 2. Crear cliente de Supabase
  console.log('\n2️⃣ CREANDO CLIENTE DE SUPABASE...');
  let supabaseAdmin;
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    console.log('   ✅ Cliente creado exitosamente');
  } catch (error: any) {
    console.error('   ❌ Error creando cliente:', error.message);
    process.exit(1);
  }

  // 3. Verificar que el cliente tiene acceso a Storage
  console.log('\n3️⃣ VERIFICANDO ACCESO A STORAGE...');
  if (!supabaseAdmin.storage) {
    console.error('   ❌ El cliente no tiene acceso a Storage');
    process.exit(1);
  }
  console.log('   ✅ Cliente tiene acceso a Storage');

  // 4. Listar todos los buckets disponibles
  console.log('\n4️⃣ LISTANDO BUCKETS DISPONIBLES...');
  try {
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
  
    if (bucketsError) {
      console.error('   ❌ Error listando buckets:', bucketsError.message);
      console.error('   Detalles:', JSON.stringify(bucketsError, null, 2));
    } else {
      console.log(`   ✅ Se encontraron ${buckets?.length || 0} buckets:`);
      buckets?.forEach((bucket: any) => {
        const isTarget = bucket.name === bucketName;
        console.log(`      ${isTarget ? '🎯' : '  '} ${bucket.name} (${bucket.public ? 'público' : 'privado'})`);
      });
      
      const targetBucket = buckets?.find((b: any) => b.name === bucketName);
      if (!targetBucket) {
        console.error(`\n   ❌ El bucket '${bucketName}' NO existe`);
        console.error('   💡 SOLUCIÓN: Crea el bucket desde el Dashboard de Supabase o ejecuta el script SQL:');
        console.error('      database/create_and_configure_products_bucket.sql');
      } else {
        console.log(`\n   ✅ El bucket '${bucketName}' existe`);
        console.log(`      - Público: ${targetBucket.public ? 'Sí' : 'No'}`);
        console.log(`      - Creado: ${targetBucket.created_at || 'N/A'}`);
      }
    }
  } catch (error: any) {
    console.error('   ❌ Error inesperado:', error.message);
  }

  // 5. Intentar acceder al bucket específico
  console.log(`\n5️⃣ INTENTANDO ACCEDER AL BUCKET '${bucketName}'...`);
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
      console.log('   ✅ Acceso al bucket exitoso');
      console.log(`      - Archivos encontrados: ${files?.length || 0}`);
    }
  } catch (error: any) {
    console.error('   ❌ Error inesperado accediendo al bucket:', error.message);
  }

  // 6. Verificar políticas RLS (si es posible)
  console.log('\n6️⃣ RESUMEN:');
  console.log('   Para verificar las políticas RLS, ejecuta en SQL:');
  console.log('   SELECT * FROM storage.buckets WHERE id = \'products\';');
  console.log('   SELECT * FROM pg_policies WHERE schemaname = \'storage\' AND tablename = \'objects\';');

  console.log('\n' + '='.repeat(60));
  console.log('✅ DIAGNÓSTICO COMPLETADO\n');
}

// Ejecutar diagnóstico
diagnoseStorage().catch(console.error);
