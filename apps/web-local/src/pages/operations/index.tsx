/**
 * Ruta obsoleta: /operations redirige a /orders.
 * La lista y detalle de pedidos se gestionan en /orders y /orders/[id].
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function OperationsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/orders');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-black mx-auto" />
        <p className="mt-3 text-sm text-gray-600">Redirigiendo a Pedidos...</p>
      </div>
    </div>
  );
}
