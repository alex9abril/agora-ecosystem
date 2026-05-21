import React, { useEffect, useMemo, useState } from 'react';

export type CancelOrderReasonKey =
  | 'changed_mind'
  | 'found_better_price'
  | 'delivery_too_slow'
  | 'payment_issue'
  | 'wrong_address_or_method'
  | 'duplicate_order'
  | 'other';

const DEFAULT_REASON: CancelOrderReasonKey = 'changed_mind';

const REASONS: Array<{ key: CancelOrderReasonKey; label: string }> = [
  { key: 'changed_mind', label: 'Ya no lo necesito / cambié de opinión' },
  { key: 'found_better_price', label: 'Encontré un mejor precio' },
  { key: 'delivery_too_slow', label: 'El tiempo de entrega es muy largo' },
  { key: 'payment_issue', label: 'Tuve un problema con el pago' },
  { key: 'wrong_address_or_method', label: 'Quiero cambiar dirección o método de entrega' },
  { key: 'duplicate_order', label: 'Hice el pedido por error / duplicado' },
  { key: 'other', label: 'Otro (especificar)' },
];

export default function CancelOrderReasonModal(props: {
  open: boolean;
  orderLabel?: string;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void> | void;
  busy?: boolean;
}) {
  const { open, orderLabel, onClose, onConfirm, busy } = props;
  const [selected, setSelected] = useState<CancelOrderReasonKey>(DEFAULT_REASON);
  const [details, setDetails] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelected(DEFAULT_REASON);
    setDetails('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const selectedLabel = useMemo(
    () => REASONS.find((r) => r.key === selected)?.label || 'Otro',
    [selected]
  );

  const finalReason = useMemo(() => {
    const extra = details.trim();
    if (!extra) return selectedLabel;
    return `${selectedLabel}. ${extra}`;
  }, [details, selectedLabel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-xl border border-gray-200">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Cancelar pedido{orderLabel ? ` ${orderLabel}` : ''}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Selecciona un motivo. Puedes agregar detalles si quieres.
          </p>
        </div>

        <div className="p-5">
          <div className="space-y-2">
            {REASONS.map((r) => (
              <label
                key={r.key}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  selected === r.key ? 'border-toyota-red bg-red-50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="cancel-reason"
                  className="mt-1"
                  checked={selected === r.key}
                  onChange={() => setSelected(r.key)}
                />
                <span className="text-sm text-gray-900">{r.label}</span>
              </label>
            ))}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Detalles (opcional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Escribe más información (opcional)…"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-toyota-red/30 focus:border-toyota-red"
            />
          </div>
        </div>

        <div className="p-5 border-t border-gray-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={!!busy}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-900 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={() => onConfirm(finalReason.trim() ? finalReason : undefined)}
            disabled={!!busy}
            className="px-4 py-2 rounded-lg bg-toyota-red text-white hover:bg-toyota-red-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Cancelando…' : 'Confirmar cancelación'}
          </button>
        </div>
      </div>
    </div>
  );
}

