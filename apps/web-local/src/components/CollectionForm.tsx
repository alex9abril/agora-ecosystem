import { FormEvent, useEffect, useState } from 'react';
import CollectionImageUpload from './CollectionImageUpload';

export interface CollectionFormState {
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  image_url?: string;
  description?: string;
}

interface CollectionFormProps {
  title: string;
  subtitle?: string;
  initialValues: CollectionFormState;
  collectionId?: string;
  onImageFileChange?: (file: File | null) => void;
  onSubmit: (values: CollectionFormState) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
  error?: string | null;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function CollectionForm({
  title,
  subtitle,
  initialValues,
  collectionId,
  onImageFileChange,
  onSubmit,
  onCancel,
  saving = false,
  error,
}: CollectionFormProps) {
  const [formState, setFormState] = useState<CollectionFormState>(initialValues);
  const [isSlugEdited, setIsSlugEdited] = useState(false);

  useEffect(() => {
    setFormState(initialValues);
    setIsSlugEdited(false);
  }, [
    initialValues.name,
    initialValues.slug,
    initialValues.status,
    initialValues.image_url,
    initialValues.description,
  ]);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      ...formState,
      name: formState.name.trim(),
      slug: slugify(formState.slug.trim()),
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm">
      <div className="border-b border-gray-200 dark:border-neutral-700 px-6 py-4">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
        {error && (
          <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
          <input
            type="text"
            value={formState.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 shadow-sm focus:border-gray-400 dark:focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-neutral-500"
            placeholder="Ej. Accesorios"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Slug</label>
          <input
            type="text"
            value={formState.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 shadow-sm focus:border-gray-400 dark:focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-neutral-500"
            placeholder="accesorios"
            required
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Solo minúsculas, números y guiones.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
          <textarea
            value={formState.description || ''}
            onChange={(e) =>
              setFormState((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            rows={4}
            className="mt-1 w-full rounded-md border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-gray-400 dark:focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-neutral-500"
            placeholder="Describe la colección para mostrarla en el storefront"
          />
        </div>

        <div>
          <CollectionImageUpload
            value={formState.image_url || ''}
            onChange={(url) =>
              setFormState((prev) => ({
                ...prev,
                image_url: url,
              }))
            }
            collectionId={collectionId}
            onFileSelected={(file) => {
              if (!collectionId) {
                onImageFileChange?.(file);
              }
            }}
          />
          {!collectionId && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              La imagen se subirá cuando guardes la colección.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
          <select
            value={formState.status}
            onChange={(e) =>
              setFormState((prev) => ({
                ...prev,
                status: e.target.value as 'active' | 'inactive',
              }))
            }
            className="mt-1 w-full rounded-md border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-gray-400 dark:focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-neutral-500"
          >
            <option value="active">Activa</option>
            <option value="inactive">Inactiva</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 dark:border-neutral-700 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-neutral-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-gray-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-gray-900 shadow-sm transition-colors hover:bg-gray-800 dark:hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
