/**
 * Utilidades para trabajar con Supabase Storage
 */

/**
 * Normaliza un file_path que puede contener una URL completa o solo la ruta relativa
 * Extrae solo la ruta relativa del bucket para usar con getPublicUrl()
 * 
 * @param filePath - Ruta del archivo que puede ser una URL completa o ruta relativa
 * @returns Ruta relativa normalizada o null si no se puede normalizar
 */
export function normalizeStoragePath(filePath: string | null | undefined): string | null {
  if (!filePath) return null;
  
  // Si ya es una ruta relativa (no empieza con http), retornarla tal cual
  if (!filePath.startsWith('http')) {
    return filePath;
  }
  
  // PRIORIDAD 1: Intentar extraer el patrón UUID/filename directamente (más confiable)
  // Buscar el patrón: /[product_id]/[image_filename] en cualquier parte de la URL
  // Este patrón funciona incluso si la URL está duplicada o truncada
  // Usar un patrón más específico que capture UUID seguido de / y luego el nombre del archivo
  const uuidFilenameMatch = filePath.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^\/\?\s"']+\.(jpg|jpeg|png|webp|gif|svg))/i);
  if (uuidFilenameMatch) {
    const extracted = uuidFilenameMatch[1];
    // Verificar que el path extraído tenga el formato correcto (UUID/filename)
    if (extracted.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^\/\?\s"']+\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
      return extracted;
    }
  }
  
  // PRIORIDAD 1.5: Si no encontró con extensión, buscar sin extensión (para casos donde el path termina sin extensión)
  const uuidFilenameMatchNoExt = filePath.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^\/\?\s"']+)/i);
  if (uuidFilenameMatchNoExt) {
    const extracted = uuidFilenameMatchNoExt[1];
    // Verificar que el path extraído tenga el formato correcto (UUID/filename)
    if (extracted.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^\/\?\s"']+/i)) {
      return extracted;
    }
  }
  
  // PRIORIDAD 2: URL duplicada/incrustada (caso común)
  // Formato: https://[project].supabase.co/storage/v1/object/public/https://[project].storage.supabase.co/storage/v1/s3/[path]
  // Extraer la URL interna y normalizarla recursivamente
  const innerUrlMatch = filePath.match(/https?:\/\/[^\/]+\/storage\/v1\/(?:object\/public|s3)\/[^\/]+\/(https?:\/\/.+)$/);
  if (innerUrlMatch) {
    // Recursivamente normalizar la URL interna
    return normalizeStoragePath(innerUrlMatch[1]);
  }
  
  // PRIORIDAD 3: URL de Supabase Storage (s3) - extraer path después de /s3/
  // Formato: https://[project].storage.supabase.co/storage/v1/s3/[bucket]/[path]
  const s3Match = filePath.match(/\/storage\/v1\/s3\/[^\/]+\/(.+?)(?:\?|$)/);
  if (s3Match) {
    const extractedPath = s3Match[1];
    // Si el path extraído todavía contiene una URL completa, intentar extraer de nuevo
    if (extractedPath.startsWith('http')) {
      return normalizeStoragePath(extractedPath);
    }
    // Verificar que el path extraído tenga el formato UUID/filename
    if (extractedPath.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i)) {
      return extractedPath;
    }
  }
  
  // PRIORIDAD 4: URL estándar de Supabase Storage (object/public)
  // Formato: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
  const objectPublicMatch = filePath.match(/\/storage\/v1\/object\/public\/[^\/]+\/(.+?)(?:\?|$)/);
  if (objectPublicMatch) {
    const extractedPath = objectPublicMatch[1];
    // Si el path extraído todavía contiene una URL completa, intentar extraer de nuevo
    if (extractedPath.startsWith('http')) {
      return normalizeStoragePath(extractedPath);
    }
    // Verificar que el path extraído tenga el formato UUID/filename
    if (extractedPath.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i)) {
      return extractedPath;
    }
  }
  
  // PRIORIDAD 5: Intentar extraer path después de /products/
  // Formato: .../products/[path]
  const productsMatch = filePath.match(/\/products\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^\/\?\s"']+)/i);
  if (productsMatch) {
    return productsMatch[1];
  }
  
  // Si no se puede normalizar, retornar null y loguear warning con el path completo
  console.warn('⚠️ [normalizeStoragePath] No se pudo normalizar el file_path:', {
    filePath: filePath.substring(0, 200) + (filePath.length > 200 ? '...' : ''),
    length: filePath.length,
  });
  return null;
}

