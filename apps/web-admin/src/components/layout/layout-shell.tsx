import { createContext, useContext } from 'react';

export type LayoutShellValue = {
  leftOpen: boolean;
  setLeftOpen: (open: boolean) => void;
  leftCollapsed: boolean;
  setLeftCollapsed: (collapsed: boolean) => void;
  rightOpen: boolean;
  setRightOpen: (open: boolean) => void;
};

const LayoutShellContext = createContext<LayoutShellValue | null>(null);

export const LayoutShellProvider = LayoutShellContext.Provider;

export function useLayoutShell() {
  const value = useContext(LayoutShellContext);
  if (!value) {
    throw new Error('useLayoutShell debe usarse dentro de AdminLayout');
  }
  return value;
}
