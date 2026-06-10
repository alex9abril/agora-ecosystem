export type FlowDirection = 'agora-in' | 'agora-out' | 'bidirectional';

export type IntegrationDomain = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  directionToday: FlowDirection;
  directionLabel: string;
  proceso: string[];
  integracionesAgora: { name: string; detail: string }[];
  puntosIntercambio: { label: string; detail: string }[];
  enAgora: string[];
};

export const INTEGRATION_DOMAINS: IntegrationDomain[] = [
  {
    id: 'catalogo',
    icon: 'C',
    title: 'Catálogo de productos',
    subtitle: 'Del maestro del distribuidor a la tienda en línea',
    color: 'blue',
    directionToday: 'agora-in',
    directionLabel: 'Hoy: principalmente Distribuidor → Agora',
    proceso: [
      'El distribuidor mantiene su catálogo maestro en su DMS/ERP (SKU, precio, stock, sucursal).',
      'Agora recibe el catálogo por lotes o mediante conectores programados hacia un área de staging.',
      'Se aplican reglas de transformación por distribuidor: normalización de SKU, ajuste de precio y mapeo de sucursal.',
      'Cada SKU se cruza con el catálogo maestro global de Agora; se actualiza disponibilidad, precio y stock por sucursal.',
      'El producto enriquecido (compatibilidad, imágenes, datos logísticos) se publica en la tienda según el contexto activo.',
    ],
    integracionesAgora: [
      { name: 'Motor de workflows', detail: 'Conectores MSSQL y REST para lectura periódica desde el sistema del distribuidor.' },
      { name: 'Ingesta por lotes', detail: 'Recepción de payloads JSON/CSV con auditoría del registro original y reproceso selectivo.' },
      { name: 'Jobs de sincronización', detail: 'Procesamiento en background con resumen de insertados, actualizados y fallidos por lote.' },
    ],
    puntosIntercambio: [
      { label: 'Payload de catálogo', detail: 'SKU, precio, stock, código de sucursal y metadatos del producto tal como los reporta el distribuidor.' },
      { label: 'Resultado del lote', detail: 'Resumen de sincronización: procesados, actualizados, fallidos y motivo por SKU.' },
      { label: 'Configuración por distribuidor', detail: 'Reglas de normalización, mapeo de sucursales y ajustes de precio aplicados en Agora.' },
    ],
    enAgora: [
      'Cruce con catálogo maestro global',
      'Compatibilidad de vehículos',
      'Imágenes y ficha comercial',
      'Datos logísticos (peso y dimensiones)',
      'Disponibilidad por sucursal en tienda',
    ],
  },
  {
    id: 'clientes',
    icon: 'U',
    title: 'Catálogo de clientes',
    subtitle: 'Identidad, contacto y direcciones en el checkout',
    color: 'violet',
    directionToday: 'bidirectional',
    directionLabel: 'Hoy: Agora gestiona el registro; el pedido expone los datos',
    proceso: [
      'El cliente se registra o inicia sesión en la tienda en línea de Agora.',
      'Agora mantiene el perfil (nombre, correo, teléfono) y las direcciones de envío y facturación.',
      'En checkout se valida la información de contacto y entrega antes de confirmar el pedido.',
      'Al confirmarse la venta, el pedido queda asociado al cliente con su historial de compras en Agora.',
    ],
    integracionesAgora: [
      { name: 'Autenticación Supabase', detail: 'Registro, login y verificación de correo del cliente final.' },
      { name: 'Perfiles y direcciones', detail: 'Gestión de core.user_profiles y direcciones reutilizables en checkout.' },
      { name: 'Notificaciones al cliente', detail: 'Correos de confirmación y avisos de cambio de estado del pedido.' },
    ],
    puntosIntercambio: [
      { label: 'Datos del cliente en pedido', detail: 'Nombre, correo, teléfono e identificador interno asociados al checkout.' },
      { label: 'Direcciones', detail: 'Dirección de entrega y, cuando aplica, dirección de facturación capturadas en la venta.' },
      { label: 'Historial de compras', detail: 'Pedidos previos visibles para el cliente dentro del ecosistema Agora.' },
    ],
    enAgora: [
      'Registro y autenticación del cliente final',
      'Validación de datos en checkout',
      'Asociación cliente ↔ pedido',
      'Comunicaciones postventa al comprador',
    ],
  },
  {
    id: 'pedidos',
    icon: 'P',
    title: 'Pedidos',
    subtitle: 'Del checkout a la operación de sucursal',
    color: 'indigo',
    directionToday: 'agora-out',
    directionLabel: 'Hoy: Agora orquesta el ciclo; el distribuidor surte en panel',
    proceso: [
      'El checkout puede agrupar líneas de varias sucursales en un mismo carrito (order group).',
      'Cada línea genera un pedido por sucursal que surte (orders.orders con business_id).',
      'El pedido avanza por estados: creado → pagado → confirmado → en preparación → enviado → entregado.',
      'La sucursal ve el pedido en su panel con productos, cantidades, cliente y modalidad de entrega.',
      'Los cambios de estado disparan notificaciones internas y al cliente final.',
    ],
    integracionesAgora: [
      { name: 'Checkout multi-sucursal', detail: 'Orquestación de carrito, envío por tienda y confirmación unificada.' },
      { name: 'Panel de pedidos', detail: 'Vista operativa por sucursal para preparación, pickup y seguimiento.' },
      { name: 'Notificaciones', detail: 'Correo al cliente, WhatsApp (Karbot) y avisos a supervisores según configuración.' },
    ],
    puntosIntercambio: [
      { label: 'Pedido confirmado', detail: 'Identificador, sucursal, líneas, totales, cliente y método de entrega.' },
      { label: 'Cambios de estado', detail: 'Transiciones del ciclo de vida: pagado, en preparación, enviado, entregado, cancelado.' },
      { label: 'Detalle operativo', detail: 'SKUs surtidos, cantidades, notas de entrega y responsable de preparación.' },
    ],
    enAgora: [
      'Creación y agrupación de pedidos',
      'Máquina de estados y trazabilidad',
      'Asignación a sucursal que surte',
      'Comunicación al cliente y supervisores',
    ],
  },
  {
    id: 'pagos',
    icon: '$',
    title: 'Pagos',
    subtitle: 'Cobro en línea y confirmación de la transacción',
    color: 'emerald',
    directionToday: 'bidirectional',
    directionLabel: 'Hoy: pasarela ↔ Agora vía webhooks',
    proceso: [
      'El cliente elige método de pago en checkout (tarjeta, wallet u opciones configuradas).',
      'Agora redirige o embebe la pasarela de pagos activa para la tienda.',
      'La pasarela procesa el cobro y notifica a Agora el resultado (aprobado, rechazado, pendiente).',
      'Solo con pago aprobado el pedido avanza a preparación; sin pago no hay pedido por surtir.',
      'Cada transacción queda registrada con referencia, monto y estado para auditoría.',
    ],
    integracionesAgora: [
      { name: 'KarloPay', detail: 'Cobro en línea con webhook de confirmación y modo redirect/embedded.' },
      { name: 'Stripe', detail: 'Procesamiento de tarjetas según configuración de la tienda.' },
      { name: 'Mercado Pago', detail: 'Alternativa de cobro en línea para el checkout.' },
      { name: 'Monedero (wallet)', detail: 'Saldo interno del cliente como método de pago complementario.' },
    ],
    puntosIntercambio: [
      { label: 'Intento de cobro', detail: 'Monto, moneda, referencia de pedido y método seleccionado.' },
      { label: 'Resultado de pago', detail: 'Estado aprobado/rechazado, referencia de transacción y timestamp.' },
      { label: 'Conciliación', detail: 'Vínculo entre order_group, pedidos individuales y transacción de la pasarela.' },
    ],
    enAgora: [
      'Orquestación del checkout de pago',
      'Recepción y validación de webhooks',
      'Actualización de payment_status en pedidos',
      'Bloqueo de surtido sin pago confirmado',
    ],
  },
  {
    id: 'logistica',
    icon: 'L',
    title: 'Logística',
    subtitle: 'Cotización, guías y seguimiento de entrega',
    color: 'cyan',
    directionToday: 'bidirectional',
    directionLabel: 'Hoy: Agora ↔ operadores de paquetería',
    proceso: [
      'En checkout se cotiza el envío según origen (sucursal), destino y datos logísticos del producto.',
      'Tras el pago, la sucursal prepara el paquete; Agora genera la guía con el operador integrado.',
      'La guía queda asociada al pedido con número de rastreo y PDF imprimible.',
      'Los estados de envío avanzan: generada → recolectada → en tránsito → entregada.',
      'El cliente recibe notificaciones de seguimiento; pickup omite la guía y cierra en mostrador.',
    ],
    integracionesAgora: [
      { name: 'Skydropx', detail: 'Cotización multi-carrier, generación de guías y webhooks de seguimiento.' },
      { name: 'Servicio de logística Agora', detail: 'Capa interna de envíos con generación de guía y simulación de estados.' },
      { name: 'Pickup en sucursal', detail: 'Flujo alterno sin guía: pedido listo para entrega en tienda.' },
    ],
    puntosIntercambio: [
      { label: 'Cotización de envío', detail: 'Origen, destino, peso/dimensiones y costo calculado en checkout.' },
      { label: 'Guía generada', detail: 'Número de rastreo, carrier, PDF y vínculo al pedido.' },
      { label: 'Eventos de tracking', detail: 'Recolección, tránsito y entrega confirmada con timestamps.' },
    ],
    enAgora: [
      'Cálculo de costo en checkout',
      'Generación e impresión de guías',
      'Asociación guía ↔ pedido',
      'Actualización de estado del pedido por entrega',
    ],
  },
  {
    id: 'facturacion',
    icon: 'F',
    title: 'Facturación',
    subtitle: 'Datos fiscales y cierre contable del pedido',
    color: 'amber',
    directionToday: 'agora-out',
    directionLabel: 'Hoy: Agora captura datos fiscales en la venta',
    proceso: [
      'En checkout el cliente puede indicar datos de facturación (RFC, razón social, dirección fiscal).',
      'Agora calcula impuestos según la configuración fiscal de la tienda y del producto.',
      'Los datos fiscales quedan asociados al pedido para trazabilidad y postventa.',
      'El cierre del pedido (entregado) deja la venta lista para procesos contables posteriores.',
    ],
    integracionesAgora: [
      { name: 'Motor de impuestos', detail: 'Reglas configurables por tienda, producto y jurisdicción.' },
      { name: 'Datos fiscales en pedido', detail: 'Captura de dirección de facturación y metadatos del receptor.' },
      { name: 'Trazabilidad de venta', detail: 'Historial completo del pedido con montos, impuestos y líneas surtidas.' },
    ],
    puntosIntercambio: [
      { label: 'Datos fiscales del pedido', detail: 'RFC, razón social, dirección fiscal y desglose de montos.' },
      { label: 'Venta cerrada', detail: 'Pedido entregado con totales, impuestos, líneas y referencia de pago.' },
      { label: 'Evidencia de entrega', detail: 'Estado final, modalidad (envío/pickup) y fecha de cierre.' },
    ],
    enAgora: [
      'Captura de datos fiscales en checkout',
      'Cálculo de impuestos en la venta',
      'Asociación fiscal al pedido',
      'Conservación del historial para postventa',
    ],
  },
];

export const COLOR_MAP: Record<
  string,
  { badge: string; icon: string; border: string; dot: string; tag: string }
> = {
  blue: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: 'from-blue-600 to-violet-600',
    border: 'border-blue-200/80',
    dot: 'bg-blue-500',
    tag: 'bg-blue-50 text-blue-700',
  },
  violet: {
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: 'from-violet-600 to-indigo-600',
    border: 'border-violet-200/80',
    dot: 'bg-violet-500',
    tag: 'bg-violet-50 text-violet-700',
  },
  indigo: {
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: 'from-indigo-600 to-blue-700',
    border: 'border-indigo-200/80',
    dot: 'bg-indigo-500',
    tag: 'bg-indigo-50 text-indigo-700',
  },
  emerald: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: 'from-emerald-600 to-teal-600',
    border: 'border-emerald-200/80',
    dot: 'bg-emerald-500',
    tag: 'bg-emerald-50 text-emerald-700',
  },
  cyan: {
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    icon: 'from-cyan-500 to-blue-600',
    border: 'border-cyan-200/80',
    dot: 'bg-cyan-500',
    tag: 'bg-cyan-50 text-cyan-700',
  },
  amber: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: 'from-amber-500 to-orange-500',
    border: 'border-amber-200/80',
    dot: 'bg-amber-500',
    tag: 'bg-amber-50 text-amber-800',
  },
};

export const DIRECTION_LABELS: Record<FlowDirection, string> = {
  'agora-in': '→ Agora recibe',
  'agora-out': '← Agora emite',
  bidirectional: '↔ Intercambio',
};
