-- ============================================================================
-- CORREGIR ROL DEL USUARIO ADMIN
-- ============================================================================
-- Descripción: Actualiza el rol del usuario admin de 'client' a 'admin'
-- 
-- Problema: El trigger handle_new_user() crea automáticamente perfiles
--           con role = 'client' cuando se crea un usuario en auth.users.
--           Si creaste tu usuario admin después de configurar el trigger,
--           tendrá role = 'client' por defecto.
-- ============================================================================

-- 1. Verificar el rol actual del usuario admin
SELECT 
    up.id,
    au.email,
    up.role,
    up.first_name,
    up.last_name,
    up.is_active
FROM core.user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE au.email = 'alex9abril@gmail.com';

-- 2. Actualizar el rol a 'admin' si está como 'client' u otro rol
UPDATE core.user_profiles
SET role = 'admin'
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'alex9abril@gmail.com'
)
AND role != 'admin';

-- 3. Verificar que se actualizó correctamente
SELECT 
    up.id,
    au.email,
    up.role,
    up.first_name,
    up.last_name,
    up.is_active,
    CASE 
        WHEN up.role = 'admin' THEN '✅ Rol correcto'
        ELSE '❌ Rol incorrecto - ejecuta el UPDATE de arriba'
    END as status
FROM core.user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE au.email = 'alex9abril@gmail.com';

-- ============================================================================
-- NOTA: Si tienes otros usuarios admin, actualiza sus emails en el script
-- ============================================================================

