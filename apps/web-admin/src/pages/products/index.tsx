import Head from 'next/head';
import AdminLayout from '@/components/layout/AdminLayout';
import ProductsManager from '@/components/catalog/ProductsManager';

export default function ProductsPage() {
  return (
    <>
      <Head>
        <title>Productos - LOCALIA Admin</title>
      </Head>

      <AdminLayout>
        <div className="space-y-4">
          <div>
            <h1 className="text-sm font-normal text-gray-900">Catálogo de productos</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Lista completa de productos. Filtra por negocio, categoría, SKU o nombre.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <ProductsManager />
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
