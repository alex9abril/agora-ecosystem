import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface CollectionImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  collectionId?: string;
  onFileSelected?: (file: File | null, previewUrl: string | null) => void;
  label?: string;
  placeholder?: string;
}

export default function CollectionImageUpload({
  value,
  onChange,
  collectionId,
  onFileSelected,
  label = 'Imagen de la colección',
  placeholder = 'https://example.com/image.jpg o arrastra una imagen aquí',
}: CollectionImageUploadProps) {
  const { token } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateImageFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    const maxSize = 10 * 1024 * 1024; // 10MB

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
    if (!validateImageFile(file)) {
      return;
    }

    if (!collectionId) {
      const reader = new FileReader();
      reader.onload = () => {
        const nextPreview = typeof reader.result === 'string' ? reader.result : '';
        setPreviewUrl(nextPreview);
        onFileSelected?.(file, nextPreview);
      };
      reader.onerror = () => {
        alert('No se pudo leer la imagen');
      };
      reader.readAsDataURL(file);
      return;
    }

    if (!token) {
      alert('No estás autenticado');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = `/catalog/collections/${collectionId}/upload-image`;
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

      const result = await response.json();
      const imageUrl = result.url || result.data?.url || result.publicUrl || result.imageUrl;

      if (!imageUrl) {
        throw new Error('No se recibió URL de la imagen');
      }

      const imageUrlWithCache = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
      onChange(imageUrlWithCache);
    } catch (error: any) {
      console.error('Error subiendo imagen:', error);
      alert(error.message || 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentTarget = e.currentTarget as HTMLElement;
    const relatedTarget = e.relatedTarget as HTMLElement;

    if (!currentTarget.contains(relatedTarget)) {
      setDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    let file = e.dataTransfer.files?.[0];
    if (!file && e.dataTransfer.items?.length) {
      const item = Array.from(e.dataTransfer.items).find(
        (entry) => entry.kind === 'file',
      );
      file = item?.getAsFile() || undefined;
    }
    if (file && file.type.startsWith('image/')) {
      handleUploadImage(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadImage(file);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
          dragging ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <div className="flex items-center space-x-2">
          <input
            type="url"
            value={value || ''}
            onChange={(e) => {
              onChange(e.target.value);
              setPreviewUrl(e.target.value);
              onFileSelected?.(null, null);
            }}
            placeholder={placeholder}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            draggable={false}
          />
          <label className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 cursor-pointer transition-colors whitespace-nowrap">
            {uploading ? 'Subiendo...' : 'Subir Imagen'}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </label>
        </div>
        {dragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 rounded-lg z-10">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-black mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm font-medium text-gray-900">Suelta la imagen aquí</p>
            </div>
          </div>
        )}
        {previewUrl && (
          <div className="mt-4 flex items-center space-x-4">
            <img
              src={previewUrl}
              alt="Preview"
              className="h-32 w-auto object-contain border border-gray-200 rounded-lg bg-white p-2"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <button
              type="button"
              onClick={() => {
                onChange('');
                setPreviewUrl('');
                onFileSelected?.(null, null);
              }}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Eliminar
            </button>
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500">
          Puedes arrastrar una imagen aquí o hacer clic en &quot;Subir Imagen&quot;. Formatos: JPEG, PNG, WebP, SVG (máx. 10MB)
        </p>
      </div>
    </div>
  );
}
