/**
 * Componente para inicializar las categorías en Redux
 * Se ejecuta durante la carga inicial de la aplicación
 * Carga las categorías de forma asíncrona sin bloquear la UI
 * Las categorías son temporales y se actualizan en cada carga del sitio
 */

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  initializeCategories, 
  selectCategoriesInitialized,
  clearCategories 
} from '@/store/slices/categoriesSlice';

export default function CategoriesInitializer() {
  const dispatch = useAppDispatch();
  const initialized = useAppSelector(selectCategoriesInitialized);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Limpiar categorías anteriores para asegurar que se carguen frescas en cada carga
    dispatch(clearCategories());

    // Cargar categorías de forma asíncrona sin bloquear
    dispatch(initializeCategories()).catch((error) => {
      console.error('Error inicializando categorías:', error);
    });
  }, [dispatch]); // Sin dependencia de initialized para que se ejecute en cada montaje

  // Este componente no renderiza nada
  return null;
}

