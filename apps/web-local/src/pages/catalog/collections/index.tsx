import Head from 'next/head';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import LocalLayout from '@/components/layout/LocalLayout';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { productCollectionsService, ProductCollection } from '@/lib/product-collections';

interface CollectionFormState {
  name: string;
  slug: string;
  status: 'active' | 'inactive';
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function ProductCollectionsPage() {
  const { selectedBusiness } = useSelectedBusiness();
  const [collections, setCollections] = useState<ProductCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ProductCollection | null>(null);
  const [formState, setFormState] = useState<CollectionFormState>({
    name: '',
    slug: '',
    status: 'active',
  });
  const [isSlugEdited, setIsSlugEdited] = useState(false);

  const branchName = useMemo(() => selectedBusiness?.business_name || 'sucursal', [selectedBusiness?.business_name]);

  useEffect(() => {
    if (selectedBusiness?.business_id) {
      void loadCollections();
    } else {
      setCollections([]);
    }
  }, [selectedBusiness?.business_id]);

  const loadCollections = async () => {
    if (!selectedBusiness?.business_id) return;
    try {
      setLoading(true);
      setPageError(null);
      const response = await productCollectionsService.list(selectedBusiness.business_id);
      setCollections(response.data);
    } catch (error: any) {
      setPageError(error?.message || 'No se pudieron cargar las colecciones');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditing(null);
    setFormState({
      name: '',
      slug: '',
      status: 'active',
    });
    setIsSlugEdited(false);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (item: ProductCollection) => {
    setEditing(item);
    setFormState({
      name: item.name,
      slug: item.slug,
      status: (item.status as 'active' | 'inactive') || 'active',
    });
    setIsSlugEdited(true);
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBusiness?.business_id) {
      setFormError('Selecciona una sucursal para guardar la colección');
      return;
    }

    const trimmedName = formState.name.trim();
    const trimmedSlug = formState.slug.trim();

    if (!trimmedName) {
      setFormError('El nombre es obligatorio');
      return;
    }
    if (!trimmedSlug) {
      setFormError('El slug es obligatorio');
      return;
    }

    const payload = {
      name: trimmedName,
      slug: slugify(trimmedSlug),
      status: formState.status,
    };

    try {
      setSaving(true);
      setFormError(null);
      if (editing) {
        await productCollectionsService.update(editing.id, {
          name: payload.name,
          slug: payload.slug,
          status: payload.status,
        });
      } else {
        await productCollectionsService.create({
          ...payload,
          business_id: selectedBusiness.business_id,
        });
      }
      setShowModal(false);
      await loadCollections();
    } catch (error: any) {
      setFormError(error?.message || 'No se pudo guardar la colección');
    } finally {
      setSaving(false);
    }
  };

  const handleNameChange = (value: string) => {
    const nextName = value;
    setFormState((prev) => ({
      ...prev,
      name: nextName,
      slug: !isSlugEdited ? slugify(nextName) : prev.slug,
    }));
  };

  const handleSlugChange = (value: string) => {
    setIsSlugEdited(true);
    setFormState((prev) => ({
      ...prev,
      slug: slugify(value),
    }));
  };

  return (
    <LocalLayout>
      <Head>
        <title>Colecciones | LOCALIA Local</title>
      </Head>

      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Colecciones de productos</h1>
            <p className="text-sm text-gray-600">
              Gestiona colecciones internas para la sucursal {branchName}.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            disabled={!selectedBusiness}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Nueva colección
          </button>
        </div>

        {pageError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        )}

        {!selectedBusiness?.business_id ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Selecciona una sucursal para gestionar las colecciones de productos.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                <span className="ml-3 text-sm text-gray-600">Cargando colecciones...</span>
              </div>
            ) : collections.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-500">
                No hay colecciones para esta sucursal. Crea la primera para comenzar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Colección
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Slug</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Productos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {collections.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-3">
                          <div className="font-medium text-gray-900">{item.name}</div>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-700">{item.slug}</span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">{item.total_products ?? 0}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                              item.status === 'inactive'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-green-50 text-green-700'
                            }`}
                          >
                            {item.status === 'inactive' ? 'Inactiva' : 'Activa'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right text-sm">
                          <div className="flex items-center justify-end space-x-3">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 px-4 py-8">
          <div className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {editing ? 'Editar colección' : 'Nueva colección'}
                </h2>
                <p className="text-xs text-gray-500">
                  Para la sucursal {branchName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 px-6 py-5">
                {formError && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre</label>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Ej. Accesorios"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Slug</label>
                  <input
                    type="text"
                    value={formState.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="accesorios"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Solo minúsculas, números y guiones.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <select
                    value={formState.status}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        status: e.target.value as 'active' | 'inactive',
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="active">Activa</option>
                    <option value="inactive">Inactiva</option>
                  </select>
                </div>

              </div>

              <div className="flex items-center justify-end space-x-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </LocalLayout>
  );
}
