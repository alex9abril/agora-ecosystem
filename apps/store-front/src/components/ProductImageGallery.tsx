/**
 * Componente de galería de imágenes para productos
 * Muestra múltiples imágenes con thumbnails y navegación
 */

import React, { useState } from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ZoomInIcon from '@mui/icons-material/ZoomIn';

export interface ProductImage {
  id: string;
  product_id: string;
  file_path: string;
  file_name: string;
  public_url: string;
  alt_text?: string;
  display_order: number;
  is_primary: boolean;
  is_active: boolean;
}

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
  fallbackImageUrl?: string; // URL de imagen de respaldo (product.image_url)
}

export default function ProductImageGallery({ 
  images, 
  productName,
  fallbackImageUrl 
}: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  // Si no hay imágenes pero hay una imagen de respaldo, usarla
  const displayImages = images.length > 0 
    ? images 
    : fallbackImageUrl 
      ? [{ 
          id: 'fallback',
          product_id: '',
          file_path: fallbackImageUrl,
          file_name: '',
          public_url: fallbackImageUrl,
          alt_text: productName,
          display_order: 0,
          is_primary: true,
          is_active: true,
        } as ProductImage]
      : [];

  if (displayImages.length === 0) {
    return (
      <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
        <p className="text-gray-400">Sin imagen disponible</p>
      </div>
    );
  }

  const currentImage = displayImages[selectedIndex];
  const hasMultipleImages = displayImages.length > 1;

  const goToPrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setSelectedIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
  };

  const goToImage = (index: number) => {
    setSelectedIndex(index);
  };

  return (
    <div className="space-y-4">
      {/* Imagen principal */}
      <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
        <img
          src={currentImage.public_url}
          alt={currentImage.alt_text || productName}
          className="w-full h-full object-contain"
        />
        
        {/* Botones de navegación (solo si hay múltiples imágenes) */}
        {hasMultipleImages && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Imagen anterior"
            >
              <ChevronLeftIcon className="w-6 h-6 text-gray-800" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Imagen siguiente"
            >
              <ChevronRightIcon className="w-6 h-6 text-gray-800" />
            </button>
          </>
        )}

        {/* Indicador de zoom (opcional, para futura implementación) */}
        {hasMultipleImages && (
          <div className="absolute bottom-2 right-2 bg-white/80 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ZoomInIcon className="w-5 h-5 text-gray-800" />
          </div>
        )}

        {/* Contador de imágenes */}
        {hasMultipleImages && (
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
            {selectedIndex + 1} / {displayImages.length}
          </div>
        )}
      </div>

      {/* Thumbnails (solo si hay múltiples imágenes) */}
      {hasMultipleImages && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {displayImages.map((image, index) => (
            <button
              key={image.id}
              onClick={() => goToImage(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                index === selectedIndex
                  ? 'border-toyota-red ring-2 ring-toyota-red/20'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              aria-label={`Ver imagen ${index + 1}`}
            >
              <img
                src={image.public_url}
                alt={image.alt_text || `${productName} - Imagen ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

