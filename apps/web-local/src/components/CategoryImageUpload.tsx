import { useEffect, useRef, useState } from 'react';
import { categoriesService } from '@/lib/categories';

interface CategoryImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  categoryId?: string;
  onFileSelected?: (file: File | null, previewUrl: string | null) => void;
  label?: string;
}

export default function CategoryImageUpload({
  value,
  onChange,
  categoryId,
  onFileSelected,
  label = 'Imagen de la categoría',
}: CategoryImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showUrl, setShowUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateImageFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    const maxSize = 10 * 1024 * 1024;
    if (!allowedTypes.includes(file.type)) {
      alert('Tipo de archivo no permitido. Solo se aceptan: JPEG, JPG, PNG, WebP, SVG');
      return false;
    }
    if (file.size > maxSize) {
      alert('El archivo es demasiado grande. Tamaño máximo: 10MB');
      return false;
    }
    return true;
  };

  useEffect(() => {
    setPreviewUrl(value || '');
  }, [value]);

  const handleUploadImage = async (file: File) => {
    if (!validateImageFile(file)) return;

    if (!categoryId) {
      const reader = new FileReader();
      reader.onload = () => {
        const nextPreview = typeof reader.result === 'string' ? reader.result : '';
        setPreviewUrl(nextPreview);
        onFileSelected?.(file, nextPreview);
      };
      reader.onerror = () => alert('No se pudo leer la imagen');
      reader.readAsDataURL(file);
      return;
    }

    setUploading(true);
    try {
      const result = await categoriesService.uploadImage(categoryId, file);
      if (!result.url) throw new Error('No se recibió URL de la imagen');
      const imageUrlWithCache = `${result.url}${result.url.includes('?') ? '&' : '?'}t=${Date.now()}`;
      onChange(imageUrlWithCache);
      onFileSelected?.(null, null);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentTarget = e.currentTarget as HTMLElement;
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!currentTarget.contains(relatedTarget)) setDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    let file: File | null = e.dataTransfer.files?.[0] ?? null;
    if (!file && e.dataTransfer.items?.length) {
      const item = Array.from(e.dataTransfer.items).find((entry) => entry.kind === 'file');
      file = item?.getAsFile() ?? null;
    }
    if (file && file.type.startsWith('image/')) handleUploadImage(file);
  };

  const clearImage = () => {
    onChange('');
    setPreviewUrl('');
    onFileSelected?.(null, null);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</label>
        <button
          type="button"
          onClick={() => setShowUrl((v) => !v)}
          className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
        >
          {showUrl ? 'Ocultar URL' : 'Usar URL'}
        </button>
      </div>

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
          dragging
            ? 'border-black bg-gray-50 dark:border-white dark:bg-neutral-800'
            : 'border-gray-200 bg-[#f4f4f4] dark:border-neutral-700 dark:bg-neutral-800'
        }`}
      >
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="relative block aspect-[5/4] w-full"
          aria-label="Subir imagen de categoría"
        >
          {previewUrl ? (
            <img src={previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              <span className="text-sm text-gray-500">Arrastra o haz clic para subir</span>
              <span className="text-[11px] text-gray-400">JPEG, PNG, WebP o SVG · máx. 10MB</span>
            </div>
          )}
          {previewUrl && (
            <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity hover:opacity-100">
              <span className="mb-3 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-900">
                {uploading ? 'Subiendo…' : 'Cambiar imagen'}
              </span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/40">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
            </div>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUploadImage(file);
            e.target.value = '';
          }}
          disabled={uploading}
        />
      </div>

      {previewUrl && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={clearImage}
            className="text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400"
          >
            Quitar imagen
          </button>
        </div>
      )}

      {showUrl && (
        <input
          type="url"
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value);
            setPreviewUrl(e.target.value);
            onFileSelected?.(null, null);
          }}
          placeholder="https://…"
          className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-100"
        />
      )}
    </div>
  );
}
