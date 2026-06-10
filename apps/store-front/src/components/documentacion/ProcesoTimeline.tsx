import React from 'react';
import {
  BULLET_GRADIENTS,
  PROCESO_STEPS,
  type TimelineBlockVariant,
  type TimelineStep,
} from './proceso-data';

function TimelineTag({
  label,
  variant = 'default',
  dark = false,
}: {
  label: string;
  variant?: 'default' | 'crit' | 'fiscal';
  dark?: boolean;
}) {
  const styles = {
    default: dark
      ? 'bg-white/10 text-white'
      : 'bg-blue-50 text-blue-700',
    crit: dark ? 'bg-white/10 text-white' : 'bg-rose-50 text-rose-600',
    fiscal: dark ? 'bg-white/10 text-white' : 'bg-emerald-50 text-teal-700',
  }[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${styles}`}
    >
      {label}
    </span>
  );
}

function DetailBlock({
  title,
  items,
  variant = 'default',
  dark = false,
}: {
  title: string;
  items: string[];
  variant?: TimelineBlockVariant;
  dark?: boolean;
}) {
  const blockStyles = {
    default: dark
      ? 'border-white/10 bg-white/[0.06]'
      : 'border-blue-500/10 bg-blue-500/[0.05]',
    control: dark
      ? 'border-white/10 bg-white/[0.06]'
      : 'border-rose-500/15 bg-rose-500/[0.06]',
    result: dark
      ? 'border-white/10 bg-white/[0.06]'
      : 'border-emerald-500/15 bg-emerald-500/[0.07]',
  }[variant];

  const titleStyles = {
    default: dark ? 'text-white/70' : 'text-blue-600',
    control: dark ? 'text-white/70' : 'text-rose-600',
    result: dark ? 'text-white/70' : 'text-teal-700',
  }[variant];

  const dotStyles = {
    default: dark ? 'bg-white/60' : 'bg-blue-600',
    control: dark ? 'bg-white/60' : 'bg-rose-500',
    result: dark ? 'bg-white/60' : 'bg-emerald-500',
  }[variant];

  return (
    <div className={`rounded-2xl border p-3.5 ${blockStyles}`}>
      <h4
        className={`mb-2 text-[11px] font-bold uppercase tracking-[0.12em] ${titleStyles}`}
      >
        {title}
      </h4>
      <ul className="grid gap-1.5">
        {items.map((item) => (
          <li
            key={item}
            className={`grid grid-cols-[9px_1fr] gap-2 text-[13px] leading-snug ${
              dark ? 'text-white/85' : 'text-slate-700'
            }`}
          >
            <span className={`mt-[7px] h-1.5 w-1.5 rounded-full ${dotStyles}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TimelineStepCard({ step, index }: { step: TimelineStep; index: number }) {
  const dark = step.final;
  const bulletGradient = BULLET_GRADIENTS[index] ?? BULLET_GRADIENTS[0];

  return (
    <article className={`relative grid grid-cols-[64px_1fr] gap-4 py-3.5 sm:grid-cols-[130px_1fr] sm:gap-7`}>
      <div className="relative flex justify-center pt-3.5 sm:w-[130px]">
        <div
          className={`relative z-[2] flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-[14px] font-black text-white shadow-[0_0_0_5px_white] sm:h-14 sm:w-14 sm:text-base ${bulletGradient}`}
        >
          {step.n}
        </div>
      </div>

      <div
        className={`relative rounded-[22px] border p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] sm:p-6 ${
          dark
            ? 'border-slate-800/60 bg-gradient-to-br from-[#0b1220] via-[#1e1b4b] to-[#312e81] text-white'
            : 'border-slate-200 bg-white'
        }`}
      >
        {!dark && (
          <span
            className="absolute left-[-7px] top-8 hidden h-4 w-4 rotate-[-45deg] rounded-tl border-l border-t border-slate-200 bg-white sm:block"
            aria-hidden
          />
        )}

        <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
          <h3
            className={`font-display text-lg font-bold sm:text-[19px] ${
              dark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {step.title}
          </h3>
          {step.tags.map((tag) => (
            <TimelineTag key={tag.label} label={tag.label} variant={tag.variant} dark={dark} />
          ))}
        </div>

        <p
          className={`text-[14.5px] leading-relaxed ${
            dark ? 'text-white' : 'text-slate-700'
          }`}
        >
          {step.lead}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {step.blocks.map((block) => (
            <DetailBlock
              key={block.title}
              title={block.title}
              items={block.items}
              variant={block.variant}
              dark={dark}
            />
          ))}
        </div>
      </div>
    </article>
  );
}

export function ProcesoTimeline() {
  return (
    <div className="relative mx-auto max-w-[980px] px-1 py-2">
      <div
        className="pointer-events-none absolute bottom-0 left-8 top-0 w-1 rounded-full bg-gradient-to-b from-blue-600 via-cyan-500 via-30% via-violet-600 via-55% via-rose-500 via-78% to-emerald-500 opacity-85 sm:left-16"
        aria-hidden
      />
      <div aria-label="Línea de tiempo del flujo">
        {PROCESO_STEPS.map((step, index) => (
          <TimelineStepCard key={step.n} step={step} index={index} />
        ))}
      </div>
    </div>
  );
}
