import React from 'react';
import Link from 'next/link';

export type DocSection = 'documentacion' | 'proceso';

type DocShellProps = {
  active: DocSection;
  children: React.ReactNode;
  /** Contenido opcional a la derecha del header (ej. búsqueda) */
  headerExtra?: React.ReactNode;
};

const TABS: { id: DocSection; href: string; label: string }[] = [
  { id: 'documentacion', href: '/documentacion', label: 'Documentación' },
  { id: 'proceso', href: '/documentacion/proceso', label: 'Procesos e integraciones' },
];

export function DocShell({ active, children, headerExtra }: DocShellProps) {
  return (
    <div
      className="min-h-screen text-slate-800"
      style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
    >
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-4 px-5">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/agora_logo_black.png" alt="Ágora" className="h-7 w-auto" />
            <span className="hidden items-center gap-2 sm:flex">
              <span className="h-5 w-px bg-slate-300" />
              <span className="font-display text-[15px] font-semibold tracking-tight text-slate-900">
                Developers
              </span>
            </span>
          </Link>

          <nav
            className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 md:flex"
            aria-label="Secciones de documentación"
          >
            {TABS.map((tab) => {
              const isActive = active === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {headerExtra}
            <Link
              href="/documentacion#soporte"
              className="hidden rounded-lg bg-slate-900 px-3.5 py-2 text-[13.5px] font-semibold text-white transition hover:bg-slate-700 sm:inline-block"
            >
              Contactar al equipo
            </Link>
          </div>
        </div>

        {/* Tabs móviles */}
        <nav
          className="flex gap-1 border-t border-slate-100 px-5 py-2 md:hidden"
          aria-label="Secciones de documentación"
        >
          {TABS.map((tab) => {
            const isActive = active === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex-1 rounded-lg px-3 py-2 text-center text-[13px] font-semibold transition ${
                  isActive ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {children}
    </div>
  );
}
