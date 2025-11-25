import { useState, useRef } from 'react';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageChange: (file: File | null, previewUrl: string | null) => void;
  label?: string;
  required?: boolean;
  maxSizeMB?: number;
  acceptedFormats?: string[];
}

export default function ImageUpload({
  currentImageUrl,
  onImageChange,
  label = 'Imagen del producto',
  required = false,
  maxSizeMB = 5,
  acceptedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Validar tipo de archivo
    if (!acceptedFormats.includes(file.type)) {
      setError(`Formato no válido. Formatos aceptados: ${acceptedFormats.join(', ')}`);
      return false;
    }

    // Validar tamaño
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`El archivo es demasiado grande. Tamaño máximo: ${maxSizeMB}MB`);
      return false;
    }

    setError(null);
    return true;
  };

  const handleFileSelect = (file: File) => {
    if (!validateFile(file)) {
      return;
    }

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreviewUrl(result);
      onImageChange(file, result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onImageChange(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-normal text-gray-600">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div
        className={`
          relative border border-dashed rounded p-4 transition-colors
          ${isDragging ? 'border-gray-400 bg-gray-50' : 'border-gray-200'}
          ${error ? 'border-red-200' : ''}
          ${previewUrl ? 'border-solid' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />

        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-64 w-full object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-gray-900 text-white rounded-full p-1.5 hover:bg-gray-800 transition-colors"
              title="Eliminar imagen"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleClick}
              className="mt-2 w-full px-3 py-1.5 text-xs font-normal border border-gray-200 text-gray-600 rounded hover:bg-gray-50 transition-colors"
            >
              Cambiar imagen
            </button>
          </div>
        ) : (
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="mt-4 flex text-sm text-gray-500">
              <button
                type="button"
                onClick={handleClick}
                className="relative cursor-pointer text-gray-600 hover:text-gray-800 focus-within:outline-none"
              >
                <span>Sube una imagen</span>
              </button>
              <p className="pl-1">o arrastra y suelta</p>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              PNG, JPG, WEBP hasta {maxSizeMB}MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}


