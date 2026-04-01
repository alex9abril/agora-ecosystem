/**
 * Mapeo centralizado Skydropx / carrier → estados internos.
 * - Label lifecycle (shipping_labels.status): generated | picked_up | in_transit | delivered | cancelled
 * - Negocio (logistics_status_normalized): prepared | carrier_received | in_transit | delivered | cancelled
 *
 * Supuestos: variantes exactas de carriers dependen de Skydropx; ampliar mapRawToLabelLifecycle con
 * cadenas observadas en producción. Pickup no gobierna el ciclo (solo pickup_snapshot en BD).
 */

export type LogisticsNormalizedStatus =
  | 'prepared'
  | 'carrier_received'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export type LabelLifecycleStatus =
  | 'generated'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

const NORM_RANK: Record<LogisticsNormalizedStatus, number> = {
  cancelled: -1,
  prepared: 1,
  carrier_received: 2,
  in_transit: 3,
  delivered: 4,
};

export function normalizedRank(s: LogisticsNormalizedStatus): number {
  return NORM_RANK[s] ?? 0;
}

export function shouldAdvanceNormalized(
  current: LogisticsNormalizedStatus,
  next: LogisticsNormalizedStatus
): boolean {
  if (next === 'cancelled') return true;
  if (current === 'cancelled' || current === 'delivered') return false;
  if (next === 'delivered') return true;
  return normalizedRank(next) > normalizedRank(current);
}

const LABEL_RANK: Record<LabelLifecycleStatus, number> = {
  cancelled: -1,
  generated: 1,
  picked_up: 2,
  in_transit: 3,
  delivered: 4,
};

export function shouldAdvanceLabelStatus(
  current: string | null | undefined,
  next: LabelLifecycleStatus
): boolean {
  const cur = parseLabelLifecycle(current);
  if (next === 'cancelled') return true;
  if (cur === 'cancelled' || cur === 'delivered') return false;
  if (next === 'delivered') return true;
  return LABEL_RANK[next] > LABEL_RANK[cur];
}

export function mapLabelLifecycleToNormalized(
  label: LabelLifecycleStatus
): LogisticsNormalizedStatus {
  switch (label) {
    case 'generated':
      return 'prepared';
    case 'picked_up':
      return 'carrier_received';
    case 'in_transit':
      return 'in_transit';
    case 'delivered':
      return 'delivered';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'prepared';
  }
}

export function parseLabelLifecycle(s: string | null | undefined): LabelLifecycleStatus {
  const v = String(s || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  if (v === 'picked_up' || v === 'pickedup') return 'picked_up';
  if (v === 'in_transit' || v === 'intransit') return 'in_transit';
  if (v === 'delivered') return 'delivered';
  if (v === 'cancelled' || v === 'canceled') return 'cancelled';
  if (
    v === 'generated' ||
    v === 'created' ||
    v === 'success' ||
    v === 'in_progress' ||
    v === 'label_created' ||
    v === 'ready' ||
    v === 'pending_pickup'
  ) {
    return 'generated';
  }
  return 'generated';
}

/**
 * Traduce texto raw (webhook o API) a lifecycle interno. Extender con sinónimos reales de carriers.
 */
export function mapRawToLabelLifecycle(rawInput: string | null | undefined): LabelLifecycleStatus {
  if (rawInput == null || rawInput === '') return 'generated';
  const raw = String(rawInput).trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');

  if (
    raw.includes('delivered') ||
    raw === 'entregado' ||
    raw === 'delivery_complete'
  ) {
    return 'delivered';
  }
  if (raw.includes('cancel') || raw === 'void' || raw === 'anulado') {
    return 'cancelled';
  }
  if (
    raw.includes('out_for_delivery') ||
    raw.includes('outfordelivery') ||
    raw.includes('en_reparto') ||
    raw.includes('on_vehicle') ||
    raw.includes('departure') ||
    raw.includes('in_transit') ||
    raw === 'intransit' ||
    raw === 'moving' ||
    raw === 'transit' ||
    raw.includes('arrived_at_hub') ||
    raw.includes('destination_facility')
  ) {
    return 'in_transit';
  }
  if (
    raw.includes('picked_up') ||
    raw.includes('pickedup') ||
    raw.includes('collected') ||
    raw === 'received' ||
    raw.includes('acceptance') ||
    raw.includes('carrier_received') ||
    raw.includes('recolectado') ||
    raw.includes('pickup_done')
  ) {
    return 'picked_up';
  }
  if (raw.includes('exception') || raw.includes('delay') || raw.includes('hold')) {
    return 'in_transit';
  }

  if (
    raw.includes('created') ||
    raw.includes('generated') ||
    raw.includes('label') ||
    raw === 'success' ||
    raw === 'in_progress' ||
    raw.includes('pending_pickup') ||
    raw.includes('ready_for_pickup') ||
    raw.includes('awaiting')
  ) {
    return 'generated';
  }

  return parseLabelLifecycle(raw);
}

export function mapSkydropxTrackingStatusToLabelLifecycle(
  mapped: string | null | undefined
): LabelLifecycleStatus {
  return mapRawToLabelLifecycle(mapped);
}
