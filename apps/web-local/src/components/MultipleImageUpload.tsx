import { useState, useRef, useEffect } from 'react';

export interface ProductImage {
  id?: string;
  public_url: string;
  alt_text?: string;
  is_primary?: boolean;
  display_order?: number;
  file?: File; // Para nuevas imágenes que aún no se han subido
  preview?: string; // Para preview de nuevas imágenes
}

interface MultipleImageUploadProps {
  productId?: string;
  images: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
  label?: string;
  maxImages?: number;
  maxSizeMB?: number;
  acceptedFormats?: string[];
  onUploadImage?: (file: File, productId: string) => Promise<ProductImage>;
  onDeleteImage?: (imageId: string) => Promise<void>;
  onSetPrimary?: (imageId: string) => Promise<void>;
}

export default function MultipleImageUpload({
  productId,
  images = [],
  onImagesChange,
  label = 'Imágenes del producto',
  maxImages = 10,
  maxSizeMB = 5,
  acceptedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  onUploadImage,
  onDeleteImage,
  onSetPrimary,
}: MultipleImageUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null); // ID de imagen que se está subiendo
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

    // Validar cantidad máxima
    if (images.length >= maxImages) {
      setError(`Máximo ${maxImages} imágenes permitidas`);
      return false;
    }

    setError(null);
    return true;
  };

  const handleFileSelect = async (file: File) => {
    if (!validateFile(file)) {
      return;
    }

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      
      // Si hay productId y función de upload, subir inmediatamente
      if (productId && onUploadImage) {
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const newImage: ProductImage = {
          id: tempId,
          file,
          preview,
          public_url: preview, // Usar preview temporalmente
        };
        
        // Agregar a la lista inmediatamente con preview
        const imagesWithNew = [...images, newImage];
        onImagesChange(imagesWithNew);
        setUploading(tempId);

        // Subir al servidor
        onUploadImage(file, productId)
          .then((uploadedImage) => {
            console.log('✅ Imagen subida exitosamente:', uploadedImage);
            console.log('🔍 Tipo de uploadedImage:', typeof uploadedImage);
            console.log('🔍 uploadedImage.id:', uploadedImage?.id);
            console.log('🔍 uploadedImage.public_url:', uploadedImage?.public_url);
            
            // Reemplazar la imagen temporal con la real
            const updated = imagesWithNew.map(img => {
              if (img.id === tempId) {
                const newImg: ProductImage = {
                  id: uploadedImage.id,
                  public_url: uploadedImage.public_url,
                  alt_text: uploadedImage.alt_text || undefined,
                  is_primary: uploadedImage.is_primary || false,
                  display_order: uploadedImage.display_order || 0,
                };
                console.log('🔄 Reemplazando imagen temporal con:', newImg);
                return newImg;
              }
              return img;
            });
            console.log('📸 Imágenes actualizadas:', updated);
            onImagesChange(updated);
            setUploading(null);
          })
          .catch((err) => {
            console.error('❌ Error subiendo imagen:', err);
            // Remover la imagen temporal en caso de error
            onImagesChange(imagesWithNew.filter(img => img.id !== tempId));
            setUploading(null);
            setError(`Error al subir imagen: ${err.message || 'Error desconocido'}`);
          });
      } else {
        // Si no hay productId, solo agregar con preview
        const newImage: ProductImage = {
          file,
          preview,
          public_url: preview,
        };
        onImagesChange([...images, newImage]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => handleFileSelect(file));
    // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => handleFileSelect(file));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemove = async (image: ProductImage, index: number) => {
    const isServerImage = !!image.id && !image.id.startsWith('temp-');
    if (isServerImage && onDeleteImage) {
      try {
        await onDeleteImage(image.id!);
        onImagesChange(images.filter((_, i) => i !== index));
      } catch (err: any) {
        console.error('Error eliminando imagen:', err);
        setError(`Error al eliminar imagen: ${err.message || 'Error desconocido'}`);
      }
    } else {
      // Imagen local (pendiente de subir) o temporal — solo quitar del estado
      onImagesChange(images.filter((_, i) => i !== index));
    }
  };

  const handleSetPrimary = async (image: ProductImage) => {
    if (!image.id || image.id.startsWith('temp-')) {
      return; // No se puede marcar como principal si aún no está subida
    }

    if (onSetPrimary) {
      try {
        await onSetPrimary(image.id);
        // Actualizar el estado local
        onImagesChange(
          images.map(img => ({
            ...img,
            is_primary: img.id === image.id,
          }))
        );
      } catch (err: any) {
        console.error('Error marcando imagen como principal:', err);
        setError(`Error al marcar imagen como principal: ${err.message || 'Error desconocido'}`);
      }
    } else {
      // Si no hay función, solo actualizar localmente
      onImagesChange(
        images.map(img => ({
          ...img,
          is_primary: img.id === image.id,
        }))
      );
    }
  };

  const handleClick = () => {
    if (images.length >= maxImages) {
      setError(`Máximo ${maxImages} imágenes permitidas`);
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-normal text-gray-600">
        {label} {images.length > 0 && <span className="text-gray-400">({images.length}/{maxImages})</span>}
      </label>

      {/* Grid de imágenes existentes */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((image, index) => {
            const isServerImage = !!image.id && !image.id.startsWith('temp-');
            const isPending = !isServerImage && !!image.file;
            return (
              <div
                key={image.id || `preview-${index}`}
                className="relative group border border-gray-200 rounded-lg overflow-hidden bg-white"
              >
                <div className="aspect-square relative">
                  <img
                    src={image.public_url}
                    alt={image.alt_text || `Imagen ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay con acciones — visible en hover */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-2">
                      {/* "Marcar como principal" solo para imágenes ya guardadas */}
                      {isServerImage && !image.is_primary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(image)}
                          className="bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 transition-colors"
                          title="Marcar como principal"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      )}
                      {/* Eliminar — disponible para todas las imágenes */}
                      <button
                        type="button"
                        onClick={() => handleRemove(image, index)}
                        className="bg-red-600 text-white rounded-full p-2 hover:bg-red-700 transition-colors"
                        title="Eliminar imagen"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Indicador de imagen principal */}
                  {image.is_primary && (
                    <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                      Principal
                    </div>
                  )}

                  {/* Badge "Pendiente" para imágenes aún no subidas */}
                  {isPending && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                      Pendiente
                    </div>
                  )}

                  {/* Indicador de carga */}
                  {uploading === image.id && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Área de carga */}
      {images.length < maxImages && (
        <div
          className={`
            relative border border-dashed rounded p-4 transition-colors cursor-pointer
            ${isDragging ? 'border-gray-400 bg-gray-50' : 'border-gray-200'}
            ${error ? 'border-red-200' : ''}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats.join(',')}
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />

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
            <div className="mt-4 flex text-sm text-gray-500 justify-center">
              <button
                type="button"
                className="relative cursor-pointer text-gray-600 hover:text-gray-800 focus-within:outline-none"
              >
                <span>Agregar imágenes</span>
              </button>
              <p className="pl-1">o arrastra y suelta</p>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              PNG, JPG, WEBP hasta {maxSizeMB}MB cada una
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

