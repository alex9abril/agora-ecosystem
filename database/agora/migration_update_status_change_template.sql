-- ============================================================================
-- AGORA ECOSYSTEM - Update: Order Status Change Template with delivery detail
-- ============================================================================
-- Descripción: Actualiza el template de correo order_status_change para
-- incluir la variable {{delivery_detail_section}} que muestra contexto de
-- entrega: productos + tracking para envíos, o dirección de recolección
-- para pedidos pickup.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-04-11
-- Hora: 15:00:00
-- ============================================================================

SET search_path = communication, public;

-- Actualizar template global: agregar delivery_detail_section al HTML y available_variables
UPDATE communication.email_templates
SET
  template_html = '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Actualización de Pedido - AGORA</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #333; min-height: 100vh;">
  <!-- Fondo gris oscuro con logo y tagline -->
  <div style="background-color: #333; padding: 40px 20px 60px 20px; text-align: center; position: relative; overflow: hidden;">
    <!-- Elementos decorativos sutiles -->
    <div style="position: absolute; top: 20px; left: 10%; width: 60px; height: 60px; background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; opacity: 0.3;"></div>
    <div style="position: absolute; top: 40px; right: 15%; width: 40px; height: 40px; background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; opacity: 0.3;"></div>
    <div style="position: absolute; bottom: 30px; left: 20%; width: 30px; height: 30px; background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; opacity: 0.3;"></div>
    
    <!-- Logo AGORA -->
    <div style="margin-bottom: 20px;">
      <img src="https://agoramp.mx/_next/static/media/agora_logo_white.7075c997.png" alt="AGORA" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" />
    </div>
    
    <!-- Tagline -->
    <p style="color: white; font-size: 14px; margin: 0; opacity: 0.9; font-weight: 300; font-family: Arial, sans-serif;">
      La mejor solución de comercio en línea para la industria automotriz
    </p>
  </div>

  <!-- Tarjeta blanca principal -->
  <div style="max-width: 600px; margin: -40px auto 0 auto; background-color: #ffffff; border-radius: 16px 16px 0 0; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1); position: relative; padding: 50px 40px 40px 40px;">
    
    <!-- Icono de éxito principal -->
    <div style="text-align: center; margin-bottom: 30px; position: relative;">
      <div style="display: inline-block; width: 100px; height: 100px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; position: relative; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 50px; font-weight: bold; font-family: Arial, sans-serif;">✓</div>
      </div>
    </div>

    <!-- Título principal -->
    <h1 style="text-align: center; font-size: 32px; font-weight: 700; color: #111827; margin: 0 0 20px 0; line-height: 1.2; font-family: Arial, sans-serif;">
      Actualización de Pedido
    </h1>

    <!-- Mensaje de actualización -->
    <p style="text-align: center; font-size: 16px; color: #4b5563; margin: 0 0 30px 0; line-height: 1.6; font-family: Arial, sans-serif;">
      Hola {{user_name}},
    </p>
    <p style="text-align: center; font-size: 16px; color: #4b5563; margin: 0 0 40px 0; line-height: 1.6; font-family: Arial, sans-serif;">
      Tu pedido #{{order_number}} ha cambiado de estado.
    </p>

    <!-- Información del cambio de estado -->
    <div style="background-color: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 30px; border: 1px solid #e5e7eb;">
      <div style="margin-bottom: 20px;">
        <p style="font-size: 14px; color: #6b7280; margin: 0 0 8px 0; font-family: Arial, sans-serif;">
          <strong>Estado Anterior:</strong>
        </p>
        <p style="font-size: 16px; color: #111827; margin: 0 0 20px 0; font-weight: 500; font-family: Arial, sans-serif;">
          {{previous_status}}
        </p>
      </div>
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
        <p style="font-size: 14px; color: #6b7280; margin: 0 0 8px 0; font-family: Arial, sans-serif;">
          <strong>Estado Actual:</strong>
        </p>
        <p style="font-size: 18px; color: #10b981; margin: 0; font-weight: 700; font-family: Arial, sans-serif;">
          {{current_status}}
        </p>
      </div>
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
        <p style="font-size: 14px; color: #6b7280; margin: 0; line-height: 1.6; font-family: Arial, sans-serif;">
          {{status_message}}
        </p>
      </div>
    </div>

    <!-- Detalle de entrega (productos, tracking o dirección de recolección) -->
    {{delivery_detail_section}}

    <!-- Botón de acción -->
    <div style="text-align: center; margin-bottom: 30px;">
      <a href="{{order_url}}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: all 0.3s ease; font-family: Arial, sans-serif;">
        Ver Detalles del Pedido
      </a>
    </div>

    <!-- Mensaje final -->
    <p style="text-align: center; font-size: 14px; color: #6b7280; margin: 0; line-height: 1.6; font-family: Arial, sans-serif;">
      Te mantendremos informado sobre cualquier actualización adicional de tu pedido.
    </p>
  </div>

  <!-- Footer -->
  <div style="max-width: 600px; margin: 0 auto; padding: 30px 40px; background-color: #f9fafb; text-align: center; border-radius: 0 0 16px 16px;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0 0 10px 0; font-family: Arial, sans-serif;">
      Este es un correo automático, por favor no respondas a este mensaje.
    </p>
    <p style="font-size: 12px; color: #9ca3af; margin: 0; font-family: Arial, sans-serif;">
      © 2025 AGORA. Todos los derechos reservados.
    </p>
  </div>
</body>
</html>',
  available_variables = ARRAY['user_name', 'order_number', 'previous_status', 'current_status', 'status_message', 'order_url', 'delivery_detail_section'],
  updated_at = CURRENT_TIMESTAMP
WHERE trigger_type = 'order_status_change';

-- Verificar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM communication.email_templates
        WHERE trigger_type = 'order_status_change'
          AND template_html LIKE '%delivery_detail_section%'
    ) THEN
        RAISE WARNING 'No se encontró o actualizó el template global de order_status_change';
    ELSE
        RAISE NOTICE 'Template order_status_change actualizado con delivery_detail_section';
    END IF;
END $$;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- - Se agrega {{delivery_detail_section}} al template global (reemplazo completo
--   del HTML).
-- - Para templates de grupo y sucursal: el backend inyecta automáticamente
--   el delivery_detail_section antes del botón de acción si el template no
--   contiene la variable {{delivery_detail_section}}.
-- - Si la variable queda vacía, simplemente no se muestra nada adicional.
-- ============================================================================
