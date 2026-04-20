-- Asegura que get_superadmin_businesses exponga business_group_id (requerido por
-- web-local /settings/users modal "Invitar usuario" para mapear tiendas tipo group).

DROP FUNCTION IF EXISTS core.get_superadmin_businesses(UUID);

CREATE OR REPLACE FUNCTION core.get_superadmin_businesses(p_superadmin_id UUID)
RETURNS TABLE (
    business_id UUID,
    business_name VARCHAR(255),
    business_email VARCHAR(255),
    business_phone VARCHAR(20),
    business_address TEXT,
    business_group_id UUID,
    is_active BOOLEAN,
    total_users INTEGER,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id,
        b.name,
        b.email,
        b.phone,
        COALESCE(
            TRIM(
                CONCAT_WS(', ',
                    NULLIF(TRIM(CONCAT_WS(' ',
                        NULLIF(a.street, ''),
                        NULLIF(a.street_number, '')
                    )), ''),
                    NULLIF(TRIM(a.neighborhood), ''),
                    NULLIF(TRIM(a.city), ''),
                    NULLIF(TRIM(a.state), '')
                )
            ),
            'Sin dirección'
        ) AS business_address,
        b.business_group_id,
        b.is_active,
        COUNT(DISTINCT bu.id) FILTER (WHERE bu.is_active = TRUE)::INTEGER AS total_users,
        b.created_at
    FROM core.businesses b
    INNER JOIN core.business_users bu ON b.id = bu.business_id
    LEFT JOIN core.addresses a ON b.address_id = a.id AND a.is_active = TRUE
    WHERE bu.user_id = p_superadmin_id
      AND bu.role = 'superadmin'
      AND bu.is_active = TRUE
    GROUP BY b.id, b.name, b.email, b.phone, b.business_group_id, b.is_active, b.created_at,
             a.street, a.street_number, a.neighborhood, a.city, a.state
    ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.get_superadmin_businesses IS 'Obtiene todas las tiendas donde un usuario es superadmin (incluye business_group_id)';
