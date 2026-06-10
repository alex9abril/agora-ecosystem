export type TimelineBlockVariant = 'default' | 'control' | 'result';

export type TimelineBlock = {
  title: string;
  items: string[];
  variant?: TimelineBlockVariant;
};

export type TimelineStep = {
  n: string;
  title: string;
  tags: { label: string; variant?: 'default' | 'crit' | 'fiscal' }[];
  lead: string;
  blocks: TimelineBlock[];
  final?: boolean;
};

export const PROCESO_STEPS: TimelineStep[] = [
  {
    n: '01',
    title: 'El cliente compra en la tienda en línea',
    tags: [{ label: 'Inicio del pedido' }],
    lead:
      'El cliente navega tu catálogo, encuentra la pieza compatible con su vehículo y arma su carrito en la tienda en línea.',
    blocks: [
      {
        title: 'Se registra',
        items: ['Productos y cantidades', 'Sucursal / contexto de tienda', 'Datos del cliente'],
      },
      {
        title: 'En automático',
        items: ['Validación de disponibilidad', 'Cálculo del total'],
      },
      {
        title: 'Resultado',
        items: ['Carrito listo para checkout'],
        variant: 'result',
      },
    ],
  },
  {
    n: '02',
    title: 'Elige envío o pickup',
    tags: [{ label: 'Checkout' }],
    lead:
      'En el checkout, el cliente captura su dirección y elige cómo recibir su pedido. Si es envío, Agora cotiza el costo de logística en línea.',
    blocks: [
      {
        title: 'Se registra',
        items: ['Dirección de entrega', 'Método: envío o pickup'],
      },
      {
        title: 'En automático',
        items: ['Cotización de logística', 'Costo de envío al total'],
      },
      {
        title: 'Resultado',
        items: ['Pedido listo para pago'],
        variant: 'result',
      },
    ],
  },
  {
    n: '03',
    title: 'Pago en línea',
    tags: [{ label: 'Cobro' }, { label: 'Seguro', variant: 'fiscal' }],
    lead:
      'El cliente paga en línea a través de la pasarela de pagos configurada. Solo cuando el pago se aprueba, el pedido avanza para preparación. Sin pago, no hay pedido por surtir.',
    blocks: [
      {
        title: 'Se registra',
        items: ['Pago y método', 'Confirmación de la transacción'],
      },
      {
        title: 'En automático',
        items: ['Validación del cobro', 'Avance del estado del pedido'],
      },
      {
        title: 'Resultado',
        items: ['Pedido pagado y confirmado', 'Correo de confirmación al cliente'],
        variant: 'result',
      },
    ],
  },
  {
    n: '04',
    title: 'La sucursal prepara el paquete',
    tags: [{ label: 'En sucursal' }, { label: 'Tu intervención', variant: 'crit' }],
    lead:
      'El pedido pagado aparece listo para preparar. La sucursal surte las piezas y arma el paquete. Aquí es donde tu equipo aporta valor.',
    blocks: [
      {
        title: 'Se registra',
        items: ['Pedido en preparación', 'Responsable que prepara'],
      },
      {
        title: 'Lo que haces',
        items: ['Surtir productos del catálogo', 'Empacar el pedido'],
        variant: 'control',
      },
      {
        title: 'Resultado',
        items: ['Paquete listo para envío o pickup'],
        variant: 'result',
      },
    ],
  },
  {
    n: '05',
    title: 'Guía de envío o entrega en pickup',
    tags: [{ label: 'Logística' }],
    lead:
      'Para envío, Agora genera la guía y coordina la recolección. Para pickup, el pedido queda listo para entregar en mostrador.',
    blocks: [
      {
        title: 'Se registra',
        items: ['Guía asociada al pedido', 'Modalidad de entrega'],
      },
      {
        title: 'En automático',
        items: ['Generación de guía de envío', 'Notificación al cliente'],
      },
      {
        title: 'Resultado',
        items: ['Paquete entregado a la paquetería o listo en tienda'],
        variant: 'result',
      },
    ],
  },
  {
    n: '06',
    title: 'Pedido entregado',
    tags: [{ label: 'Cierre' }],
    lead:
      'El cliente recibe su pedido a domicilio o lo recoge en sucursal. El pedido cierra con su historia completa y disponible para postventa.',
    final: true,
    blocks: [
      {
        title: 'Se registra',
        items: ['Estado entregado', 'Evidencia de entrega'],
      },
      {
        title: 'En automático',
        items: ['Actualización de seguimiento', 'Disponible para postventa'],
      },
      {
        title: 'Resultado',
        items: ['Venta completa, cliente satisfecho'],
        variant: 'result',
      },
    ],
  },
];

export const BULLET_GRADIENTS = [
  'from-blue-600 to-violet-600 shadow-indigo-500/30',
  'from-cyan-500 to-blue-600 shadow-cyan-500/30',
  'from-violet-600 to-indigo-600 shadow-violet-500/30',
  'from-rose-500 to-rose-400 shadow-rose-500/30',
  'from-amber-500 to-orange-500 shadow-amber-500/30 text-[#2a1700]',
  'from-teal-600 to-emerald-500 shadow-teal-500/30',
];
