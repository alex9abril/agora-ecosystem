import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';
import LocalLayout from '@/components/layout/LocalLayout';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import CollectionForm, { CollectionFormState } from '@/components/CollectionForm';
import { productCollectionsService } from '@/lib/product-collections';

export default function NewCollectionPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { selectedBusiness } = useSelectedBusiness();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);

  const handleSubmit = async (values: CollectionFormState) => {
    if (!selectedBusiness?.business_id) {
      setFormError('Selecciona una sucursal para guardar la colección');
      return;
    }
    try {
      setSaving(true);
      setFormError(null);
      const created = await productCollectionsService.create({
        ...values,
        image_url: pendingImageFile ? undefined : values.image_url,
        business_id: selectedBusiness.business_id,
      });
      if (pendingImageFile) {
        if (!token) {
          throw new Error('No estás autenticado');
        }
        const formData = new FormData();
        formData.append('file', pendingImageFile);
        const endpoint = `/catalog/collections/${created.id}/upload-image`;
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
        const response = await fetch(`${API_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        if (!response.ok) {
          const error = await response
            .json()
            .catch(() => ({ message: 'Error al subir la imagen' }));
          throw new Error(error.message || 'Error al subir la imagen');
        }
      }
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
        <title>Nueva colección | LOCALIA Local</title>
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

        {!selectedBusiness?.business_id ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Selecciona una sucursal para crear una colección.
          </div>
        ) : (
          <CollectionForm
            title="Nueva colección"
            subtitle={`Sucursal ${selectedBusiness.business_name}`}
            initialValues={{ name: '', slug: '', status: 'active', image_url: '' }}
            onImageFileChange={setPendingImageFile}
            onSubmit={handleSubmit}
            onCancel={() => router.push('/catalog/collections')}
            saving={saving}
            error={formError}
          />
        )}
      </div>
    </LocalLayout>
  );
}
