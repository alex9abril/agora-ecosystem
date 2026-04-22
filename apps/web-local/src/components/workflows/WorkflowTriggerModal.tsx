import { useEffect, useState, type FormEvent } from 'react';
import type { Node } from '@xyflow/react';

export type ScheduleKind = 'daily' | 'weekly' | 'monthly';

const WEEKDAYS: { v: number; l: string }[] = [
  { v: 0, l: 'Do' },
  { v: 1, l: 'Lu' },
  { v: 2, l: 'Ma' },
  { v: 3, l: 'Mi' },
  { v: 4, l: 'Ju' },
  { v: 5, l: 'Vi' },
  { v: 6, l: 'Sá' },
];

function padTime(t: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return t;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

function buildCronSummary(
  kind: ScheduleKind,
  times: string[],
  weekDays: number[],
  weeklyTime: string,
  monthDay: number,
  monthlyTime: string,
): string {
  if (kind === 'daily' && times.length) {
    const t = times.map(padTime);
    if (t.every((x) => /:00$/.test(x))) {
      const hours = t.map((x) => parseInt(x.split(':')[0] || '0', 10));
      return `0 ${hours.join(',')} * * *`;
    }
    const f = t[0]!;
    const [h, m] = f.split(':');
    return `${parseInt(m || '0', 10)} ${parseInt(h || '9', 10)} * * *`;
  }
  if (kind === 'weekly' && weekDays.length) {
    const t = padTime(weeklyTime || '09:00');
    const [h, m] = t.split(':');
    return `${parseInt(m || '0', 10)} ${parseInt(h || '9', 10)} * * ${weekDays.join(',')}`;
  }
  if (kind === 'monthly') {
    const t = padTime(monthlyTime || '09:00');
    const [h, m] = t.split(':');
    const d = Math.min(31, Math.max(1, monthDay));
    return `${parseInt(m || '0', 10)} ${parseInt(h || '9', 10)} ${d} * *`;
  }
  return '0 9 * * *';
}

export function scheduleSummaryText(data: Record<string, unknown> | undefined): string {
  if (!data) return '';
  const kind = data.scheduleKind as ScheduleKind | undefined;
  if (kind === 'daily' && Array.isArray(data.times) && data.times.length) {
    return `Cada día: ${(data.times as string[]).join(', ')}`;
  }
  if (kind === 'weekly' && Array.isArray(data.weekDays) && data.weekDays.length) {
    const names = WEEKDAYS.filter((w) => (data.weekDays as number[]).includes(w.v)).map((w) => w.l);
    return `Semanal ${names.join(', ')} a las ${(data.weeklyTime as string) || '—'}`;
  }
  if (kind === 'monthly') {
    return `Mensual día ${data.monthDay} a las ${(data.monthlyTime as string) || '—'}`;
  }
  return (data.cron as string) || 'Programado';
}

type Mode = 'manual' | 'schedule';

type Props = {
  state: { node: Node } | null;
  onClose: () => void;
  onSave: (nodeId: string, payload: { type: 'triggerManual' | 'triggerSchedule'; data: Record<string, unknown> }) => void;
};

export function WorkflowTriggerModal({ state, onClose, onSave }: Props) {
  const [label, setLabel] = useState('');
  const [mode, setMode] = useState<Mode>('manual');
  const [scheduleKind, setScheduleKind] = useState<ScheduleKind>('daily');
  const [times, setTimes] = useState<string[]>(['09:00']);
  const [weekDays, setWeekDays] = useState<number[]>([1]);
  const [weeklyTime, setWeeklyTime] = useState('09:00');
  const [monthDay, setMonthDay] = useState(1);
  const [monthlyTime, setMonthlyTime] = useState('09:00');

  useEffect(() => {
    if (!state) return;
    const n = state.node;
    const d = (n.data || {}) as Record<string, unknown>;
    setLabel((d.label as string) || 'Inicio');
    const m = n.type === 'triggerSchedule' ? 'schedule' : 'manual';
    setMode(m);
    setScheduleKind((d.scheduleKind as ScheduleKind) || 'daily');
    setTimes(Array.isArray(d.times) && d.times.length ? (d.times as string[]).map(padTime) : ['09:00']);
    setWeekDays(Array.isArray(d.weekDays) && d.weekDays.length ? (d.weekDays as number[]) : [1]);
    setWeeklyTime(padTime((d.weeklyTime as string) || '09:00'));
    setMonthDay(typeof d.monthDay === 'number' ? d.monthDay : 1);
    setMonthlyTime(padTime((d.monthlyTime as string) || '09:00'));
  }, [state]);

  if (!state) return null;

  const addTime = () => setTimes((t) => [...t, '12:00']);
  const setTime = (i: number, v: string) => setTimes((t) => t.map((x, j) => (j === i ? v : x)));
  const removeTime = (i: number) => setTimes((t) => t.filter((_, j) => j !== i));

  const toggleWeek = (v: number) => {
    setWeekDays((wd) => (wd.includes(v) ? wd.filter((x) => x !== v) : [...wd, v].sort((a, b) => a - b)));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'manual') {
      onSave(state.node.id, {
        type: 'triggerManual',
        data: { label: label || 'Inicio' },
      });
    } else {
      const t = times.map(padTime).filter(Boolean);
      const data: Record<string, unknown> = {
        label: label || 'Inicio',
        scheduleKind,
        times: scheduleKind === 'daily' ? t : undefined,
        weekDays: scheduleKind === 'weekly' ? weekDays : undefined,
        weeklyTime: scheduleKind === 'weekly' ? padTime(weeklyTime) : undefined,
        monthDay: scheduleKind === 'monthly' ? monthDay : undefined,
        monthlyTime: scheduleKind === 'monthly' ? padTime(monthlyTime) : undefined,
        cron: buildCronSummary(
          scheduleKind,
          scheduleKind === 'daily' ? t : ['09:00'],
          weekDays,
          weeklyTime,
          monthDay,
          monthlyTime,
        ),
      };
      onSave(state.node.id, { type: 'triggerSchedule', data });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 dark:bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wf-trigger-title"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 shadow-xl p-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="wf-trigger-title" className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
          Disparo del flujo
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          El flujo siempre comienza aquí. Elige si se ejecuta solo a mano o con una programación.
        </p>
        <label className="block text-xs text-gray-500 mb-0.5">Etiqueta</label>
        <input
          className="w-full rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm mb-4"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <div className="space-y-2 mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
            <input
              type="radio"
              name="wm"
              checked={mode === 'manual'}
              onChange={() => setMode('manual')}
            />
            Manual
          </label>
          <p className="ml-6 text-xs text-gray-500">Solo al pulsar &quot;Ejecutar&quot; o desde un disparo explícito.</p>
          <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
            <input
              type="radio"
              name="wm"
              checked={mode === 'schedule'}
              onChange={() => setMode('schedule')}
            />
            Programado
          </label>
        </div>
        {mode === 'schedule' && (
          <div className="mb-4 pl-1 space-y-3 border-l-2 border-amber-400/50 pl-3">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { k: 'daily' as const, t: 'Diario' },
                  { k: 'weekly' as const, t: 'Semanal' },
                  { k: 'monthly' as const, t: 'Mensual' },
                ] as const
              ).map(({ k, t }) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setScheduleKind(k)}
                  className={`px-2 py-1 rounded text-xs ${
                    scheduleKind === k
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100'
                      : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {scheduleKind === 'daily' && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Horas del mismo día (varias ejecuciones)</p>
                {times.map((tm, i) => (
                  <div key={i} className="flex gap-2 mb-1">
                    <input
                      type="time"
                      className="rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1 text-sm"
                      value={tm}
                      onChange={(e) => setTime(i, e.target.value)}
                    />
                    {times.length > 1 && (
                      <button type="button" className="text-xs text-red-600" onClick={() => removeTime(i)}>
                        Quitar
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addTime} className="text-xs text-sky-600 dark:text-sky-400 mt-1">
                  + Añadir hora
                </button>
              </div>
            )}
            {scheduleKind === 'weekly' && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Días de la semana</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {WEEKDAYS.map(({ v, l }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => toggleWeek(v)}
                      className={`w-8 h-8 rounded text-xs ${
                        weekDays.includes(v) ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-neutral-800'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <label className="text-xs text-gray-500">Hora</label>
                <input
                  type="time"
                  className="block rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1 text-sm"
                  value={weeklyTime}
                  onChange={(e) => setWeeklyTime(e.target.value)}
                />
              </div>
            )}
            {scheduleKind === 'monthly' && (
              <div>
                <label className="text-xs text-gray-500">Día del mes (1–31)</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  className="block w-full rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1 text-sm mb-2"
                  value={monthDay}
                  onChange={(e) => setMonthDay(Number(e.target.value))}
                />
                <label className="text-xs text-gray-500">Hora</label>
                <input
                  type="time"
                  className="block rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1 text-sm"
                  value={monthlyTime}
                  onChange={(e) => setMonthlyTime(e.target.value)}
                />
              </div>
            )}
            <p className="text-[10px] text-gray-400 font-mono break-all">
              Vista previa cron: {buildCronSummary(scheduleKind, times, weekDays, weeklyTime, monthDay, monthlyTime)}
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-neutral-700">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded border border-gray-300 dark:border-neutral-600 text-sm"
          >
            Cancelar
          </button>
          <button type="submit" className="px-3 py-1.5 rounded bg-black text-white text-sm">
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
