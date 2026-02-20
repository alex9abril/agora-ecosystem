/**
 * Carga de imágenes de sliders en web-admin (contexto global o por marca)
 */

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SliderImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  contextType: 'global' | 'brand';
  contextId: string;
  label?: string;
  placeholder?: string;
}

export default function SliderImageUpload({
  value,
  onChange,
  contextType,
  contextId,
  label = 'Imagen de Fondo',
  placeholder = 'URL o arrastra una imagen',
}: SliderImageUploadProps) {
  const { token } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateImageFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (!allowedTypes.includes(file.type)) {
      alert('Tipo no permitido. Solo JPEG, PNG, WebP, SVG');
      return false;
    }
    if (file.size > maxSize) {
      alert('Máximo 10MB');
      return false;
    }
    return true;
  };

  const getUploadEndpoint = (): string => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    if (contextType === 'global') return `${base}/landing-sliders/upload-image/global`;
    return `${base}/landing-sliders/upload-image/brand/${contextId}`;
  };

  const handleUploadImage = async (file: File) => {
    if (!token) {
      alert('No estás autenticado');
      return;
    }
    if (!validateImageFile(file)) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(getUploadEndpoint(), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Error al subir la imagen');
      }

      const result = await response.json();
      const url = result.url || result.data?.url;
      if (!url) throw new Error('No se recibió URL');
      onChange(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`);
    } catch (e: any) {
      alert(e.message || 'Error al subir');
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
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setDragging(false);
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
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) handleUploadImage(file);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
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
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black"
          />
          <label className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 cursor-pointer whitespace-nowrap">
            {uploading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Subiendo...
              </span>
            ) : (
              'Subir Imagen'
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUploadImage(e.target.files[0])}
              disabled={uploading}
            />
          </label>
        </div>
        {value && (
          <div className="mt-4 flex items-center space-x-4">
            <img
              src={value}
              alt="Preview"
              className="h-32 w-auto object-contain border border-gray-200 rounded-lg bg-white p-2"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
            <button type="button" onClick={() => onChange('')} className="text-sm text-red-600 hover:text-red-800 font-medium">
              Eliminar
            </button>
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500">JPEG, PNG, WebP, SVG (máx. 10MB)</p>
      </div>
    </div>
  );
}
