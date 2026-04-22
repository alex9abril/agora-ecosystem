import { memo, useContext } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { WorkflowCanvasEditContext } from './workflow-canvas-context';

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
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={style}
        markerEnd={markerEnd}
        markerStart={markerStart}
        interactionWidth={interactionWidth}
      />
      {!readOnly && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              zIndex: 10,
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void deleteElements({ edges: [{ id }] });
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 text-gray-500 text-sm leading-none shadow-sm hover:bg-red-50 hover:border-red-300 hover:text-red-600"
              title="Quitar conexión"
              aria-label="Quitar conexión"
            >
              ×
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const DeletableStepEdge = memo(DeletableStepEdgeInner);
