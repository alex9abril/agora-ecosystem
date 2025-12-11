-- ============================================================================
-- Verificar el estado del bucket 'products' y sus objetos
-- ============================================================================

-- 1. Verificar que el bucket existe
SELECT 
  'ESTADO DEL BUCKET' as tipo,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id = 'products';

-- 2. Contar objetos en el bucket
SELECT 
  'OBJETOS EN EL BUCKET' as tipo,
  COUNT(*) as total_objetos,
  SUM((metadata->>'size')::bigint) as tamaño_total_bytes,
  ROUND(SUM((metadata->>'size')::bigint) / 1024.0 / 1024.0, 2) as tamaño_total_mb
FROM storage.objects
WHERE bucket_id = 'products';

-- 3. Listar algunos objetos (primeros 10)
SELECT 
  'OBJETOS EN EL BUCKET (muestra)' as tipo,
  name as file_path,
  (metadata->>'size')::bigint as tamaño_bytes,
  (metadata->>'mimetype') as tipo_mime,
  created_at
FROM storage.objects
WHERE bucket_id = 'products'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Verificar registros en catalog.product_images
SELECT 
  'REGISTROS EN product_images' as tipo,
  COUNT(*) as total_registros,
  COUNT(CASE WHEN is_active = TRUE THEN 1 END) as registros_activos,
  COUNT(CASE WHEN is_primary = TRUE THEN 1 END) as imagenes_principales
FROM catalog.product_images;

-- 5. Verificar que los file_path en product_images coinciden con objetos en storage
SELECT 
  'VERIFICACIÓN DE COINCIDENCIAS' as tipo,
  COUNT(DISTINCT pi.id) as registros_en_product_images,
  COUNT(DISTINCT o.name) as objetos_en_storage,
  COUNT(DISTINCT CASE WHEN o.name = pi.file_path THEN pi.id END) as coincidencias
FROM catalog.product_images pi
LEFT JOIN storage.objects o ON o.bucket_id = 'products' AND o.name = pi.file_path
WHERE pi.is_active = TRUE;

-- 6. Mostrar productos con imágenes pero sin archivos en storage
SELECT 
  'PRODUCTOS CON IMÁGENES PERO SIN ARCHIVOS' as tipo,
  pi.product_id,
  pi.file_path,
  pi.is_primary,
  CASE 
    WHEN o.name IS NULL THEN '❌ Archivo no encontrado en storage'
    ELSE '✅ Archivo existe'
  END as estado
FROM catalog.product_images pi
LEFT JOIN storage.objects o ON o.bucket_id = 'products' AND o.name = pi.file_path
WHERE pi.is_active = TRUE
  AND o.name IS NULL
LIMIT 10;

-- 7. Verificar políticas RLS
SELECT 
  'POLÍTICAS RLS' as tipo,
  policyname,
  cmd as operacion,
  roles::text as roles_permitidos
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'products_%'
ORDER BY cmd;

-- 8. Resumen final
DO $$
DECLARE
  bucket_exists BOOLEAN;
  bucket_public BOOLEAN;
  total_objects INTEGER;
  total_policies INTEGER;
  total_product_images INTEGER;
BEGIN
  -- Verificar bucket
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'products') INTO bucket_exists;
  
  IF bucket_exists THEN
    SELECT public INTO bucket_public FROM storage.buckets WHERE id = 'products';
    SELECT COUNT(*) INTO total_objects FROM storage.objects WHERE bucket_id = 'products';
  END IF;
  
  -- Contar políticas
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE 'products_%';
  
  -- Contar registros en product_images
  SELECT COUNT(*) INTO total_product_images
  FROM catalog.product_images
  WHERE is_active = TRUE;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN DEL ESTADO DEL BUCKET';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Bucket existe: %', CASE WHEN bucket_exists THEN '✅ SÍ' ELSE '❌ NO' END;
  
  IF bucket_exists THEN
    RAISE NOTICE 'Bucket es público: %', CASE WHEN bucket_public THEN '✅ SÍ' ELSE '❌ NO' END;
    RAISE NOTICE 'Objetos en storage: %', total_objects;
  END IF;
  
  RAISE NOTICE 'Políticas RLS: %', total_policies;
  RAISE NOTICE 'Registros en product_images: %', total_product_images;
  RAISE NOTICE '';
  
  IF bucket_exists AND bucket_public AND total_policies >= 4 THEN
    RAISE NOTICE '✅ BUCKET CONFIGURADO CORRECTAMENTE';
    RAISE NOTICE '';
    RAISE NOTICE 'El bucket está listo para:';
    RAISE NOTICE '- ✅ Leer imágenes existentes';
    RAISE NOTICE '- ✅ Subir nuevas imágenes';
    RAISE NOTICE '- ✅ Actualizar imágenes';
    RAISE NOTICE '- ✅ Eliminar imágenes';
  ELSE
    RAISE WARNING '⚠️  HAY PROBLEMAS CON LA CONFIGURACIÓN';
  END IF;
  RAISE NOTICE '========================================';
END $$;

