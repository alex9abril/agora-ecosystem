import { memo, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { WorkflowCanvasEditContext } from './workflow-canvas-context';

const HIDE_MS = 140;

function IconTrashEdge() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function DeletableStepEdgeInner(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, markerStart, interactionWidth } = props;
  const { deleteElements } = useReactFlow();
  const { readOnly } = useContext(WorkflowCanvasEditContext);
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const [deleteUi, setDeleteUi] = useState(false);
  const hideT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showDelete = useCallback(() => {
    if (hideT.current) {
      clearTimeout(hideT.current);
      hideT.current = null;
    }
    setDeleteUi(true);
  }, []);
  const scheduleHideDelete = useCallback(() => {
    if (hideT.current) clearTimeout(hideT.current);
    hideT.current = setTimeout(() => {
      setDeleteUi(false);
      hideT.current = null;
    }, HIDE_MS);
  }, []);

  useEffect(
    () => () => {
      if (hideT.current) clearTimeout(hideT.current);
    },
    [],
  );

  return (
    <>
      <g
        onMouseEnter={readOnly ? undefined : showDelete}
        onMouseLeave={readOnly ? undefined : scheduleHideDelete}
        style={{ pointerEvents: readOnly ? 'none' : undefined }}
      >
        <BaseEdge
          id={id}
          path={path}
          style={style}
          markerEnd={markerEnd}
          markerStart={markerStart}
          interactionWidth={interactionWidth}
        />
      </g>
      {!readOnly && (
        <EdgeLabelRenderer>
          <div
            className={`nodrag nopan transition-opacity duration-150 ${deleteUi ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              zIndex: 10,
            }}
            onMouseEnter={showDelete}
            onMouseLeave={scheduleHideDelete}
          >
            <div className="flex items-center gap-0.5 rounded-md border border-neutral-600/40 bg-neutral-800 px-0.5 py-0.5 shadow-md dark:border-neutral-500/50 dark:bg-neutral-950/95">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void deleteElements({ edges: [{ id }] });
                }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-200 transition hover:bg-white/15 hover:text-white"
                title="Quitar conexión"
                aria-label="Quitar conexión"
              >
                <IconTrashEdge />
              </button>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const DeletableStepEdge = memo(DeletableStepEdgeInner);
