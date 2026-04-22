import { forwardRef, useImperativeHandle, useCallback, useState, useEffect, useRef, useMemo } from 'react';
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
import { WorkflowCanvasEditContext } from './workflow-canvas-context';

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

function FitViewWhenMaxToggled({ maximized }: { maximized: boolean }) {
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
  }, [maximized, fitView]);
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

type FlowInnerProps = {
  initialDefinition: Record<string, unknown>;
  readOnly?: boolean;
  businessId: string;
  outerRef: React.ForwardedRef<WorkflowCanvasHandle>;
  connectors: ConnectorRow[];
  onPlayRequest?: () => void;
  playRequestDisabled?: boolean;
  playRequestLoading?: boolean;
};

function FlowSurface({
  initialDefinition,
  readOnly,
  businessId,
  outerRef,
  connectors,
  onPlayRequest,
  playRequestDisabled,
  playRequestLoading,
}: FlowInnerProps) {
  const initial = toFlowElements(initialDefinition, { readOnly });
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [triggerModal, setTriggerModal] = useState<Node | null>(null);
  const [mssqlPanelId, setMssqlPanelId] = useState<string | null>(null);
  const [canvasMaximized, setCanvasMaximized] = useState(false);

  useEffect(() => {
    if (!canvasMaximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCanvasMaximized(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [canvasMaximized]);

  useEffect(() => {
    if (!canvasMaximized) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [canvasMaximized]);

  const mssqlNode = mssqlPanelId ? nodes.find((n) => n.id === mssqlPanelId) : null;

  const mssqlPreviousNode = useMemo(() => {
    if (!mssqlPanelId) return null;
    const e = edges.find((ed) => ed.target === mssqlPanelId);
    if (!e) return null;
    return nodes.find((n) => n.id === e.source) ?? null;
  }, [mssqlPanelId, edges, nodes]);

  useEffect(() => {
    if (mssqlPanelId && !mssqlNode) setMssqlPanelId(null);
  }, [mssqlPanelId, mssqlNode]);

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

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (readOnly) return;
      if (node.type === 'connectorMssql') {
        setMssqlPanelId(node.id);
        return;
      }
      if (isTriggerNodeType(node.type)) {
        setTriggerModal(node);
      }
    },
    [readOnly],
  );

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

  const surfaceClass =
    'w-full overflow-hidden border border-gray-200 dark:border-neutral-700 [--flow-canvas-bg:#ffffff] dark:[--flow-canvas-bg:rgb(23_23_23)] [--flow-dots:#cbd5e1] dark:[--flow-dots:#525252] ' +
    (canvasMaximized
      ? 'fixed left-0 right-0 top-0 z-[200] h-[100dvh] max-h-[100dvh] rounded-none border-0 bg-[var(--flow-canvas-bg)] shadow-2xl'
      : 'relative h-[min(70vh,640px)] rounded-lg');

  return (
    <WorkflowCanvasEditContext.Provider value={{ readOnly: !!readOnly }}>
      <div className={surfaceClass}>
        <ReactFlow
          className="relative !bg-[var(--flow-canvas-bg)]"
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={readOnly ? undefined : onConnect}
          onNodeClick={onNodeClick}
          onBeforeDelete={readOnly ? undefined : onBeforeDelete}
          nodeTypes={workflowNodeTypes}
          edgeTypes={readOnly ? undefined : { deletableStep: DeletableStepEdge }}
          defaultEdgeOptions={readOnly ? { type: 'smoothstep' } : { type: EDGE_EDIT_TYPE }}
          fitView
          proOptions={{ hideAttribution: true }}
          defaultViewport={initial.viewport as { x: number; y: number; zoom: number }}
          deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
        >
          <FitViewWhenMaxToggled maximized={canvasMaximized} />
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
              onClick={() => setCanvasMaximized((m) => !m)}
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
  },
  ref,
) {
  return (
    <ReactFlowProvider key={workflowId}>
      <FlowSurface
        initialDefinition={definition}
        readOnly={readOnly}
        businessId={businessId}
        outerRef={ref}
        connectors={connectors}
        onPlayRequest={onPlayRequest}
        playRequestDisabled={playRequestDisabled}
        playRequestLoading={playRequestLoading}
      />
    </ReactFlowProvider>
  );
});
