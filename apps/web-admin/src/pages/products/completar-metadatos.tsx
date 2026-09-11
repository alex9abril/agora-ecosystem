import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/layout/AdminLayout';
import ProductMetadataWizard from '@/components/catalog/ProductMetadataWizard';
import {
  loadProductMetadataSelection,
  type ProductMetadataSelectionItem,
} from '@/lib/product-metadata-selection';

export default function CompletarMetadatosPage() {
  const router = useRouter();
  const [items, setItems] = useState<ProductMetadataSelectionItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(loadProductMetadataSelection());
    setReady(true);
  }, []);

  return (
    <>
      <Head>
        <title>Completar metadatos - LOCALIA Admin</title>
      </Head>

      <AdminLayout>
        <div className="space-y-4">
          <div className="text-xs text-gray-500">
            <Link href="/products" className="hover:text-gray-800">
              Productos
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">Completar metadatos</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-sm font-normal text-gray-900">Completar metadatos</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Busca en internet por SKU y nombre. La foto debe ser la real de la pieza; solo se estima peso y volumen.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/products')}
              className="px-3 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              Volver al catálogo
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {!ready ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xs text-gray-500 mb-4">
                  No hay productos seleccionados. Vuelve al catálogo y marca las filas que quieras completar.
                </p>
                <Link
                  href="/products"
                  className="inline-flex px-4 py-2 text-xs bg-black text-white rounded hover:bg-gray-900"
                >
                  Ir al catálogo
                </Link>
              </div>
            ) : (
              <ProductMetadataWizard items={items} />
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
