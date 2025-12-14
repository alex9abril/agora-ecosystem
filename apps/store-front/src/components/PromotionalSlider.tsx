/**
 * Componente de Slider Promocional
 * Inspirado en Mercado Libre y Amazon
 * Muestra banners promocionales con elementos overlay
 */

import React, { useState, useEffect, useCallback } from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ContextualLink from './ContextualLink';

export interface ProductImage {
  url: string;
  alt?: string;
  position?: { top?: string; left?: string; right?: string; bottom?: string };
  size?: string; // ej: "200px", "15%"
  rotation?: number; // grados de rotación
  zIndex?: number;
}

export interface SlideContent {
  id: string;
  imageUrl?: string; // Imagen de fondo opcional
  imageAlt?: string;
  backgroundColor?: string; // Color de fondo si no hay imagen
  gradientColors?: string[]; // Colores para gradiente (ej: ['#8b5cf6', '#1e1b4b'])
  overlay?: {
    position?: 'left' | 'center' | 'right';
    title?: string;
    titleHighlight?: string; // Parte del título a destacar (más grande/bold)
    subtitle?: string;
    description?: string;
    badge?: string; // Badge de oferta (ej: "YA DISPONIBLE", "20% OFF")
    badgeColor?: string;
    badgePosition?: 'top-left' | 'top-right' | 'top-center';
    ctaText?: string; // Texto del botón CTA
    ctaLink?: string;
    ctaColor?: string;
    secondaryText?: string; // Texto secundario (ej: "HASTA 15 MESES SIN INTERESES")
    discountCode?: string; // Código de descuento
    validUntil?: string; // Fecha de validez
    termsText?: string; // Texto de términos (ej: "Ver aquí T&C.")
  };
  productImages?: ProductImage[]; // Imágenes de productos superpuestas
  decorativeElements?: boolean; // Agregar elementos decorativos flotantes
}

interface PromotionalSliderProps {
  slides: SlideContent[];
  autoPlay?: boolean;
  autoPlayInterval?: number; // en milisegundos
  showDots?: boolean;
  showArrows?: boolean;
  height?: string; // altura del slider (ej: "400px", "60vh")
  className?: string;
}

export default function PromotionalSlider({
  slides,
  autoPlay = true,
  autoPlayInterval = 5000,
  showDots = true,
  showArrows = true,
  height = '400px',
  className = '',
}: PromotionalSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-play
  useEffect(() => {
    if (!autoPlay || isPaused || slides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, isPaused, slides.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsPaused(true);
    // Reanudar auto-play después de 3 segundos
    setTimeout(() => setIsPaused(false), 3000);
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 3000);
  }, [slides.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 3000);
  }, [slides.length]);

  if (!slides || slides.length === 0) {
    return null;
  }

  const currentSlide = slides[currentIndex];
  const overlayPosition = currentSlide.overlay?.position || 'left';

  // Generar gradiente si hay colores especificados
  const gradientStyle = currentSlide.gradientColors && currentSlide.gradientColors.length > 0
    ? {
        background: `linear-gradient(to right, ${currentSlide.gradientColors.join(', ')})`,
      }
    : currentSlide.backgroundColor
    ? { backgroundColor: currentSlide.backgroundColor }
    : {};

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{ height }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slide actual */}
      <div
        className="absolute inset-0 transition-opacity duration-700 ease-in-out"
        style={{
          opacity: 1,
        }}
      >
        {/* Fondo con gradiente o color sólido */}
        <div
          className="absolute inset-0"
          style={gradientStyle}
        >
          {/* Imagen de fondo si existe */}
          {currentSlide.imageUrl && (
            <img
              src={currentSlide.imageUrl}
              alt={currentSlide.imageAlt || `Slide ${currentIndex + 1}`}
              className="w-full h-full object-cover opacity-30"
            />
          )}
        </div>

        {/* Elementos decorativos flotantes (como Mercado Libre) */}
        {currentSlide.decorativeElements && (
          <>
            <div
              className="absolute left-0 top-1/4 w-64 h-64 opacity-20 blur-3xl slider-float"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
                transform: 'rotate(-45deg)',
                animation: 'sliderFloat 6s ease-in-out infinite',
              }}
            />
            <div
              className="absolute right-0 bottom-1/4 w-96 h-96 opacity-15 blur-3xl slider-float"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
                transform: 'rotate(45deg)',
                animation: 'sliderFloat 8s ease-in-out infinite',
                animationDelay: '1s',
              }}
            />
          </>
        )}

        {/* Imágenes de productos superpuestas */}
        {currentSlide.productImages && currentSlide.productImages.map((productImg, idx) => (
          <div
            key={idx}
            className="absolute transition-all duration-500 hover:scale-110"
            style={{
              top: productImg.position?.top || 'auto',
              left: productImg.position?.left || 'auto',
              right: productImg.position?.right || 'auto',
              bottom: productImg.position?.bottom || 'auto',
              width: productImg.size || '200px',
              height: productImg.size || '200px',
              transform: productImg.rotation ? `rotate(${productImg.rotation}deg)` : 'none',
              zIndex: productImg.zIndex || 5,
            }}
          >
            <img
              src={productImg.url}
              alt={productImg.alt || `Producto ${idx + 1}`}
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>
        ))}

        {/* Badge superior (ej: "YA DISPONIBLE") */}
        {currentSlide.overlay?.badge && currentSlide.overlay.badgePosition && (
          <div
            className={`absolute top-6 z-20 ${
              currentSlide.overlay.badgePosition === 'top-right'
                ? 'right-6'
                : currentSlide.overlay.badgePosition === 'top-center'
                ? 'left-1/2 -translate-x-1/2'
                : 'left-6'
            }`}
          >
            <div
              className={`px-4 py-2 rounded-lg text-sm md:text-base font-bold text-white shadow-lg ${
                currentSlide.overlay.badgeColor || 'bg-pink-500'
              }`}
            >
              {currentSlide.overlay.badge}
            </div>
          </div>
        )}

        {/* Overlay con contenido */}
        {currentSlide.overlay && (
          <div
            className={`absolute inset-0 flex items-center z-10 ${
              overlayPosition === 'center'
                ? 'justify-center'
                : overlayPosition === 'right'
                ? 'justify-end pr-8 md:pr-16'
                : 'justify-start pl-8 md:pl-16'
            } py-8 md:py-12`}
          >
            <div
              className={`max-w-2xl ${
                overlayPosition === 'center'
                  ? 'text-center'
                  : overlayPosition === 'right'
                  ? 'text-right'
                  : 'text-left'
              }`}
            >
              {/* Badge de oferta (si no está en posición superior) */}
              {currentSlide.overlay.badge && !currentSlide.overlay.badgePosition && (
                <div
                  className={`inline-block px-4 py-2 rounded-lg text-2xl md:text-3xl font-bold text-white mb-4 shadow-lg ${
                    currentSlide.overlay.badgeColor || 'bg-toyota-red'
                  }`}
                >
                  {currentSlide.overlay.badge}
                </div>
              )}

              {/* Título con parte destacada */}
              {currentSlide.overlay.title && (
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 drop-shadow-2xl leading-tight">
                  {currentSlide.overlay.titleHighlight ? (
                    <>
                      {currentSlide.overlay.title.split(currentSlide.overlay.titleHighlight)[0]}
                      <span className="text-3xl md:text-4xl lg:text-5xl block mt-1" style={{ textShadow: '0 0 15px rgba(255,255,255,0.5)' }}>
                        {currentSlide.overlay.titleHighlight}
                      </span>
                    </>
                  ) : (
                    currentSlide.overlay.title
                  )}
                </h2>
              )}

              {/* Subtítulo */}
              {currentSlide.overlay.subtitle && (
                <h3 className="text-base md:text-lg font-semibold text-white mb-1 drop-shadow-md">
                  {currentSlide.overlay.subtitle}
                </h3>
              )}

              {/* Descripción */}
              {currentSlide.overlay.description && (
                <p className="text-sm md:text-base text-white mb-2 drop-shadow-md">
                  {currentSlide.overlay.description}
                </p>
              )}

              {/* Texto secundario (ej: "HASTA 15 MESES SIN INTERESES") */}
              {currentSlide.overlay.secondaryText && (
                <p className="text-xs md:text-sm text-white/90 mb-2 font-medium drop-shadow-md">
                  {currentSlide.overlay.secondaryText}
                </p>
              )}

              {/* Código de descuento */}
              {currentSlide.overlay.discountCode && (
                <div className="mb-2">
                  <p className="text-xs text-white/80 mb-1">Código:</p>
                  <p className="text-base md:text-lg font-bold text-white drop-shadow-md">
                    {currentSlide.overlay.discountCode}
                  </p>
                </div>
              )}

              {/* Fecha de validez */}
              {currentSlide.overlay.validUntil && (
                <p className="text-xs text-white/70 mb-2">
                  Válido hasta: {currentSlide.overlay.validUntil}
                </p>
              )}

              {/* Botón CTA */}
              {currentSlide.overlay.ctaText && (
                <div className="mt-4">
                  {currentSlide.overlay.ctaLink ? (
                    <ContextualLink
                      href={currentSlide.overlay.ctaLink}
                      className={`inline-block px-6 py-3 rounded-lg text-base font-bold text-white transition-all hover:scale-110 shadow-xl hover:shadow-2xl ${
                        currentSlide.overlay.ctaColor || 'bg-white text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {currentSlide.overlay.ctaText}
                    </ContextualLink>
                  ) : (
                    <button
                      className={`inline-block px-6 py-3 rounded-lg text-base font-bold text-white transition-all hover:scale-110 shadow-xl hover:shadow-2xl ${
                        currentSlide.overlay.ctaColor || 'bg-white text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {currentSlide.overlay.ctaText}
                    </button>
                  )}
                </div>
              )}

              {/* Texto de términos */}
              {currentSlide.overlay.termsText && (
                <p className="text-xs text-white/70 mt-4">
                  {currentSlide.overlay.termsText}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Botones de navegación */}
      {showArrows && slides.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-3 shadow-xl transition-all hover:scale-110 z-30 backdrop-blur-sm"
            aria-label="Slide anterior"
          >
            <ChevronLeftIcon className="w-6 h-6 text-gray-800" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-3 shadow-xl transition-all hover:scale-110 z-30 backdrop-blur-sm"
            aria-label="Slide siguiente"
          >
            <ChevronRightIcon className="w-6 h-6 text-gray-800" />
          </button>
        </>
      )}

      {/* Indicadores de puntos (dots) */}
      {showDots && slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-30">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-white w-8 shadow-lg'
                  : 'bg-white/50 hover:bg-white/75 w-2'
              }`}
              aria-label={`Ir al slide ${index + 1}`}
            />
          ))}
        </div>
      )}

    </div>
  );
}

