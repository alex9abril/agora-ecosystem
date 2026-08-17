/**
 * Cinta promocional superior (estilo Parts Center Online).
 * Rota mensajes cortos: cuenta, envío, ofertas.
 */

import React, { useEffect, useState } from 'react';
import ContextualLink from './ContextualLink';
import { useAuth } from '@/contexts/AuthContext';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface PromoMessage {
  id: string;
  content: React.ReactNode;
}

export default function PromoBar() {
  const { isAuthenticated } = useAuth();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const messages: PromoMessage[] = [
    {
      id: 'account',
      content: isAuthenticated ? (
        <span>Bienvenido de nuevo. Explora refacciones compatibles con tu vehículo.</span>
      ) : (
        <span>
          <ContextualLink href="/auth/login" className="underline underline-offset-2 hover:opacity-80">
            Inicia sesión o crea una cuenta
          </ContextualLink>
          {' '}para una experiencia más rápida al comprar.
        </span>
      ),
    },
    {
      id: 'shipping',
      content: (
        <span>
          Envío a domicilio o recoge en sucursal. Elige la opción que más te convenga en el checkout.
        </span>
      ),
    },
    {
      id: 'fitment',
      content: (
        <span>
          Selecciona tu vehículo para ver piezas compatibles y comprar con confianza.
        </span>
      ),
    },
  ];

  useEffect(() => {
    if (paused || messages.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [paused, messages.length]);

  const goPrev = () => setIndex((prev) => (prev === 0 ? messages.length - 1 : prev - 1));
  const goNext = () => setIndex((prev) => (prev + 1) % messages.length);

  return (
    <div
      className="w-full bg-neutral-900 text-white text-xs sm:text-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-label="Promociones"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-center gap-3 relative min-h-[36px]">
        {messages.length > 1 && (
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-2 sm:left-4 p-0.5 rounded hover:bg-white/10 transition-colors"
            aria-label="Mensaje anterior"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
        )}

        <div className="text-center px-8 sm:px-12 leading-snug" aria-live="polite">
          {messages[index]?.content}
        </div>

        {messages.length > 1 && (
          <button
            type="button"
            onClick={goNext}
            className="absolute right-2 sm:right-4 p-0.5 rounded hover:bg-white/10 transition-colors"
            aria-label="Mensaje siguiente"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
