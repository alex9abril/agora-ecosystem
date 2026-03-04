import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Redirige a la sección independiente Tiendas (/tiendas).
 * Esta ruta se mantiene para compatibilidad con enlaces antiguos.
 */
export default function ChannelStoresRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/tiendas');
  }, [router]);

  return null;
}
