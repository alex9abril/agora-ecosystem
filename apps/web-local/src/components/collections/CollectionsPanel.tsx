import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import CollectionForm, { CollectionFormState } from '@/components/CollectionForm';
import { productCollectionsService, ProductCollection } from '@/lib/product-collections';

type ViewMode = 'list' | 'new' | 'edit';

interface CollectionsPanelProps {
  businessId: string;
  contextName: string;
  returnPath?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function CollectionsPanel({ businessId, contextName, returnPath }: CollectionsPanelProps) {
  const { token } = useAuth();
  const [collections, setCollections] = useState<ProductCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCollection, setEditingCollection] = useState<ProductCollection | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);

  useEffect(() => {
    void loadCollections();
  }, [businessId]);

  useEffect(() => {
    if (viewMode !== 'edit' || !editingId) {
      setEditingCollection(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingEdit(true);
      setFormError(null);
      try {
        const data = await productCollectionsService.get(editingId);
        if (!cancelled) setEditingCollection(data);
      } catch (err: unknown) {
        if (!cancelled) setFormError(err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'No se pudo cargar la colección');
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [viewMode, editingId]);

  const loadCollections = async () => {
    try {
      setLoading(true);
      setPageError(null);
      const response = await productCollectionsService.list(businessId, { status: 'all' });
      setCollections(response.data);
    } catch (err: unknown) {
      setPageError(err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'No se pudieron cargar las colecciones');
    } finally {
      setLoading(false);
    }
  };

  const selectedCollections = collections.filter((item) => selectedIds.has(item.id));
  const allSelected = collections.length > 0 && selectedIds.size === collections.length;
  const hasSelection = selectedIds.size > 0;
  const hasActiveSelected = selectedCollections.some((item) => (item.status || 'active') === 'active');
  const hasInactiveSelected = selectedCollections.some((item) => item.status === 'inactive');
  const deleteLabel = hasSelection
    ? `Eliminar ${selectedIds.size} elemento${selectedIds.size === 1 ? '' : 's'}`
    : 'Eliminar';

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedIds.size > 0 && selectedIds.size < collections.length;
    }
  }, [selectedIds, collections.length]);

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(collections.map((item) => item.id)) : new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyStatusToSelection = async (status: 'active' | 'inactive') => {
    if (!hasSelection) return;
    try {
      setSaving(true);
      await Promise.all(Array.from(selectedIds).map((id) => productCollectionsService.update(id, { status })));
      setSelectedIds(new Set());
      await loadCollections();
    } catch (err: unknown) {
      setPageError(err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'No se pudo actualizar el estado');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSelection = async () => {
    if (!hasSelection) return;
    if (!window.confirm('¿Eliminar las colecciones seleccionadas? Esta acción es irreversible.')) return;
    try {
      setSaving(true);
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id) => productCollectionsService.remove(id)));
      setSelectedIds(new Set());
      setCollections((prev) => prev.filter((item) => !ids.includes(item.id)));
    } catch (err: unknown) {
      setPageError(err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'No se pudo eliminar');
    } finally {
      setSaving(false);
    }
  };

  const goToList = () => {
    setViewMode('list');
    setEditingId(null);
    setEditingCollection(null);
    setFormError(null);
    setPendingImageFile(null);
    void loadCollections();
  };

  const handleCreateSubmit = async (values: CollectionFormState) => {
    try {
      setSaving(true);
      setFormError(null);
      const created = await productCollectionsService.create({
        ...values,
        image_url: pendingImageFile ? undefined : values.image_url,
        business_id: businessId,
      });
      if (pendingImageFile && token) {
        const formData = new FormData();
        formData.append('file', pendingImageFile);
        const response = await fetch(`${API_URL}/catalog/collections/${created.id}/upload-image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({ message: 'Error al subir la imagen' }));
          throw new Error(err?.message || 'Error al subir la imagen');
        }
      }
      goToList();
    } catch (err: unknown) {
      setFormError(err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (values: CollectionFormState) => {
    if (!editingId) return;
    try {
      setSaving(true);
      setFormError(null);
      await productCollectionsService.update(editingId, values);
      goToList();
    } catch (err: unknown) {
      setFormError(err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (viewMode === 'new') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goToList}
            className="rounded-md border border-gray-300 dark:border-neutral-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800"
          >
            ← Volver a la lista
          </button>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm">
          <CollectionForm
            title="Nueva colección"
            subtitle={contextName}
            initialValues={{ name: '', slug: '', status: 'active', image_url: '', description: '' }}
            onImageFileChange={setPendingImageFile}
            onSubmit={handleCreateSubmit}
            onCancel={goToList}
            saving={saving}
            error={formError}
          />
        </div>
      </div>
    );
  }

  if (viewMode === 'edit' && editingId) {
    if (loadingEdit) {
      return (
        <div className="flex items-center justify-center py-12 gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-900 dark:border-gray-100 border-t-transparent" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Cargando colección…</span>
        </div>
      );
    }
    if (editingCollection) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goToList}
              className="rounded-md border border-gray-300 dark:border-neutral-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800"
            >
              ← Volver a la lista
            </button>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm">
            <CollectionForm
              title="Editar colección"
              subtitle={contextName}
              initialValues={{
                name: editingCollection.name,
                slug: editingCollection.slug,
                status: (editingCollection.status as 'active' | 'inactive') || 'active',
                image_url: editingCollection.image_url || '',
                description: editingCollection.description || '',
              }}
              collectionId={editingCollection.id}
              onSubmit={handleEditSubmit}
              onCancel={goToList}
              saving={saving}
              error={formError}
            />
          </div>
        </div>
      );
    }
    if (formError) {
      return (
        <div className="space-y-4">
          <button type="button" onClick={goToList} className="rounded-md border border-gray-300 dark:border-neutral-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">
            ← Volver a la lista
          </button>
          <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-200">{formError}</div>
        </div>
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Colecciones para <strong>{contextName}</strong>. Agrupa productos por categoría o campaña.
        </p>
        <button
          type="button"
          onClick={() => { setViewMode('new'); setFormError(null); setPendingImageFile(null); }}
          className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 transition-colors"
        >
          Nueva colección
        </button>
      </div>

      {pageError && (
        <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {pageError}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3 shadow-sm">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {hasSelection ? `${selectedIds.size} seleccionada(s)` : 'Selecciona colecciones para gestionar'}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          {hasActiveSelected && (
            <button
              type="button"
              disabled={!hasSelection || saving}
              onClick={() => applyStatusToSelection('inactive')}
              className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Poner en borrador
            </button>
          )}
          {hasInactiveSelected && (
            <button
              type="button"
              disabled={!hasSelection || saving}
              onClick={() => applyStatusToSelection('active')}
              className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Activar
            </button>
          )}
          <button
            type="button"
            disabled={!hasSelection || saving}
            onClick={handleDeleteSelection}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 0a1 1 0 00-1 1v2h6V4a1 1 0 00-1-1m-4 0h4" />
            </svg>
            {deleteLabel}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center py-12 gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-900 dark:border-gray-100 border-t-transparent" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Cargando colecciones…</span>
          </div>
        ) : collections.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            No hay colecciones para esta sucursal. Crea la primera para comenzar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
              <thead className="bg-gray-50 dark:bg-neutral-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400 dark:border-neutral-600 dark:bg-neutral-700"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Colección</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Productos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-neutral-700 bg-white dark:bg-neutral-800">
                {collections.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400 dark:border-neutral-600 dark:bg-neutral-700"
                      />
                    </td>
                    <td className="px-6 py-3">
                      <Link
                        href={`/catalog/collections/${item.id}/products?businessId=${encodeURIComponent(businessId)}`}
                        className="font-medium text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="rounded bg-gray-100 dark:bg-neutral-700 px-2 py-0.5 text-xs font-mono text-gray-700 dark:text-gray-300">{item.slug}</span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">{item.total_products ?? 0}</td>
                    <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className={`inline-flex items-center gap-1.5 ${item.status === 'inactive' ? 'text-gray-500 dark:text-gray-500' : 'text-green-600 dark:text-green-400'}`}>
                        <span className={`h-2 w-2 rounded-full ${item.status === 'inactive' ? 'bg-gray-400' : 'bg-green-500'}`} />
                        {item.status === 'inactive' ? 'Inactiva' : 'Activa'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-sm">
                      <button
                        type="button"
                        onClick={() => { setViewMode('edit'); setEditingId(item.id); setFormError(null); }}
                        className="text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
