import { useEffect, useRef, useState } from 'react';
import { Order } from '@/lib/orders';
import { formatOrderNumber } from './orderPresentation';

/** Desactivar temporalmente “Contactar por correo”; poner en `true` para retomar mailto. */
const CONTACT_EMAIL_MENU_ENABLED = false;

/** wa.me requiere número internacional sin +; MX: 10 dígitos locales → 52. */
function whatsappHrefFromPhone(phoneRaw: string | undefined): string | null {
  if (!phoneRaw?.trim()) return null;
  const digits = phoneRaw.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const international =
    digits.length === 10 && !digits.startsWith('52') ? `52${digits}` : digits;
  return `https://wa.me/${international}`;
}

interface OrdersRowMenuProps {
  order: Order;
  onOpen: (orderId: string) => void;
  onPrepare: (orderId: string) => void;
  showPrepare: boolean;
}

export function OrdersRowMenu({ order, onOpen, onPrepare, showPrepare }: OrdersRowMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const folio = formatOrderNumber(order);
  const email = CONTACT_EMAIL_MENU_ENABLED ? order.client_email?.trim() : undefined;
  const whatsappUrl = whatsappHrefFromPhone(order.client_phone);
  const detailUrl = `/orders/${order.id}`;
  const prepareUrl = `/orders/${order.id}/prepare`;
  const hasContactOptions = Boolean(email) || Boolean(whatsappUrl);

  return (
    <div className="relative inline-block text-left" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-8 w-8 rounded-md border border-gray-300 dark:border-neutral-600 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Más acciones"
      >
        ···
      </button>
      {open ? (
        <div
          className="absolute right-0 z-50 mt-1 w-max min-w-[18rem] max-w-[min(22rem,calc(100vw-1.5rem))] rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 py-1 shadow-lg text-sm"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="w-full whitespace-nowrap px-3 py-2 text-left text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-neutral-700"
            onClick={() => {
              setOpen(false);
              onOpen(order.id);
            }}
          >
            Ver detalle
          </button>
          {showPrepare ? (
            <button
              type="button"
              role="menuitem"
              className="w-full whitespace-nowrap px-3 py-2 text-left text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-neutral-700"
              onClick={() => {
                setOpen(false);
                onPrepare(order.id);
              }}
            >
              Preparar surtido
            </button>
          ) : null}
          <a
            role="menuitem"
            href={detailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block whitespace-nowrap px-3 py-2 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-neutral-700"
            onClick={() => setOpen(false)}
          >
            Abrir en nueva pestaña
          </a>
          {hasContactOptions ? (
            <div className="my-1 border-t border-gray-100 dark:border-neutral-700" role="presentation" />
          ) : null}
          {/*
           * Contactar por correo (correo del registro: order.client_email + mailto).
           * Código vigente debajo; la entrada al menú queda desactivada vía CONTACT_EMAIL_MENU_ENABLED.
           */}
          {CONTACT_EMAIL_MENU_ENABLED && email ? (
            <a
              role="menuitem"
              href={`mailto:${email}`}
              className="block whitespace-nowrap px-3 py-2 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-neutral-700"
              onClick={() => setOpen(false)}
            >
              Contactar por correo
            </a>
          ) : null}
          {whatsappUrl ? (
            <a
              role="menuitem"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block whitespace-nowrap px-3 py-2 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-neutral-700"
              onClick={() => setOpen(false)}
            >
              Contactar por WhatsApp
            </a>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="w-full whitespace-nowrap px-3 py-2 text-left text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-neutral-700"
            onClick={() => {
              void navigator.clipboard?.writeText(folio);
              setOpen(false);
            }}
          >
            Copiar folio
          </button>
          {showPrepare ? (
            <a
              role="menuitem"
              href={prepareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block whitespace-nowrap px-3 py-2 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-neutral-700"
              onClick={() => setOpen(false)}
            >
              Preparar en nueva pestaña
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
