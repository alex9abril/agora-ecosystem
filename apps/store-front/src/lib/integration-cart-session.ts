/**
 * Carrito de integración (WhatsApp): rutas fuera de /api (GET /integrations/cart/session).
 */

function getBackendOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  const trimmed = raw.replace(/\/+$/, '');
  const withoutApi = trimmed.replace(/\/api$/i, '');
  return withoutApi || 'http://localhost:3000';
}

export interface IntegrationCartSessionPayload {
  id: string;
  store_id: string;
  items: Array<Record<string, unknown>>;
  subtotal: string;
  itemCount: number;
  totalQuantity: number;
  expires_at?: string;
  [key: string]: unknown;
}

/**
 * GET /integrations/cart/session?t= — público, sin JWT.
 */
export async function fetchIntegrationCartSession(token: string): Promise<IntegrationCartSessionPayload> {
  const url = `${getBackendOrigin()}/integrations/cart/session?t=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const text = await res.text();
  if (!text) {
    throw new Error('Respuesta vacía del servidor');
  }
  let parsed: { success?: boolean; data?: IntegrationCartSessionPayload; message?: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Respuesta inválida del servidor');
  }
  if (!parsed.success || !parsed.data) {
    throw new Error(parsed.message || 'No se pudo cargar el carrito');
  }
  return parsed.data;
}
