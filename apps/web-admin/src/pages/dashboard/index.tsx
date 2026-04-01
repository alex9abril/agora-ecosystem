import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';

export default function DashboardPage() {
  return (
    <>
      <Head>
        <title>Dashboard - LOCALIA Admin</title>
      </Head>

      <AdminLayout>
        <div className="max-w-3xl mx-auto px-6 py-12">
          <h1 className="text-xl font-normal text-gray-900 mb-2">Dashboard</h1>
          <p className="text-sm text-gray-600 mb-6">
            El panel operativo con pedidos, logística y métricas en vivo está en{' '}
            <strong>AGORA Local</strong> (web-local), enlazado por sucursal. Esta vista central es un punto de
            entrada ligero para el admin LOCALIA.
          </p>
          <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-3">
            <p className="text-sm text-gray-700">
              Usa el menú lateral para catálogo, tiendas, zonas y configuración. Para consola de pedidos y torre de
              control, abre la app Local con tu misma cuenta cuando corresponda.
            </p>
            <Link
              href="/catalog"
              className="inline-flex items-center rounded-md bg-black px-4 py-2 text-xs font-normal text-white hover:bg-gray-900"
            >
              Ir al catálogo
            </Link>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
