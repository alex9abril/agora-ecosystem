import { createContext } from 'react';

export type WorkflowCanvasEditContextValue = { readOnly: boolean };

export const WorkflowCanvasEditContext = createContext<WorkflowCanvasEditContextValue>({ readOnly: true });
