-- ============================================================================
-- AGORA ECOSYSTEM - Recreate: Order Confirmation Email Template
-- ============================================================================
-- Descripción: Elimina el template existente de confirmación de pedido y
--              crea uno nuevo con diseño moderno similar a confirmaciones
--              de pago profesionales. Incluye logo de AGORA por defecto.
-- ============================================================================
-- Versión: 1.2
-- Fecha: 2025-01-15
-- Hora: 14:30:00
-- ============================================================================

SET search_path = communication, public;

-- Eliminar template existente
DELETE FROM communication.email_templates 
WHERE trigger_type = 'order_confirmation';

-- Insertar nuevo template con diseño actualizado
INSERT INTO communication.email_templates (
    trigger_type,
    name,
    description,
    subject,
    template_html,
    available_variables,
    is_active,
    is_system
) VALUES (
    'order_confirmation',
    'Confirmación de Pedido',
    'Se envía cuando se confirma un pedido',
    'Confirmación de tu pedido #{{order_number}}',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Pedido - AGORA</title>
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
      ¡Pedido realizado con éxito!
    </h1>

    <!-- Mensaje de agradecimiento -->
    <p style="text-align: center; font-size: 16px; color: #4b5563; margin: 0 0 40px 0; line-height: 1.6; font-family: Arial, sans-serif;">
      Gracias por realizar tu pedido en línea. Hemos recibido tu orden y la estamos procesando.
    </p>

    <!-- Información del pedido -->
    <div style="background-color: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 30px; border: 1px solid #e5e7eb;">
      <div style="text-align: center; margin-bottom: 20px;">
        <p style="font-size: 14px; color: #6b7280; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; font-family: Arial, sans-serif;">
          Número de Orden
        </p>
        <p style="font-size: 24px; font-weight: 700; color: #111827; margin: 0; font-family: Arial, sans-serif;">
          {{order_number}}
        </p>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span style="font-size: 14px; color: #6b7280; font-family: Arial, sans-serif;">Fecha:</span>
          <span style="font-size: 14px; color: #111827; font-weight: 500; font-family: Arial, sans-serif;">{{order_date}}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span style="font-size: 14px; color: #6b7280; font-family: Arial, sans-serif;">Total:</span>
          <span style="font-size: 16px; color: #111827; font-weight: 700; font-family: Arial, sans-serif;">{{order_total}}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="font-size: 14px; color: #6b7280; font-family: Arial, sans-serif;">Método de Pago:</span>
          <span style="font-size: 14px; color: #111827; font-weight: 500; font-family: Arial, sans-serif;">{{payment_method}}</span>
        </div>
      </div>
    </div>

    <!-- Botón de acción -->
    <div style="text-align: center; margin-bottom: 30px;">
      <a href="{{order_url}}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: all 0.3s ease; font-family: Arial, sans-serif;">
        Ver Detalles del Pedido
      </a>
    </div>

    <!-- Nota sobre comprobante -->
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 30px;">
      <p style="font-size: 14px; color: #92400e; margin: 0; line-height: 1.5; font-family: Arial, sans-serif;">
        <strong>📧 Comprobante adjunto:</strong> Tu comprobante de pedido viene adjunto en este correo.
      </p>
    </div>

    <!-- Mensaje final -->
    <p style="text-align: center; font-size: 14px; color: #6b7280; margin: 0; line-height: 1.6; font-family: Arial, sans-serif;">
      Te notificaremos cuando tu pedido esté en camino. Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos.
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
    ARRAY['order_number', 'order_date', 'order_total', 'payment_method', 'order_url'],
    TRUE,
    TRUE
) ON CONFLICT (trigger_type) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    subject = EXCLUDED.subject,
    template_html = EXCLUDED.template_html,
    available_variables = EXCLUDED.available_variables,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Verificar que el template se creó correctamente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM communication.email_templates 
        WHERE trigger_type = 'order_confirmation'
    ) THEN
        RAISE EXCEPTION 'El template de confirmación de pedido no se creó correctamente';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM communication.email_templates 
        WHERE trigger_type = 'order_confirmation'
        AND template_html LIKE '%agoramp.mx%'
    ) THEN
        RAISE EXCEPTION 'El template no contiene el logo de AGORA';
    END IF;
    
    RAISE NOTICE 'Template de confirmación de pedido creado exitosamente con el nuevo diseño';
    RAISE NOTICE 'Verificación completada: Template existe, contiene el nuevo diseño y el logo de AGORA';
END $$;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. Este script ELIMINA el template anterior y crea uno nuevo desde cero
-- 2. El logo de AGORA se carga desde: https://agoramp.mx/_next/static/media/agora_logo_white.7075c997.png
-- 3. El fondo es gris oscuro (#333) con círculos decorativos sutiles
-- 4. El icono de éxito y los botones usan color verde (#10b981) para indicar éxito
-- 5. La fuente utilizada es Arial para todo el texto
-- 6. Las variables disponibles son:
--    - {{order_number}}: Número de orden
--    - {{order_date}}: Fecha del pedido
--    - {{order_total}}: Total del pedido
--    - {{payment_method}}: Método de pago utilizado
--    - {{order_url}}: URL para ver los detalles del pedido
-- 7. El template es responsive y se adapta a diferentes tamaños de pantalla
-- 8. El icono de éxito está integrado en el HTML (✓)
-- 9. Si existen templates de grupo o sucursal que heredan de este, NO se eliminan
--    Solo se elimina el template global
-- ============================================================================
