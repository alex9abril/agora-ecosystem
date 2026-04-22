import { useContext, type ReactNode } from 'react';
import { Handle, Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { WorkflowCanvasEditContext } from './workflow-canvas-context';
import { scheduleSummaryText } from './WorkflowTriggerModal';

const box =
  'rounded-lg border-2 min-w-[160px] max-w-[220px] bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-600 shadow-sm relative';
const boxTrigger =
  'rounded-lg border-2 min-w-[160px] max-w-[220px] bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-600 shadow-sm relative cursor-pointer';

const title = 'text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 leading-tight';
const label = 'text-sm font-medium text-gray-900 dark:text-gray-100 break-words';

type IconBadgeProps = { className: string; children: ReactNode };
function IconBadge({ className, children }: IconBadgeProps) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-inner ${className}`}
    >
      {children}
    </div>
  );
}

function IconManualTrigger() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M10.2 8.2L15.2 12l-5 3.8V8.2z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconSchedule() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  );
}

function IconDatabase() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5" />
      <path d="M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6" />
    </svg>
  );
}

function IconOutbox() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 7v6" />
      <path d="M8.5 12.2L12 16l3.5-3.8" />
    </svg>
  );
}

function IconHttp() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconSliders() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" aria-hidden>
      <line x1="2" y1="8" x2="22" y2="8" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="16" x2="22" y2="16" />
      <circle cx="9" cy="8" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="11" cy="16" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function isTriggerNodeType(t: string | undefined) {
  return t === 'triggerManual' || t === 'triggerSchedule';
}

function NodeDeleteButton({ id, hidden }: { id: string; hidden?: boolean }) {
  const { deleteElements } = useReactFlow();
  const { readOnly } = useContext(WorkflowCanvasEditContext);
  if (readOnly || hidden) return null;
  return (
    <button
      type="button"
      title="Eliminar nodo"
      aria-label="Eliminar nodo"
      onClick={(e) => {
        e.stopPropagation();
        void deleteElements({ nodes: [{ id }] });
      }}
      className="absolute -top-2 -right-2 z-20 flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 dark:border-neutral-500 bg-white dark:bg-neutral-800 text-gray-500 text-sm leading-none shadow hover:bg-red-50 hover:border-red-300 hover:text-red-600"
    >
      ×
    </button>
  );
}

export function TriggerManualNode(props: NodeProps) {
  const d = (props.data || {}) as { label?: string };
  return (
    <div className={`${boxTrigger} border-sky-500/50 dark:border-sky-400/50 ring-1 ring-sky-200/60 dark:ring-sky-500/25`}>
      <NodeDeleteButton id={props.id} hidden />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-sky-500 dark:!bg-sky-300" />
      <div className="p-2 pr-1 pl-2">
        <div className="flex gap-2.5">
          <IconBadge className="bg-gradient-to-br from-sky-100 to-cyan-100 text-sky-600 dark:from-sky-500/30 dark:to-cyan-500/20 dark:text-sky-200">
            <IconManualTrigger />
          </IconBadge>
          <div className="min-w-0 flex-1">
            <div className={title}>Disparo manual</div>
            <div className={label}>{d.label || 'Inicio'}</div>
            <div className="mt-0.5 flex items-center gap-1 text-[9px] text-sky-600 dark:text-sky-300">
              <IconSliders />
              <span>Clic para configurar</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TriggerScheduleNode(props: NodeProps) {
  const d = (props.data || {}) as { label?: string; cron?: string; scheduleKind?: string };
  return (
    <div className={`${boxTrigger} border-amber-300/80 dark:border-amber-500/50 ring-1 ring-amber-200/50 dark:ring-amber-500/20`}>
      <NodeDeleteButton id={props.id} hidden />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-amber-500" />
      <div className="p-2 pr-1 pl-2">
        <div className="flex gap-2.5">
          <IconBadge className="bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 dark:from-amber-500/35 dark:to-orange-500/20 dark:text-amber-100">
            <IconSchedule />
          </IconBadge>
          <div className="min-w-0 flex-1">
            <div className={title}>Programado</div>
            <div className={label}>{d.label || 'Inicio'}</div>
            <p className="text-[11px] text-amber-800/90 dark:text-amber-200/90 mt-0.5 leading-snug">
              {scheduleSummaryText(d as Record<string, unknown>)}
            </p>
            {d.cron && (
              <div className="text-[9px] text-amber-600/80 dark:text-amber-300/80 mt-0.5 font-mono break-all">{d.cron}</div>
            )}
            <div className="mt-0.5 flex items-center gap-1 text-[9px] text-amber-800 dark:text-amber-200">
              <IconSliders />
              <span>Clic para configurar</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconCodeBrackets() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 4L3 9l5 5" />
      <path d="M16 4l5 5-5 5" />
    </svg>
  );
}

export function ConnectorMssqlNode(props: NodeProps) {
  const { readOnly } = useContext(WorkflowCanvasEditContext);
  const d = (props.data || {}) as { label?: string; query?: string; connectorId?: string };
  return (
    <div
      className={`${box} border-sky-200/90 dark:border-sky-600/50 ${!readOnly ? 'cursor-pointer' : ''}`}
      title={readOnly ? undefined : 'Clic para configurar conector y consulta'}
    >
      <NodeDeleteButton id={props.id} />
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-sky-500" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-sky-500" />
      <div className="p-2 pr-1 pl-2">
        <div className="flex gap-2.5">
          <IconBadge className="bg-gradient-to-br from-sky-100 to-indigo-100 text-sky-700 dark:from-sky-500/30 dark:to-indigo-500/25 dark:text-sky-100">
            <IconDatabase />
          </IconBadge>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className={title}>Origen de datos</span>
              <span className="text-[8px] uppercase font-semibold text-sky-500 dark:text-sky-400">MSSQL</span>
            </div>
            <div className={label}>{d.label || 'Consulta'}</div>
            {d.query && (
              <pre className="text-[10px] text-slate-600 dark:text-slate-300 mt-1 max-h-20 overflow-hidden whitespace-pre-wrap">
                {d.query.slice(0, 120)}
                {d.query.length > 120 ? '…' : ''}
              </pre>
            )}
            {!readOnly && (
              <p className="text-[9px] text-sky-600/80 dark:text-sky-400/80 mt-1">Clic para configurar</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SinkLogNode(props: NodeProps) {
  const d = (props.data || {}) as { label?: string };
  return (
    <div className={`${box} border-emerald-200/90 dark:border-emerald-600/50`}>
      <NodeDeleteButton id={props.id} />
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-emerald-500" />
      <div className="p-2 pr-1 pl-2">
        <div className="flex gap-2.5">
          <IconBadge className="bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 dark:from-emerald-500/30 dark:to-teal-500/20 dark:text-emerald-100">
            <IconOutbox />
          </IconBadge>
          <div className="min-w-0 flex-1">
            <div className={title}>Salida interna</div>
            <div className={label}>{d.label || 'Log / staging'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CodeBlockNode(props: NodeProps) {
  const d = (props.data || {}) as { label?: string; language?: string };
  return (
    <div className={`${box} border-amber-200/90 dark:border-amber-600/50`}>
      <NodeDeleteButton id={props.id} />
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-amber-500" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-amber-500" />
      <div className="p-2 pr-1 pl-2">
        <div className="flex gap-2.5">
          <IconBadge className="bg-gradient-to-br from-amber-100 to-yellow-100 text-amber-900 dark:from-amber-500/30 dark:to-yellow-500/15 dark:text-amber-100">
            <IconCodeBrackets />
          </IconBadge>
          <div className="min-w-0 flex-1">
            <div className={title}>Code</div>
            <div className={label}>{d.label || 'Paso'}</div>
            <div className="text-[10px] text-amber-700/90 dark:text-amber-300/90 mt-0.5">Configuración en siguientes versiones</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HttpRequestNode(props: NodeProps) {
  const d = (props.data || {}) as { label?: string };
  return (
    <div className={`${box} border-violet-200/80 dark:border-violet-600/45`}>
      <NodeDeleteButton id={props.id} />
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-violet-500" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-violet-500" />
      <div className="p-2 pr-1 pl-2">
        <div className="flex gap-2.5">
          <IconBadge className="bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700 dark:from-violet-500/25 dark:to-fuchsia-500/20 dark:text-violet-200">
            <IconHttp />
          </IconBadge>
          <div className="min-w-0 flex-1">
            <div className={title}>HTTP request</div>
            <div className={label}>{d.label || 'Request'}</div>
            <div className="text-[10px] text-violet-600/90 dark:text-violet-300/90 mt-0.5">Configuración en siguientes versiones</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const workflowNodeTypes = {
  triggerManual: TriggerManualNode,
  triggerSchedule: TriggerScheduleNode,
  connectorMssql: ConnectorMssqlNode,
  sinkLog: SinkLogNode,
  code: CodeBlockNode,
  httpRequest: HttpRequestNode,
  /** @deprecated en favor de httpRequest; se mantiene para definiciones antiguas */
  httpPlaceholder: HttpRequestNode,
};

type FlowOpts = { readOnly?: boolean };

function normalizeNode(n: Node) {
  const t = n.type;
  return {
    ...n,
    deletable: isTriggerNodeType(t) ? false : n.deletable !== false,
  } as Node;
}

function normalizeEdge(e: { id: string; source: string; target: string; type?: string; [k: string]: unknown }, readOnly: boolean) {
  if (readOnly) {
    if (e.type === 'deletableStep') {
      return { ...e, type: 'smoothstep' } as never;
    }
    if (!e.type) return { ...e, type: 'smoothstep' } as never;
    return e as never;
  }
  if (e.type === 'smoothstep' || e.type === 'deletableStep' || !e.type) {
    return { ...e, type: 'deletableStep' } as never;
  }
  return e as never;
}

export function toFlowElements(
  def: Record<string, unknown>,
  opts?: FlowOpts,
): { nodes: Node[]; edges: any[]; viewport: any } {
  const readOnly = opts?.readOnly === true;
  const rawNodes = (def.nodes as Node[] | undefined) || [];
  const rawEdges = (def.edges as any[] | undefined) || [];
  const viewport = (def.viewport as { x: number; y: number; zoom: number }) || { x: 0, y: 0, zoom: 1 };
  return {
    nodes: rawNodes.map((n) => normalizeNode(n)),
    edges: rawEdges.map((e) => normalizeEdge(e, readOnly)),
    viewport,
  };
}
