/**
 * Proceso e integraciones de Agora
 *
 * Documentación orientada al equipo de desarrollo del distribuidor que evalúa
 * integración bidireccional. Expone los procesos internos de Agora y los puntos
 * de intercambio por dominio, sin prescribir qué debe construir el distribuidor.
 *
 * Ruta: http://localhost:3008/documentacion/proceso
 */

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DocShell } from '../../components/documentacion/DocShell';
import { IntegracionDomainSection } from '../../components/documentacion/IntegracionDomainSection';
import { INTEGRATION_DOMAINS } from '../../components/documentacion/integraciones-data';
import { ProcesoTimeline } from '../../components/documentacion/ProcesoTimeline';

const DOMAIN_NAV = INTEGRATION_DOMAINS.map((d) => ({ id: d.id, label: d.title }));

export default function ProcesoAgoraPage() {
  const [activeDomain, setActiveDomain] = useState<string>(DOMAIN_NAV[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveDomain(visible[0].target.id);
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    );
    DOMAIN_NAV.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <Head>
        <title>Proceso e integraciones — Documentación · Ágora Developers</title>
        <meta
          name="description"
          content="Procesos e integraciones de Agora Marketplace para equipos de desarrollo: catálogo, clientes, pedidos, pagos, logística y facturación."
        />
        <meta name="robots" content="noindex" />
      </Head>

      <DocShell active="proceso">
        <div
          className="min-h-[calc(100vh-4rem)]"
          style={{
            background:
              'radial-gradient(circle at 5% 0%, rgba(124, 58, 237, 0.10), transparent 38%), radial-gradient(circle at 95% 5%, rgba(6, 182, 212, 0.10), transparent 32%), radial-gradient(circle at 50% 100%, rgba(244, 63, 94, 0.06), transparent 38%), linear-gradient(180deg, #f5f8ff 0%, #eef4ff 55%, #fff5fb 100%)',
          }}
        >
          <div className="mx-auto flex max-w-[1200px] gap-8 px-5 py-10 sm:py-14">
            {/* Sidebar de dominios */}
            <aside className="hidden w-52 shrink-0 lg:block">
              <nav className="sticky top-24 space-y-1">
                <div className="mb-3 px-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Dominios
                </div>
                {DOMAIN_NAV.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className={`block w-full rounded-lg px-2.5 py-2 text-left text-[13px] transition ${
                      activeDomain === item.id
                        ? 'bg-white font-semibold text-violet-800 shadow-sm'
                        : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                <div className="my-4 h-px bg-slate-200/80" />
                <button
                  onClick={() => scrollTo('flujo-pedido')}
                  className="block w-full rounded-lg px-2.5 py-2 text-left text-[13px] text-slate-600 transition hover:bg-white/60 hover:text-slate-900"
                >
                  Flujo del pedido
                </button>
                <Link
                  href="/documentacion"
                  className="mt-4 block px-2.5 text-[13px] font-semibold text-slate-500 hover:text-slate-900"
                >
                  ← Documentación técnica
                </Link>
              </nav>
            </aside>

            <main className="min-w-0 flex-1">
              {/* Hero */}
              <div className="mb-10 border-b border-slate-200/80 pb-10">
                <Link
                  href="/documentacion"
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 transition hover:text-slate-900 lg:hidden"
                >
                  ← Volver a documentación
                </Link>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-[12px] font-medium text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                  Para equipos de integración
                </div>
                <h1 className="mt-4 font-display text-[32px] font-bold leading-[1.12] tracking-tight text-slate-900 sm:text-[40px]">
                  Procesos e integraciones de Agora
                </h1>
                <p className="mt-4 max-w-3xl text-[17px] leading-7 text-slate-600">
                  Esta guía expone <strong>cómo opera Agora por dentro</strong> y dónde ocurren los
                  intercambios de datos con sistemas externos. Está pensada para que tu equipo de
                  desarrollo evalúe una integración <strong>bidireccional</strong>: hoy el flujo
                  principal de catálogo es unidireccional (Agora recibe productos), pero el ecosistema
                  genera y consume información en catálogo, clientes, pedidos, pagos, logística y
                  facturación.
                </p>

                {/* Modelo de comunicación */}
                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-5">
                    <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
                      Modelo actual (referencia)
                    </div>
                    <div className="mt-3 flex items-center gap-3 font-display text-[15px] font-semibold text-slate-800">
                      <span className="rounded-lg bg-slate-100 px-3 py-2">Tu DMS/ERP</span>
                      <span className="text-slate-400">→</span>
                      <span className="rounded-lg bg-blue-50 px-3 py-2 text-blue-800">Agora</span>
                    </div>
                    <p className="mt-3 text-[13px] leading-6 text-slate-500">
                      Agora consulta o recibe el catálogo de productos. El enriquecimiento,
                      la tienda, el checkout y la operación los resuelve la plataforma.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-blue-50 p-5">
                    <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-violet-600">
                      Ámbito de evaluación bidireccional
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {INTEGRATION_DOMAINS.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => scrollTo(d.id)}
                          className="rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-[12px] font-semibold text-violet-800 transition hover:bg-white"
                        >
                          {d.title}
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-[13px] leading-6 text-violet-900/70">
                      Cada dominio tiene su proceso interno, integraciones activas y puntos donde
                      los datos cruzan el límite entre Agora y tu sistema.
                    </p>
                  </div>
                </div>
              </div>

              {/* Leyenda de dirección */}
              <div className="mb-8 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
                <span className="text-[12px] font-semibold text-slate-500">Dirección del dato:</span>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                  → Agora recibe
                </span>
                <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-700">
                  ← Agora emite
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                  ↔ Intercambio
                </span>
              </div>

              {/* Dominios */}
              <div className="space-y-8">
                {INTEGRATION_DOMAINS.map((domain) => (
                  <IntegracionDomainSection key={domain.id} domain={domain} />
                ))}
              </div>

              {/* Timeline del pedido */}
              <section
                id="flujo-pedido"
                className="scroll-mt-28 mt-14 rounded-[24px] border border-slate-200 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:p-8"
              >
                <div className="mb-8 flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Flujo transversal
                    </span>
                    <h2 className="mt-2 font-display text-[26px] font-bold text-slate-900">
                      Recorrido de un pedido en Agora
                    </h2>
                    <p className="mt-2 max-w-2xl text-[15px] leading-7 text-slate-600">
                      Vista de extremo a extremo de cómo se conectan los dominios anteriores cuando
                      un cliente compra. Cada etapa avanza con las integraciones de Agora; la sucursal
                      interviene solo en preparación y entrega.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
                    6 etapas
                  </span>
                </div>
                <ProcesoTimeline />
              </section>

              {/* Cierre */}
              <div className="mt-10 rounded-2xl border border-slate-200 bg-white/80 p-6">
                <h3 className="font-display text-[18px] font-bold text-slate-900">
                  Cómo usar esta guía en tu evaluación
                </h3>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  <li className="flex gap-3 text-[14px] leading-relaxed text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                    Revisa el <strong>proceso en Agora</strong> de cada dominio para entender qué
                    resuelve la plataforma sin intervención externa.
                  </li>
                  <li className="flex gap-3 text-[14px] leading-relaxed text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    Identifica los <strong>puntos de intercambio</strong> donde tu sistema podría
                    conectarse en una integración bidireccional.
                  </li>
                  <li className="flex gap-3 text-[14px] leading-relaxed text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    Consulta las <strong>integraciones que ya opera Agora</strong> (pasarelas,
                    logística, workflows) para no duplicar lo que la plataforma ya cubre.
                  </li>
                  <li className="flex gap-3 text-[14px] leading-relaxed text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    Para contratos de datos y modelos técnicos, continúa en la{' '}
                    <Link href="/documentacion" className="font-semibold text-violet-700 hover:underline">
                      documentación técnica
                    </Link>
                    .
                  </li>
                </ul>
              </div>

              <footer className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-slate-200/80 pt-8 text-[13px] text-slate-400 sm:flex-row sm:items-center">
                <span>© {new Date().getFullYear()} Ágora · Procesos e integraciones</span>
                <div className="flex flex-wrap gap-4">
                  <Link href="/documentacion" className="font-semibold text-slate-500 hover:text-slate-900">
                    Documentación técnica →
                  </Link>
                  <Link
                    href="/documentacion#contrato-datos"
                    className="text-slate-500 hover:text-slate-900"
                  >
                    Contrato de datos
                  </Link>
                </div>
              </footer>
            </main>
          </div>
        </div>
      </DocShell>
    </>
  );
}
