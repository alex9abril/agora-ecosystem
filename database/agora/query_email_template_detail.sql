-- ============================================================================
-- AGORA ECOSYSTEM - Query: Detalle del template de correo (resuelto y por nivel)
-- ============================================================================
-- Descripción: Consultas para ver el template tal como lo usa el backend
--              (resolución business → group → global) y por tabla para edición.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-02-18
-- Hora: 15:00:00
-- ============================================================================

SET search_path = communication, core, public;

-- ============================================================================
-- 1) TEMPLATE RESUELTO (igual que usa el backend al enviar el correo)
-- ============================================================================
-- Sustituir los UUIDs por tu business_id y, si aplica, business_group_id.
-- Si solo pasas business_id, la función resuelve el group desde core.businesses.

SELECT
  id,
  subject,
  template_html,
  template_text,
  available_variables,
  level
FROM communication.get_email_template(
  'order_confirmation',                                    -- trigger_type
  '4ed0decf-6d29-4681-aa9d-39bc7b8a7e58'::uuid,            -- business_id (sucursal)
  '615fd239-55cb-4232-abba-2232a03f2942'::uuid             -- business_group_id (opcional)
);

-- ============================================================================
-- 2) TEMPLATE POR NIVEL (para ver qué hay en cada tabla)
-- ============================================================================

-- 2.1 Global (communication.email_templates)
SELECT
  id,
  trigger_type,
  name,
  description,
  subject,
  LEFT(template_html, 500) AS template_html_preview,
  LENGTH(template_html)    AS template_html_length,
  available_variables,
  is_active,
  created_at,
  updated_at
FROM communication.email_templates
WHERE trigger_type = 'order_confirmation';

-- 2.2 Grupo (core.business_group_email_templates)
SELECT
  bget.id,
  bget.trigger_type,
  bget.name,
  bget.business_group_id,
  bg.name AS group_name,
  bget.subject,
  LEFT(bget.template_html, 500) AS template_html_preview,
  LENGTH(bget.template_html)   AS template_html_length,
  bget.available_variables,
  bget.is_active,
  bget.created_at,
  bget.updated_at
FROM core.business_group_email_templates bget
JOIN core.business_groups bg ON bg.id = bget.business_group_id
WHERE bget.trigger_type = 'order_confirmation'
ORDER BY bget.updated_at DESC;

-- 2.3 Sucursal (core.business_email_templates)
SELECT
  bet.id,
  bet.trigger_type,
  bet.name,
  bet.business_id,
  b.name AS business_name,
  bet.subject,
  LEFT(bet.template_html, 500) AS template_html_preview,
  LENGTH(bet.template_html)    AS template_html_length,
  bet.available_variables,
  bet.is_active,
  bet.created_at,
  bet.updated_at
FROM core.business_email_templates bet
JOIN core.businesses b ON b.id = bet.business_id
WHERE bet.trigger_type = 'order_confirmation'
ORDER BY bet.updated_at DESC;

-- ============================================================================
-- 3) DETALLE COMPLETO DE UN TEMPLATE (HTML completo para copiar/editar)
-- ============================================================================
-- Útil para ver el HTML completo del nivel que aplique a una sucursal.

SELECT
  t.id,
  t.level,
  t.subject,
  t.template_html,
  t.template_text,
  t.available_variables
FROM communication.get_email_template(
  'order_confirmation',
  '4ed0decf-6d29-4681-aa9d-39bc7b8a7e58'::uuid,
  '615fd239-55cb-4232-abba-2232a03f2942'::uuid
) t;

-- ============================================================================
-- NOTAS – Variables actuales del template order_confirmation
-- ============================================================================
-- El backend (EmailService.sendOrderConfirmationEmail) reemplaza solo:
--   {{order_number}}, {{order_date}}, {{order_total}}, {{payment_method}}, {{order_url}}
--
-- Para integrar más datos en el template:
-- 1. Añadir la variable en el HTML del template (ej: {{user_name}}, {{business_name}}).
-- 2. Añadirla en available_variables del template en BD.
-- 3. Pasar el valor desde OrdersService.sendOrderConfirmationEmail al llamar a
--    emailService.sendOrderConfirmationEmail (y extender la firma del método).
-- 4. En EmailService.sendOrderConfirmationEmail, incluir la nueva clave en el
--    objeto variables que se pasa a sendEmail().
-- ============================================================================

-- ============================================================================
-- PROPUESTA: Variables útiles para integrar en order_confirmation
-- ============================================================================
-- Sugerencia de nuevas variables y dónde usarlas en el HTML:
--
-- 1) user_name
--    Uso: "Hola {{user_name}}," antes del mensaje de agradecimiento.
--    Origen: core.user_profiles (first_name + last_name) o auth.users.
--
-- 2) business_name
--    Uso: "Tu pedido en {{business_name}} ha sido recibido."
--    Origen: core.businesses.name para el business_id de la orden.
--
-- 3) delivery_address (opcional)
--    Uso: Bloque "Dirección de entrega: {{delivery_address}}"
--    Origen: orders.orders.delivery_address_text.
--
-- 4) order_items_summary (opcional, más trabajo)
--    Uso: Lista de productos (nombre x cantidad - precio). Requiere que el
--    backend construya un HTML o texto y lo pase como una sola variable;
--    o varias variables pre-renderizadas.
--
-- Ejemplo de bloque HTML con nuevas variables (insertar en el template):
--
--   <p style="...">Hola {{user_name}},</p>
--   <p style="...">Gracias por realizar tu pedido en {{business_name}}. ...</p>
--   ...
--   <div style="...">
--     <p style="...">Dirección de entrega:</p>
--     <p style="...">{{delivery_address}}</p>
--   </div>
--
-- available_variables actualizado (ejemplo):
--   ARRAY['order_number','order_date','order_total','payment_method','order_url','user_name','business_name','delivery_address']
-- ============================================================================
