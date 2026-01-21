import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import LocalLayout from '@/components/layout/LocalLayout';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import CollectionForm, { CollectionFormState } from '@/components/CollectionForm';
import { productCollectionsService, ProductCollection } from '@/lib/product-collections';

export default function EditCollectionPage() {
  const router = useRouter();
  const { id } = router.query;
  const { selectedBusiness } = useSelectedBusiness();
  const [collection, setCollection] = useState<ProductCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady || !id || typeof id !== 'string') {
      return;
    }

    const loadCollection = async () => {
      try {
        setLoading(true);
        setPageError(null);
        const data = await productCollectionsService.get(id);
        setCollection(data);
      } catch (error: any) {
        setPageError(error?.message || 'No se pudo cargar la colección');
      } finally {
        setLoading(false);
      }
    };

    void loadCollection();
  }, [router.isReady, id]);

  const handleSubmit = async (values: CollectionFormState) => {
    if (!collection) return;
    try {
      setSaving(true);
      setFormError(null);
      await productCollectionsService.update(collection.id, values);
      router.push('/catalog/collections');
    } catch (error: any) {
      setFormError(error?.message || 'No se pudo guardar la colección');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LocalLayout>
      <Head>
        <title>Editar colección | LOCALIA Local</title>
      </Head>

      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => router.push('/catalog/collections')}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            ← Volver
          </button>
        </div>

        {pageError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-500">
            Cargando colección...
          </div>
        ) : collection ? (
          <CollectionForm
            title="Editar colección"
            subtitle={`Sucursal ${selectedBusiness?.business_name || ''}`}
            initialValues={{
              name: collection.name,
              slug: collection.slug,
              status: (collection.status as 'active' | 'inactive') || 'active',
              image_url: collection.image_url || '',
            }}
            collectionId={collection.id}
            onSubmit={handleSubmit}
            onCancel={() => router.push('/catalog/collections')}
            saving={saving}
            error={formError}
          />
        ) : null}
      </div>
    </LocalLayout>
  );
}
