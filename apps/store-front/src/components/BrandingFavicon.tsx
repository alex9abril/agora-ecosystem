/**
 * Aplica el favicon de la tienda según el branding (grupo, sucursal, marca o global).
 * Debe renderarse dentro de BrandingProvider (p. ej. dentro de StoreLayout).
 */

import Head from 'next/head';
import { useBranding } from '@/contexts/BrandingContext';

export default function BrandingFavicon() {
  const { branding } = useBranding();

  if (!branding?.favicon_url) {
    return null;
  }

  return (
    <Head>
      <link rel="icon" href={branding.favicon_url} />
    </Head>
  );
}
