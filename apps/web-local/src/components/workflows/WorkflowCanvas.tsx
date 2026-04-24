import Image from 'next/image';
import {
  forwardRef,
  useImperativeHandle,
  useCallback,
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import type { ReactNode } from 'react';
import agoraLogoBlack from '@/images/agora_logo_black.png';
import BranchDropdown from '@/components/layout/BranchDropdown';
import {
  Background,
  BackgroundVariant,
  Connection,
  ControlButton,
  Controls,
  Edge,
  MiniMap,
  Node,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import type { OnBeforeDelete } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ConnectorRow } from '@/lib/integration-workflows';
import { DeletableStepEdge } from './DeletableStepEdge';
import { WorkflowAddNodeUi } from './WorkflowAddNodeUi';
import { WorkflowPlayOverlay } from './WorkflowPlayOverlay';
import { WorkflowTriggerModal } from './WorkflowTriggerModal';
import { workflowNodeTypes, toFlowElements, isTriggerNodeType } from './workflow-nodes';
import { WorkflowMssqlNodePanel } from './WorkflowMssqlNodePanel';
import { WorkflowCodeNodePanel } from './WorkflowCodeNodePanel';
import { WorkflowSinkAutomationNodePanel } from './WorkflowSinkAutomationNodePanel';
import { WorkflowCanvasEditContext } from './workflow-canvas-context';
import { buildStepInput, type WorkflowRunStep } from './workflow-run-types';

const EDGE_EDIT_TYPE = 'deletableStep';

export type WorkflowCanvasHandle = {
  getDefinition: () => Record<string, unknown>;
};

function DefinitionBridge({
  outerRef,
}: {
  outerRef: React.ForwardedRef<WorkflowCanvasHandle>;
}) {
  const { getNodes, getEdges, getViewport } = useReactFlow();
  useImperativeHandle(
    outerRef,
    () => ({
      getDefinition: () => {
        const vp = getViewport();
        return {
          nodes: getNodes() as Node[],
          edges: getEdges() as Edge[],
          viewport: { x: vp.x, y: vp.y, zoom: vp.zoom },
        } as Record<string, unknown>;
      },
    }),
    [getNodes, getEdges, getViewport],
  );
  return null;
}

function FitViewWhenMaxToggled({
  maximized,
  refitKey,
}: {
  maximized: boolean;
  /** Cambio de layout (p. ej. pestaña) mientras está maximizado: vuelve a encuadrar el grafo. */
  refitKey?: string;
}) {
  const { fitView } = useReactFlow();
  const skipFirst = useRef(true);
  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    const t = requestAnimationFrame(() => {
      void fitView({ padding: 0.12, duration: 220 });
    });
    return () => cancelAnimationFrame(t);
  }, [maximized, refitKey, fitView]);
  return null;
}

function MaximizeIcon() {
  return (
    <svg
      className="text-current"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v3" />
      <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg
      className="text-current"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 10V6a2 2 0 0 1 2-2h4" />
      <path d="M20 14v4a2 2 0 0 1-2 2h-4" />
      <path d="M4 14v4a2 2 0 0 0 2 2h4" />
      <path d="M20 10V6a2 2 0 0 0-2-2h-4" />
    </svg>
  );
}

function WorkflowFlowViewTabs({
  viewMode,
  onViewModeChange,
}: {
  viewMode: 'editor' | 'executions';
  onViewModeChange: (m: 'editor' | 'executions') => void;
}) {
  return (
    <div className="relative z-[202] flex shrink-0 items-center justify-center border-b border-gray-200 bg-gray-50/95 px-2 py-1.5 dark:border-neutral-600 dark:bg-neutral-800/90">
      <div
        className="inline-flex rounded-lg border border-gray-200 bg-gray-100/90 p-0.5 dark:border-neutral-600 dark:bg-neutral-800/90"
        role="tablist"
        aria-label="Vista del flujo"
      >
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'editor'}
          onClick={() => onViewModeChange('editor')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            viewMode === 'editor'
              ? 'bg-white text-gray-900 shadow dark:bg-neutral-700 dark:text-gray-100'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          Editor
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'executions'}
          onClick={() => onViewModeChange('executions')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            viewMode === 'executions'
              ? 'bg-white text-gray-900 shadow dark:bg-neutral-700 dark:text-gray-100'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          Ejecuciones
        </button>
      </div>
    </div>
  );
}

/** Barra al maximizar: mismo criterio que el layout (logo + sucursal vía BranchDropdown). */
function WorkflowCanvasMaximizeHeader() {
  return (
    <header className="relative z-[201] flex h-16 shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 dark:border-neutral-600 dark:bg-neutral-800">
      <Image
        src={agoraLogoBlack}
        alt="AGORA"
        width={96}
        height={28}
        className="h-7 w-auto max-w-[96px] flex-shrink-0 dark:invert"
        priority
      />
      <div className="flex min-w-0 flex-1 items-center justify-end">
        <BranchDropdown />
      </div>
    </header>
  );
}

type FlowInnerProps = {
  initialDefinition: Record<string, unknown>;
  readOnly?: boolean;
  businessId: string;
  /** Flujo guardado (integration.workflows.id) para metadatos en UI y ejecución en servidor. */
  integrationWorkflowId: string;
  outerRef: React.ForwardedRef<WorkflowCanvasHandle>;
  connectors: ConnectorRow[];
  onPlayRequest?: () => void;
  playRequestDisabled?: boolean;
  playRequestLoading?: boolean;
  /**
   * Resaltado e I/O de la última ejecución: `highlightNodeId` anilla el nodo activo
   * (animación o fila elegida en el inspector).
   */
  runExecution?: { steps: WorkflowRunStep[]; highlightNodeId: string | null } | null;
  /** Clic en nodo o en el vacío: resaltar qué paso de la última ejecución se quiere enfatizar. */
  onLastRunFocusNode?: (nodeId: string | null) => void;
  flowViewMode?: 'editor' | 'executions';
  onFlowViewModeChange?: (m: 'editor' | 'executions') => void;
  canvasMaximized?: boolean;
  onCanvasMaximizedChange?: (max: boolean) => void;
  /** Listado de ejecuciones: solo se muestra dentro del lienzo al maximizar en vista Ejecuciones. */
  executionsSidebar?: ReactNode;
};

function FlowSurface({
  initialDefinition,
  readOnly,
  businessId,
  integrationWorkflowId,
  outerRef,
  connectors,
  onPlayRequest,
  playRequestDisabled,
  playRequestLoading,
  runExecution,
  onLastRunFocusNode,
  flowViewMode,
  onFlowViewModeChange,
  canvasMaximized: canvasMaximizedProp,
  onCanvasMaximizedChange,
  executionsSidebar,
}: FlowInnerProps) {
  const initial = toFlowElements(initialDefinition, { readOnly });
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [triggerModal, setTriggerModal] = useState<Node | null>(null);
  const [mssqlPanelId, setMssqlPanelId] = useState<string | null>(null);
  const [codePanelId, setCodePanelId] = useState<string | null>(null);
  const [automationPanelId, setAutomationPanelId] = useState<string | null>(null);
  const [internalMaximized, setInternalMaximized] = useState(false);
  const isMaxControlled = canvasMaximizedProp !== undefined && onCanvasMaximizedChange != null;
  const canvasMaximized = isMaxControlled ? !!canvasMaximizedProp : internalMaximized;
  const setCanvasMaximized = useCallback(
    (next: boolean) => {
      if (isMaxControlled) onCanvasMaximizedChange?.(next);
      else setInternalMaximized(next);
    },
    [isMaxControlled, onCanvasMaximizedChange],
  );

  useEffect(() => {
    if (!canvasMaximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCanvasMaximized(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [canvasMaximized, setCanvasMaximized]);

  useEffect(() => {
    if (!canvasMaximized) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [canvasMaximized]);

  const mssqlNode = mssqlPanelId ? nodes.find((n) => n.id === mssqlPanelId) : null;
  const codeNode = codePanelId ? nodes.find((n) => n.id === codePanelId) : null;
  const automationNode = automationPanelId ? nodes.find((n) => n.id === automationPanelId) : null;

  const mssqlPreviousNode = useMemo(() => {
    if (!mssqlPanelId) return null;
    const e = edges.find((ed) => ed.target === mssqlPanelId);
    if (!e) return null;
    return nodes.find((n) => n.id === e.source) ?? null;
  }, [mssqlPanelId, edges, nodes]);

  const codePreviousNode = useMemo(() => {
    if (!codePanelId) return null;
    const e = edges.find((ed) => ed.target === codePanelId);
    if (!e) return null;
    return nodes.find((n) => n.id === e.source) ?? null;
  }, [codePanelId, edges, nodes]);

  const automationPreviousNode = useMemo(() => {
    if (!automationPanelId) return null;
    const e = edges.find((ed) => ed.target === automationPanelId);
    if (!e) return null;
    return nodes.find((n) => n.id === e.source) ?? null;
  }, [automationPanelId, edges, nodes]);

  useEffect(() => {
    if (mssqlPanelId && !mssqlNode) setMssqlPanelId(null);
  }, [mssqlPanelId, mssqlNode]);

  useEffect(() => {
    if (codePanelId && !codeNode) setCodePanelId(null);
  }, [codePanelId, codeNode]);

  useEffect(() => {
    if (automationPanelId && !automationNode) setAutomationPanelId(null);
  }, [automationPanelId, automationNode]);

  useEffect(() => {
    if (!runExecution) {
      setNodes((ns) =>
        ns.map((n) => {
          const d = { ...((n.data || {}) as Record<string, unknown>) };
          delete d.runExecution;
          delete d.executionFocus;
          return { ...n, data: d };
        }),
      );
      return;
    }
    const { steps, highlightNodeId } = runExecution;
    setNodes((ns) =>
      ns.map((n) => {
        const idx = steps.findIndex((s) => s.nodeId === n.id);
        const step = idx >= 0 ? steps[idx] : null;
        const d = { ...((n.data || {}) as Record<string, unknown>) };
        if (step) {
          d.runExecution = {
            input: buildStepInput(steps, idx),
            output: step.error ? null : step.result,
            error: step.error,
            logs: step.logs,
            stepIndex: idx,
            stepCount: steps.length,
          };
          d.executionFocus = highlightNodeId != null && n.id === highlightNodeId;
        } else {
          delete d.runExecution;
          delete d.executionFocus;
        }
        return { ...n, data: d };
      }),
    );
  }, [runExecution, setNodes]);

  const onConnect = useCallback(
    (c: Connection) => {
      if (readOnly) return;
      setEdges((eds) =>
        addEdge(
          { ...c, type: readOnly ? 'smoothstep' : EDGE_EDIT_TYPE, animated: false },
          eds,
        ),
      );
    },
    [readOnly, setEdges],
  );

  const onSaveMssqlNode = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)));
    },
    [setNodes],
  );

  const onSaveCodeNode = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)));
    },
    [setNodes],
  );

  const onSaveAutomationNode = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)));
    },
    [setNodes],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onLastRunFocusNode?.(node.id);
      if (readOnly) return;
      if (node.type === 'connectorMssql') {
        setMssqlPanelId(node.id);
        setCodePanelId(null);
        setAutomationPanelId(null);
        return;
      }
      if (node.type === 'code') {
        setCodePanelId(node.id);
        setMssqlPanelId(null);
        setAutomationPanelId(null);
        return;
      }
      if (node.type === 'sinkAutomation') {
        setAutomationPanelId(node.id);
        setMssqlPanelId(null);
        setCodePanelId(null);
        return;
      }
      if (isTriggerNodeType(node.type)) {
        setMssqlPanelId(null);
        setCodePanelId(null);
        setAutomationPanelId(null);
        setTriggerModal(node);
      }
    },
    [readOnly, onLastRunFocusNode],
  );

  const onPaneClick = useCallback(() => {
    onLastRunFocusNode?.(null);
  }, [onLastRunFocusNode]);

  const onBeforeDelete: OnBeforeDelete<Node, Edge> = useCallback(
    async ({ nodes: toDel, edges: toDelE }) => {
      if (!toDel || toDel.length === 0) return true;
      const withoutTriggers = toDel.filter((n) => !isTriggerNodeType(n.type));
      if (withoutTriggers.length === toDel.length) return true;
      if (withoutTriggers.length === 0) return false;
      return { nodes: withoutTriggers, edges: toDelE ?? [] };
    },
    [],
  );

  const onSaveTrigger = useCallback(
    (nodeId: string, payload: { type: 'triggerManual' | 'triggerSchedule'; data: Record<string, unknown> }) => {
      setNodes((ns) =>
        ns.map((n) =>
          n.id === nodeId
            ? ({
                ...n,
                type: payload.type,
                data: { ...payload.data },
                deletable: false,
              } as Node)
            : n,
        ),
      );
    },
    [setNodes],
  );

  const flowThemeVars =
    '[--flow-canvas-bg:#ffffff] dark:[--flow-canvas-bg:rgb(23_23_23)] [--flow-dots:#cbd5e1] dark:[--flow-dots:#525252]';
  const shellClassName = canvasMaximized
    ? `fixed left-0 right-0 top-0 z-[200] flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[var(--flow-canvas-bg)] shadow-2xl ${flowThemeVars}`
    : `flex h-[min(70vh,640px)] w-full min-h-0 flex-col overflow-hidden rounded-lg border border-gray-200 dark:border-neutral-700 ${flowThemeVars}`;

  const showFlowTabs = onFlowViewModeChange != null && flowViewMode != null;
  const showMaxExecutionsSplit =
    Boolean(executionsSidebar) && canvasMaximized && flowViewMode === 'executions';

  return (
    <WorkflowCanvasEditContext.Provider value={{ readOnly: !!readOnly }}>
      <div className={shellClassName}>
        {canvasMaximized && <WorkflowCanvasMaximizeHeader />}
        {showFlowTabs && <WorkflowFlowViewTabs viewMode={flowViewMode} onViewModeChange={onFlowViewModeChange} />}
        <div
          className={
            showMaxExecutionsSplit
              ? 'flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden'
              : 'relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'
          }
        >
          {showMaxExecutionsSplit ? executionsSidebar : null}
          <div className="relative z-0 min-h-0 min-w-0 w-full flex-1 overflow-hidden">
        <ReactFlow
          className="relative h-full !min-h-0 !bg-[var(--flow-canvas-bg)]"
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={readOnly ? undefined : onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onBeforeDelete={readOnly ? undefined : onBeforeDelete}
          nodeTypes={workflowNodeTypes}
          edgeTypes={readOnly ? undefined : { deletableStep: DeletableStepEdge }}
          defaultEdgeOptions={readOnly ? { type: 'smoothstep' } : { type: EDGE_EDIT_TYPE }}
          fitView
          proOptions={{ hideAttribution: true }}
          defaultViewport={initial.viewport as { x: number; y: number; zoom: number }}
          deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
        >
          <FitViewWhenMaxToggled
            maximized={canvasMaximized}
            refitKey={canvasMaximized ? (flowViewMode ?? '') : undefined}
          />
          <DefinitionBridge outerRef={outerRef} />
          <Background
            variant={BackgroundVariant.Dots}
            gap={16}
            size={1.25}
            bgColor="var(--flow-canvas-bg)"
            color="var(--flow-dots)"
          />
          {onPlayRequest && !readOnly && (
            <WorkflowPlayOverlay
              onPlay={onPlayRequest}
              disabled={playRequestDisabled}
              loading={playRequestLoading}
            />
          )}
          <WorkflowAddNodeUi connectors={connectors} readOnly={!!readOnly} />
          <Controls className="!bg-white dark:!bg-neutral-800 !border-gray-200 dark:!border-neutral-600">
            <ControlButton
              onClick={() => setCanvasMaximized(!canvasMaximized)}
              title={canvasMaximized ? 'Restaurar' : 'Maximizar'}
              aria-label={canvasMaximized ? 'Restaurar panel de edición' : 'Maximizar panel de edición'}
            >
              {canvasMaximized ? <RestoreIcon /> : <MaximizeIcon />}
            </ControlButton>
          </Controls>
          <MiniMap
            className="!bg-white dark:!bg-neutral-800 !border-gray-200 dark:!border-neutral-600"
            maskColor="rgba(0,0,0,0.12)"
          />
        </ReactFlow>
          </div>
        </div>
      </div>
      <WorkflowTriggerModal
        state={triggerModal ? { node: triggerModal } : null}
        onClose={() => setTriggerModal(null)}
        onSave={(id, p) => {
          onSaveTrigger(id, p);
        }}
      />
      {businessId && mssqlNode && !readOnly && (
        <WorkflowMssqlNodePanel
          businessId={businessId}
          node={mssqlNode}
          previousNode={mssqlPreviousNode}
          connectors={connectors}
          onClose={() => setMssqlPanelId(null)}
          onSave={(id, d) => {
            onSaveMssqlNode(id, d);
          }}
        />
      )}
      {businessId && codeNode && !readOnly && (
        <WorkflowCodeNodePanel
          businessId={businessId}
          node={codeNode}
          previousNode={codePreviousNode}
          onClose={() => setCodePanelId(null)}
          onSave={(id, d) => onSaveCodeNode(id, d)}
        />
      )}
      {businessId && automationNode && !readOnly && (
        <WorkflowSinkAutomationNodePanel
          businessId={businessId}
          workflowId={integrationWorkflowId}
          node={automationNode}
          previousNode={automationPreviousNode}
          onClose={() => setAutomationPanelId(null)}
          onSave={(id, d) => onSaveAutomationNode(id, d)}
        />
      )}
    </WorkflowCanvasEditContext.Provider>
  );
}

type Props = {
  /** Clave de remount al cambiar de flujo o recargar grafo */
  workflowId: string;
  definition: Record<string, unknown>;
  readOnly?: boolean;
  /** Sucursal (APIs de conector y vista previa SQL) */
  businessId: string;
  /** Conectores de la sucursal (origen de datos al agregar nodo) */
  connectors?: ConnectorRow[];
  /** Botón play centrado: ejecuta el flujo (orden por conexiones) */
  onPlayRequest?: () => void;
  playRequestDisabled?: boolean;
  playRequestLoading?: boolean;
  runExecution?: { steps: WorkflowRunStep[]; highlightNodeId: string | null } | null;
  onLastRunFocusNode?: (nodeId: string | null) => void;
  /** Pestañas Editor / Ejecuciones dentro del lienzo (visibles también al maximizar). */
  flowViewMode?: 'editor' | 'executions';
  onFlowViewModeChange?: (m: 'editor' | 'executions') => void;
  canvasMaximized?: boolean;
  onCanvasMaximizedChange?: (max: boolean) => void;
  executionsSidebar?: ReactNode;
};

export const WorkflowCanvas = forwardRef<WorkflowCanvasHandle, Props>(function WorkflowCanvas(
  {
    definition,
    readOnly,
    workflowId,
    businessId,
    connectors = [],
    onPlayRequest,
    playRequestDisabled,
    playRequestLoading,
    runExecution,
    onLastRunFocusNode,
    flowViewMode,
    onFlowViewModeChange,
    canvasMaximized,
    onCanvasMaximizedChange,
    executionsSidebar,
  },
  ref,
) {
  return (
    <ReactFlowProvider key={workflowId}>
      <FlowSurface
        initialDefinition={definition}
        readOnly={readOnly}
        businessId={businessId}
        integrationWorkflowId={workflowId}
        outerRef={ref}
        connectors={connectors}
        onPlayRequest={onPlayRequest}
        playRequestDisabled={playRequestDisabled}
        playRequestLoading={playRequestLoading}
        runExecution={runExecution}
        onLastRunFocusNode={onLastRunFocusNode}
        flowViewMode={flowViewMode}
        onFlowViewModeChange={onFlowViewModeChange}
        canvasMaximized={canvasMaximized}
        onCanvasMaximizedChange={onCanvasMaximizedChange}
        executionsSidebar={executionsSidebar}
      />
    </ReactFlowProvider>
  );
});
