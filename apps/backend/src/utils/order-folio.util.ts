/**
 * Folio de pedido para UI y correos, alineado con web-local (p. ej. OrderCard):
 * últimos 8 caracteres hex del UUID, en mayúsculas.
 */
export function formatOrderFolioFromUuid(orderId: string): string {
  return String(orderId).replace(/-/g, '').slice(-8).toUpperCase();
}
