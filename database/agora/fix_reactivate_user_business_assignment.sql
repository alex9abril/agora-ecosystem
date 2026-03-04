-- ============================================================================
-- AGORA ECOSYSTEM - Fix: Reactivar asignación usuario–negocio
-- ============================================================================
-- Descripción: Reactiva la fila en core.business_users para que el usuario
--              alejandro.grijalva@agoramp.mx vuelva a tener acceso al negocio
--              Toyota Insurgentes (GET my-business dejará de devolver 404).
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-03-04
-- ============================================================================

SET search_path TO core, public;

-- Reactivar asignación (estaba is_active = false)
UPDATE core.business_users
SET is_active = TRUE,
    updated_at = CURRENT_TIMESTAMP
WHERE user_id = '96849ad1-8b32-4615-a8c8-d250e71108ea'
  AND business_id = '8c0a92dd-4742-4860-aad1-eba147e49931';

-- Verificación: debe devolver 1 fila con is_active = true
SELECT id, user_id, business_id, role, is_active, updated_at
FROM core.business_users
WHERE user_id = '96849ad1-8b32-4615-a8c8-d250e71108ea'
  AND business_id = '8c0a92dd-4742-4860-aad1-eba147e49931';

-- ============================================================================
-- NOTAS
-- ============================================================================
-- Ejecuta este script en el SQL Editor de Supabase. Después, el usuario podrá
-- acceder a GET /api/businesses/my-business?businessId=8c0a92dd-4742-4860-aad1-eba147e49931
-- sin recibir 404.
-- ============================================================================
