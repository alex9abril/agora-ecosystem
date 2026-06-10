import React from 'react';
import {
  COLOR_MAP,
  DIRECTION_LABELS,
  type IntegrationDomain,
} from './integraciones-data';

function DirectionBadge({ direction }: { direction: IntegrationDomain['directionToday'] }) {
  const styles = {
    'agora-in': 'bg-blue-50 text-blue-700 border-blue-200',
    'agora-out': 'bg-violet-50 text-violet-700 border-violet-200',
    bidirectional: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }[direction];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] ${styles}`}
    >
      {DIRECTION_LABELS[direction]}
    </span>
  );
}

function MiniList({
  title,
  items,
  variant = 'default',
}: {
  title: string;
  items: string[];
  variant?: 'default' | 'agora' | 'exchange';
}) {
  const titleColor = {
    default: 'text-slate-500',
    agora: 'text-teal-700',
    exchange: 'text-blue-700',
  }[variant];

  const dotColor = {
    default: 'bg-slate-400',
    agora: 'bg-teal-500',
    exchange: 'bg-blue-500',
  }[variant];

  return (
    <div>
      <h4 className={`mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] ${titleColor}`}>
        {title}
      </h4>
      <ul className="mt-2 grid gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="grid grid-cols-[8px_1fr] gap-2 text-[13px] leading-snug text-slate-600"
          >
            <span className={`mt-[7px] h-1.5 w-1.5 rounded-full ${dotColor}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function IntegracionDomainSection({ domain }: { domain: IntegrationDomain }) {
  const colors = COLOR_MAP[domain.color] ?? COLOR_MAP.blue;

  return (
    <section
      id={domain.id}
      className={`scroll-mt-28 rounded-[24px] border bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur sm:p-8 ${colors.border}`}
    >
      <div className="flex flex-col gap-5 border-b border-slate-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl font-black text-white shadow-lg ${colors.icon}`}
          >
            {domain.icon}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-[22px] font-bold text-slate-900">{domain.title}</h2>
              <DirectionBadge direction={domain.directionToday} />
            </div>
            <p className="mt-1 text-[15px] text-slate-600">{domain.subtitle}</p>
            <p className="mt-2 text-[13px] font-medium text-slate-500">{domain.directionLabel}</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
          Proceso en Agora
        </h3>
        <ol className="mt-3 grid gap-3">
          {domain.proceso.map((step, i) => (
            <li key={step} className="flex gap-3">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${colors.tag}`}
              >
                {i + 1}
              </span>
              <p className="text-[14px] leading-relaxed text-slate-700">{step}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Integraciones que opera Agora
          </h3>
          <ul className="mt-3 grid gap-3">
            {domain.integracionesAgora.map((item) => (
              <li key={item.name} className="rounded-xl border border-white bg-white p-3 shadow-sm">
                <div className="font-display text-[14px] font-semibold text-slate-900">
                  {item.name}
                </div>
                <p className="mt-1 text-[13px] leading-snug text-slate-500">{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-700">
            Puntos de intercambio
          </h3>
          <ul className="mt-3 grid gap-3">
            {domain.puntosIntercambio.map((item) => (
              <li key={item.label}>
                <div className="font-display text-[14px] font-semibold text-slate-900">
                  {item.label}
                </div>
                <p className="mt-1 text-[13px] leading-snug text-slate-600">{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-4">
          <MiniList title="Lo que resuelve Agora (no requiere integración)" items={domain.enAgora} variant="agora" />
        </div>
      </div>
    </section>
  );
}
