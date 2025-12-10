/**
 * Página de catálogo global - Todos los productos de todas las sucursales
 * Similar a la vista de grupo pero incluye todas las sucursales disponibles
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import ProductGrid from '@/components/ProductGrid';
import CategoryBreadcrumbs from '@/components/CategoryBreadcrumbs';
import CategoryInfo from '@/components/CategoryInfo';
import { useStoreContext } from '@/contexts/StoreContext';
import { branchesService } from '@/lib/branches';
import { Business } from '@/lib/branches';

export default function GlobalProductsPage() {
  const router = useRouter();
  const { navigateToContext } = useStoreContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryDescription, setCategoryDescription] = useState<string>('');
  const [allBranches, setAllBranches] = useState<Business[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set());
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [showBranchSelector, setShowBranchSelector] = useState(false);

  // Asegurar que estamos en contexto global (solo una vez al montar)
  useEffect(() => {
    navigateToContext('global', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar todas las sucursales disponibles
  useEffect(() => {
    const loadBranches = async () => {
      try {
        setLoadingBranches(true);
        const response = await branchesService.getBranches({
          isActive: true,
          limit: 1000,
        });
        setAllBranches(response.data);
        // Por defecto, seleccionar todas las sucursales
        setSelectedBranches(new Set(response.data.map(b => b.id)));
      } catch (error) {
        console.error('Error cargando sucursales:', error);
      } finally {
        setLoadingBranches(false);
      }
    };

    loadBranches();
  }, []);

  // Convertir selectedBranches a array ordenado para comparación estable
  const selectedBranchesArray = useMemo(() => {
    return Array.from(selectedBranches).sort();
  }, [selectedBranches]);

  // Memoizar los filtros para evitar recrearlos en cada render
  const filters = useMemo(() => {
    const newFilters: any = {
      isAvailable: true,
    };
    
    if (searchQuery) {
      newFilters.search = searchQuery;
    }
    
    if (categoryFilter) {
      newFilters.categoryId = categoryFilter;
    }
    
    // Agregar filtro de sucursales seleccionadas
    // Nota: El backend solo soporta un branchId a la vez, así que:
    // - Si todas están seleccionadas o ninguna: mostrar todos los productos (sin filtro)
    // - Si solo una está seleccionada: filtrar por esa sucursal
    // - Si múltiples están seleccionadas: mostrar todos (ya que no podemos filtrar por múltiples)
    if (selectedBranchesArray.length === 1) {
      // Solo una sucursal seleccionada, filtrar por ella
      newFilters.branchId = selectedBranchesArray[0];
    }
    // Si todas o ninguna están seleccionadas, no agregar filtro (mostrar todas)
    
    return newFilters;
  }, [searchQuery, categoryFilter, selectedBranchesArray]);

  // Actualizar searchQuery y categoryFilter desde router.query
  useEffect(() => {
    if (!router.isReady) return;
    
    const { search, categoryId } = router.query;
    
    if (search && typeof search === 'string') {
      setSearchQuery(search);
    } else {
      setSearchQuery('');
    }
    
    if (categoryId && typeof categoryId === 'string') {
      setCategoryFilter(categoryId);
    } else {
      setCategoryFilter('');
    }
  }, [router.isReady, router.query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Los filtros se actualizan automáticamente a través de useMemo cuando cambia searchQuery
    // No necesitamos hacer nada aquí, solo prevenir el submit del formulario
  };

  const handleBranchToggle = (branchId: string) => {
    setSelectedBranches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(branchId)) {
        newSet.delete(branchId);
      } else {
        newSet.add(branchId);
      }
      return newSet;
    });
  };

  const handleSelectAllBranches = () => {
    setSelectedBranches(new Set(allBranches.map(b => b.id)));
  };

  const handleDeselectAllBranches = () => {
    setSelectedBranches(new Set());
  };

  return (
    <>
      <Head>
        <title>Todos los Productos - Agora</title>
        <meta name="description" content="Catálogo completo de productos de todas las sucursales" />
      </Head>
      <StoreLayout>
        <div className="mb-8">
          {/* Breadcrumbs de categoría */}
          {categoryFilter && (
            <CategoryBreadcrumbs categoryId={categoryFilter} />
          )}

          {/* Título y selector de sucursales */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {categoryName || 'Todos los Productos'}
                </h1>
                <p className="text-gray-600 text-base">
                  {categoryDescription || 'Productos de todas las sucursales disponibles'}
                </p>
              </div>
              <button
                onClick={() => setShowBranchSelector(!showBranchSelector)}
                className="px-4 py-2 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {showBranchSelector ? 'Ocultar' : 'Filtrar'} Sucursales
                {selectedBranches.size > 0 && selectedBranches.size < allBranches.length && (
                  <span className="bg-white text-toyota-red text-xs font-bold px-2 py-0.5 rounded-full">
                    {selectedBranches.size}
                  </span>
                )}
              </button>
            </div>

            {/* Selector de sucursales */}
            {showBranchSelector && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Filtrar por Sucursales</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAllBranches}
                      className="text-xs text-toyota-red hover:text-toyota-red-dark font-medium"
                    >
                      Seleccionar todas
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={handleDeselectAllBranches}
                      className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Deseleccionar todas
                    </button>
                  </div>
                </div>
                {loadingBranches ? (
                  <p className="text-sm text-gray-500">Cargando sucursales...</p>
                ) : allBranches.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay sucursales disponibles</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                    {allBranches.map((branch) => {
                      const isSelected = selectedBranches.has(branch.id);
                      return (
                        <label
                          key={branch.id}
                          className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-toyota-red/10 border-toyota-red'
                              : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleBranchToggle(branch.id)}
                            className="w-4 h-4 text-toyota-red border-gray-300 rounded focus:ring-toyota-red"
                          />
                          <span className={`text-sm ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                            {branch.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {selectedBranches.size > 0 && (
                  <p className="text-xs text-gray-500 mt-3">
                    {selectedBranches.size === 1 
                      ? `Mostrando productos de 1 sucursal seleccionada`
                      : selectedBranches.size === allBranches.length
                      ? `Mostrando productos de todas las sucursales (${allBranches.length})`
                      : `Mostrando productos de todas las sucursales (seleccionadas: ${selectedBranches.size} de ${allBranches.length})`
                    }
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Layout: Panel lateral izquierdo + Productos en el centro */}
          <div className="flex gap-6">
            {/* Panel lateral izquierdo - Información de categoría */}
            {categoryFilter && (
              <aside className="w-64 flex-shrink-0">
                <CategoryInfo 
                  categoryId={categoryFilter} 
                  onCategoryLoaded={(name, description) => {
                    setCategoryName(name);
                    setCategoryDescription(description || '');
                  }}
                />
              </aside>
            )}

            {/* Contenido principal - Productos */}
            <div className="flex-1 min-w-0">
              {/* Grid de productos */}
              <ProductGrid filters={filters} />
            </div>
          </div>
        </div>
      </StoreLayout>
    </>
  );
}

