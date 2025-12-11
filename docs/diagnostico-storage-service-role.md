# Diagnóstico: Problema con service_role en Supabase Storage

## Problema Observado

Las políticas RLS se crean correctamente con `service_role` en la lista de roles, pero al verificar, solo muestran `{public}`. Esto sugiere que:

1. **Supabase Storage puede estar ignorando las políticas RLS para service_role**
2. **El problema puede estar en cómo se está autenticando el cliente**
3. **Puede haber un problema con el bucket mismo**

## Posibles Causas

### 1. El bucket no existe realmente
Aunque el SQL dice que se creó, puede que no esté disponible en Storage.

**Solución**: Crear el bucket manualmente desde el Dashboard de Supabase.

### 2. El cliente de Supabase no está usando service_role correctamente
Aunque `supabaseAdmin` está configurado con `SUPABASE_SERVICE_ROLE_KEY`, puede que no se esté usando correctamente para Storage.

**Verificación**: Revisar los logs del backend para ver qué key se está usando.

### 3. Supabase Storage requiere configuración especial
Storage puede tener requisitos diferentes a las tablas de base de datos.

## Soluciones Alternativas

### Opción 1: Deshabilitar RLS temporalmente (SOLO PARA DESARROLLO)

```sql
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

**⚠️ ADVERTENCIA**: Esto deshabilita RLS completamente. Solo para desarrollo.

### Opción 2: Verificar que el bucket existe en el Dashboard

1. Ve al Dashboard de Supabase
2. Storage → Verifica que el bucket `products` existe
3. Si no existe, créalo manualmente
4. Marca "Public bucket"

### Opción 3: Usar el cliente de Storage directamente

En lugar de usar `supabaseAdmin.storage`, intentar usar el cliente de Storage directamente con el service_role key.

## Verificación del Cliente

Revisar en `apps/backend/src/config/supabase.config.ts`:

```typescript
export const supabaseAdmin: SupabaseClient | null = supabaseUrl && supabaseServiceRoleKey
  ? createClient(
      supabaseUrl,
      supabaseServiceRoleKey,  // ← Verificar que esto está correcto
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  : null;
```

## Próximos Pasos

1. Verificar que el bucket existe en el Dashboard
2. Verificar que `SUPABASE_SERVICE_ROLE_KEY` está correctamente configurado
3. Revisar los logs del backend para ver qué error exacto está ocurriendo
4. Si todo lo anterior está correcto, considerar deshabilitar RLS temporalmente para Storage

