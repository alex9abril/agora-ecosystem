/**
 * Contexto de branding del store-front (embed_mode, embed_layout, etc.)
 * Lo provee StoreLayout cuando carga la configuración de la tienda.
 */

import { createContext, useContext, ReactNode } from 'react';
import type { Branding } from '@/lib/branding';

interface BrandingContextValue {
  branding: Branding | null;
}

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

export function BrandingProvider({
  branding,
  children,
}: {
  branding: Branding | null;
  children: ReactNode;
}) {
  return (
    <BrandingContext.Provider value={{ branding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext);
  if (ctx === undefined) {
    return { branding: null };
  }
  return ctx;
}
