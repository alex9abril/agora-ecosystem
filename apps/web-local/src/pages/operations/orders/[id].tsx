/**
 * Ruta obsoleta: /operations/orders/[id] redirige a /orders/[id].
 * El detalle de pedido se gestiona en /orders/[id].
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function OperationsOrderDetailRedirectPage() {
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (router.isReady && id && typeof id === 'string') {
      router.replace(`/orders/${id}`);
    }
  }, [router, id]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-black mx-auto" />
        <p className="mt-3 text-sm text-gray-600">Redirigiendo al pedido...</p>
      </div>
    </div>
  );
}
