'use client';

import { useState, useRef, useEffect } from 'react';

/** Número de notificaciones (maqueta). Luego vendrá de API/contexto. */
const MOCK_COUNT = 3;

/** Items de ejemplo para la maqueta del listado. */
const MOCK_ITEMS = [
  { id: '1', title: 'Nuevo pedido recibido', time: 'Hace 5 min', unread: true },
  { id: '2', title: 'Pago confirmado #ORD-001', time: 'Hace 1 h', unread: true },
  { id: '3', title: 'Recordatorio: inventario bajo', time: 'Ayer', unread: false },
];

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const count = MOCK_COUNT;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors text-gray-600 dark:text-gray-300"
        aria-label="Notificaciones"
      >
        {/* Icono campana */}
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {count > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-xs font-medium"
            aria-hidden
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 z-[280] mt-2 flex max-h-[24rem] w-80 flex-col rounded-lg border border-gray-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
          role="dialog"
          aria-label="Listado de notificaciones"
        >
          <div className="px-4 py-3 border-b border-gray-200 dark:border-neutral-700 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notificaciones</h2>
            {count > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{count} sin leer</span>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {MOCK_ITEMS.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No hay notificaciones
              </div>
            ) : (
              <ul className="py-1">
                {MOCK_ITEMS.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors border-b border-gray-100 dark:border-neutral-700 last:border-0"
                    >
                      <p className={`text-sm ${item.unread ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}>
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.time}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="px-4 py-2 border-t border-gray-200 dark:border-neutral-700">
            <button
              type="button"
              className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 py-2"
            >
              Ver todas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
