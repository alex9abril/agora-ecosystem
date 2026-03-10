/**
 * Interfaces para la arquitectura de estrategias de pago Karlopay.
 * Soporta modo redirect (hosted externo) y embedded (widget en tienda).
 * PCI-safe: nunca recibimos PAN/CVV en nuestro backend.
 */

export type KarlopayIntegrationMode = 'redirect' | 'embedded';

export type PaymentStatus =
  | 'created'
  | 'pending_payment'
  | 'processing'
  | 'paid'
  | 'declined'
  | 'cancelled'
  | 'expired'
  | 'error';

/** Input para crear sesión de pago (común a redirect y embedded) */
export interface CreatePaymentSessionInput {
  orderGroupId: string;
  numberOfOrder: string;
  total: number;
  customer: {
    foreignId: string;
    fullName: string;
    phoneNumber: string;
    email: string;
  };
  operations: Array<{ description: string; quantity: number; price: number }>;
  redirectUrl?: string;
  additional?: Record<string, unknown>;
}

/** Resultado de crear sesión - sirve para redirect y embedded */
export interface CreatePaymentSessionResult {
  mode: KarlopayIntegrationMode;
  /** URL de pago (redirect) - presente cuando mode=redirect */
  urlPayment?: string;
  /** numberOfOrder devuelto por Karlopay */
  numberOfOrder: string;
  /** ID de orden en Karlopay */
  karlopayOrderId?: number;
  /** Para embedded: config del widget si existe (clientSecret, sessionId, etc.) */
  embeddedConfig?: EmbeddedPaymentConfig;
}

/** Config para inicializar widget/iframe embebido (cuando Karlopay lo provea) */
export interface EmbeddedPaymentConfig {
  /** URL del script del widget (si aplica) */
  scriptUrl?: string;
  /** ID de sesión para el widget */
  sessionId?: string;
  /** Client secret o token público (nunca secretos sensibles) */
  clientSecret?: string;
  /** Configuración de tema/branding */
  theme?: Record<string, unknown>;
  /** TODO: Karlopay no expone públicamente SDK embedded. Cuando esté disponible, mapear aquí. */
  [key: string]: unknown;
}

/** Resultado de inicializar pago embebido */
export interface EmbeddedPaymentInitResult {
  success: boolean;
  embeddedConfig?: EmbeddedPaymentConfig;
  error?: string;
}

/** Resultado de consultar estado de pago */
export interface PaymentStatusResult {
  status: PaymentStatus;
  orderId?: string;
  orderGroupId?: string;
  paymentAmount?: number;
  completedAt?: string;
  error?: string;
}

/** Configuración de pago por sucursal */
export interface BranchPaymentSettings {
  enabled: boolean;
  mode: KarlopayIntegrationMode;
  environment: 'dev' | 'prod';
  publicKey?: string;
  merchantId?: string;
  accountId?: string;
  returnUrl?: string;
  webhookSecret?: string;
  embeddedConfig?: Record<string, unknown>;
}
