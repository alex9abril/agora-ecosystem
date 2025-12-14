/**
 * Diálogo de navegación para buscar y seleccionar grupos, sucursales y marcas
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStoreContext, BusinessGroup, Business } from '@/contexts/StoreContext';
import { businessGroupsService } from '@/lib/business-groups';
import { branchesService } from '@/lib/branches';
import { vehicleBrandsService, VehicleBrand } from '@/lib/vehicle-brands';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import StoreIcon from '@mui/icons-material/Store';
import BusinessIcon from '@mui/icons-material/Business';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

interface NavigationDialogProps {
  open: boolean;
  onClose: () => void;
}

type SearchType = 'all' | 'groups' | 'branches' | 'brands';
type SearchResult = {
  type: SearchType;
  group?: BusinessGroup;
  branch?: Business;
  brand?: VehicleBrand;
};

export default function NavigationDialog({ open, onClose }: NavigationDialogProps) {
  const router = useRouter();
  const { navigateToContext } = useStoreContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');
  
  // Datos completos cargados
  const [allGroups, setAllGroups] = useState<BusinessGroup[]>([]);
  const [allBranches, setAllBranches] = useState<Business[]>([]);
  const [allBrands, setAllBrands] = useState<VehicleBrand[]>([]);
  
  // Resultados filtrados
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar todos los datos al abrir el diálogo
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setFilteredResults([]);
      setError(null);
      return;
    }

    const loadAllData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Cargar grupos
        const groupsResponse = await businessGroupsService.getGroups({
          isActive: true,
          limit: 1000,
        });
        setAllGroups(groupsResponse.data);

        // Cargar sucursales
        const branchesResponse = await branchesService.getBranches({
          isActive: true,
          limit: 1000,
        });
        setAllBranches(branchesResponse.data);

        // Cargar marcas
        const brands = await vehicleBrandsService.getBrands();
        setAllBrands(brands);
      } catch (err: any) {
        console.error('Error cargando datos:', err);
        setError('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [open]);

  // Filtrar resultados cuando cambia la búsqueda o el tipo
  useEffect(() => {
    const filterResults = () => {
      const results: SearchResult[] = [];
      const query = searchQuery.toLowerCase().trim();

      // Filtrar grupos
      if (searchType === 'all' || searchType === 'groups') {
        const filteredGroups = allGroups.filter((group) =>
          !query || 
          group.name.toLowerCase().includes(query) ||
          group.slug.toLowerCase().includes(query) ||
          (group.description && group.description.toLowerCase().includes(query))
        );
        filteredGroups.forEach((group) => {
          results.push({ type: 'groups', group });
        });
      }

      // Filtrar sucursales
      if (searchType === 'all' || searchType === 'branches') {
        const filteredBranches = allBranches.filter((branch) =>
          !query ||
          branch.name.toLowerCase().includes(query) ||
          branch.slug.toLowerCase().includes(query) ||
          (branch.address && branch.address.toLowerCase().includes(query)) ||
          (branch.city && branch.city.toLowerCase().includes(query))
        );
        filteredBranches.forEach((branch) => {
          results.push({ type: 'branches', branch });
        });
      }

      // Filtrar marcas
      if (searchType === 'all' || searchType === 'brands') {
        const filteredBrands = allBrands.filter((brand) =>
          !query ||
          brand.name.toLowerCase().includes(query) ||
          brand.code.toLowerCase().includes(query)
        );
        filteredBrands.forEach((brand) => {
          results.push({ type: 'brands', brand });
        });
      }

      setFilteredResults(results);
    };

    filterResults();
  }, [searchQuery, searchType, allGroups, allBranches, allBrands]);

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'groups' && result.group) {
      navigateToContext('grupo', result.group.slug);
      onClose();
      router.push(`/grupo/${result.group.slug}`);
    } else if (result.type === 'branches' && result.branch) {
      navigateToContext('sucursal', result.branch.slug);
      onClose();
      router.push(`/sucursal/${result.branch.slug}`);
    } else if (result.type === 'brands' && result.brand) {
      navigateToContext('brand', result.brand.code);
      onClose();
      router.push(`/brand/${result.brand.code}`);
    }
  };

  const getResultTitle = (result: SearchResult): string => {
    if (result.group) return result.group.name;
    if (result.branch) return result.branch.name;
    if (result.brand) return result.brand.name;
    return '';
  };

  const getResultSubtitle = (result: SearchResult): string => {
    if (result.group && result.group.description) {
      return result.group.description;
    }
    if (result.branch && result.branch.address) {
      return result.branch.address;
    }
    if (result.brand) {
      return `Código: ${result.brand.code}`;
    }
    return '';
  };

  const getResultIcon = (result: SearchResult) => {
    if (result.type === 'groups') return <BusinessIcon className="w-5 h-5" />;
    if (result.type === 'branches') return <StoreIcon className="w-5 h-5" />;
    if (result.type === 'brands') return <DirectionsCarIcon className="w-5 h-5" />;
    return null;
  };

  const getResultTypeLabel = (result: SearchResult): string => {
    if (result.type === 'groups') return 'Grupo';
    if (result.type === 'branches') return 'Sucursal';
    if (result.type === 'brands') return 'Marca';
    return '';
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Navegar por</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Filtros de búsqueda */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSearchType('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                searchType === 'all'
                  ? 'bg-toyota-red text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todo
            </button>
            <button
              onClick={() => setSearchType('groups')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                searchType === 'groups'
                  ? 'bg-toyota-red text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Grupos
            </button>
            <button
              onClick={() => setSearchType('branches')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                searchType === 'branches'
                  ? 'bg-toyota-red text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Sucursales
            </button>
            <button
              onClick={() => setSearchType('brands')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                searchType === 'brands'
                  ? 'bg-toyota-red text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Marcas
            </button>
          </div>

          {/* Barra de búsqueda */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar grupos, sucursales o marcas..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-toyota-red focus:border-toyota-red"
              autoFocus
            />
          </div>
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Cargando...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          ) : (
            <>
              {/* Link destacado para ver todos los productos */}
              {!searchQuery.trim() && (
                <div className="mb-4">
                  <button
                    onClick={() => {
                      navigateToContext('global', '');
                      onClose();
                      router.push('/global');
                    }}
                    className="w-full text-left p-4 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">Ver Todos los Productos</h3>
                        <p className="text-sm text-white/90">
                          Explora todos los productos de todas las sucursales
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {filteredResults.length === 0 && searchQuery.trim() ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No se encontraron resultados</p>
                </div>
              ) : filteredResults.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No hay datos disponibles</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredResults.map((result, index) => {
                const key = result.group 
                  ? `group-${result.group.id}` 
                  : result.branch 
                  ? `branch-${result.branch.id}` 
                  : result.brand 
                  ? `brand-${result.brand.id}` 
                  : `result-${index}`;
                
                return (
                  <button
                    key={key}
                    onClick={() => handleSelect(result)}
                    className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-black hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5 text-gray-600">
                        {getResultIcon(result)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-black truncate">
                            {getResultTitle(result)}
                          </h3>
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {getResultTypeLabel(result)}
                          </span>
                        </div>
                        {getResultSubtitle(result) && (
                          <p className="text-sm text-gray-600 truncate">
                            {getResultSubtitle(result)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

