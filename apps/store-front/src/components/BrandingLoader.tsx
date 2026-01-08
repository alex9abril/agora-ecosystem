/**
 * Componente de loading overlay para evitar transiciones visuales
 * mientras se carga el branding de la sucursal/grupo
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import CircularProgress from '@mui/material/CircularProgress';

interface BrandingLoaderProps {
  isLoading: boolean;
  backgroundColor?: string;
  branchId?: string | null;
  groupId?: string | null;
}

// Función helper para obtener el color guardado del contexto actual
const getStoredBackgroundColor = (branchId?: string | null, groupId?: string | null): string | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    if (branchId) {
      const stored = localStorage.getItem(`branding_bg_${branchId}`);
      if (stored) return stored;
    }
    if (groupId) {
      const stored = localStorage.getItem(`branding_bg_group_${groupId}`);
      if (stored) return stored;
    }
  } catch (error) {
    console.error('Error leyendo color guardado:', error);
  }
  
  return null;
};

export default function BrandingLoader({ isLoading, backgroundColor, branchId, groupId }: BrandingLoaderProps) {
  const router = useRouter();
  const [displayColor, setDisplayColor] = useState<string>('#f9fafb');
  const [isVisible, setIsVisible] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

  // Detectar cambios de ruta para mostrar el loader durante navegación
  useEffect(() => {
    const handleRouteChangeStart = () => {
      setIsNavigating(true);
      setIsVisible(true);
    };

    const handleRouteChangeComplete = () => {
      setIsNavigating(false);
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [router]);

  // Determinar el color a mostrar
  useEffect(() => {
    // Prioridad: color proporcionado > color guardado > color por defecto
    if (backgroundColor) {
      setDisplayColor(backgroundColor);
    } else {
      const storedColor = getStoredBackgroundColor(branchId, groupId);
      if (storedColor) {
        setDisplayColor(storedColor);
      } else {
        setDisplayColor('#f9fafb'); // gray-50 por defecto
      }
    }
  }, [backgroundColor, branchId, groupId]);

  // Aplicar el color al body inmediatamente
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = displayColor;
    }
  }, [displayColor]);

  useEffect(() => {
    // Cuando termine de cargar y no esté navegando, hacer fade out suave
    if (!isLoading && !isNavigating) {
      // Pequeño delay para asegurar que el contenido esté listo
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [isLoading, isNavigating]);

  // Mostrar loader si está cargando o navegando
  const shouldShow = isLoading || isNavigating;

  if (!shouldShow && !isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        backgroundColor: displayColor,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease-out',
        pointerEvents: shouldShow ? 'auto' : 'none',
      }}
    >
      <div className="flex flex-col items-center gap-4">
        <CircularProgress 
          size={48} 
          sx={{ 
            color: '#4b5563', // gray-600
          }} 
        />
        <p className="text-sm text-gray-600">Cargando...</p>
      </div>
    </div>
  );
}

