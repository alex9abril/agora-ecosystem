/**
 * Página de gestión de Sliders del Landing Page
 * Permite gestionar sliders a nivel de grupo empresarial o sucursal
 */

import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { businessService, BusinessGroup, Business } from '@/lib/business';
import {
  landingSlidersService,
  LandingSlider,
  RedirectType,
} from '@/lib/landing-sliders';

export default function SlidersPage() {
  const router = useRouter();
  const { selectedBusiness, availableBusinesses } = useSelectedBusiness();
  const [loading, setLoading] = useState(true);
  const [sliders, setSliders] = useState<LandingSlider[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Estados para contexto (grupo o sucursal)
  const [contextType, setContextType] = useState<'group' | 'branch' | null>(null);
  const [businessGroup, setBusinessGroup] = useState<BusinessGroup | null>(null);
  const [branches, setBranches] = useState<Business[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<'group' | 'branch' | null>(null);
  const [groupSlidersCount, setGroupSlidersCount] = useState<number>(0);
  const [branchSlidersCounts, setBranchSlidersCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadContextData();
  }, [selectedBusiness]);

  useEffect(() => {
    if (selectedContext) {
      loadSliders();
    }
  }, [selectedContext, businessGroup, selectedBranchId]);

  useEffect(() => {
    if (businessGroup) {
      loadGroupSlidersCount();
    }
    if (branches.length > 0) {
      loadBranchSlidersCounts();
    }
  }, [businessGroup, branches]);

  const loadContextData = async () => {
    try {
      setLoading(true);

      // Intentar obtener el grupo empresarial del usuario
      const group = await businessService.getMyBusinessGroup();
      
      if (group) {
        setBusinessGroup(group);
        
        // Cargar sucursales del grupo
        const branchesResponse = await businessService.getBranches({ groupId: group.id });
        setBranches(branchesResponse.data);
      } else {
        // Si no hay grupo, verificar si hay sucursales disponibles
        if (selectedBusiness) {
          const branch = await businessService.getMyBusiness(selectedBusiness.business_id);
          if (branch) {
            setBranches([branch]);
            setSelectedBranchId(branch.id);
            setSelectedContext('branch');
            setContextType('branch');
          }
        }
      }
    } catch (error: any) {
      console.error('Error cargando contexto:', error);
      setError('Error al cargar información del contexto');
    } finally {
      setLoading(false);
    }
  };

  const loadSliders = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: any = {};
      if (selectedContext === 'group' && businessGroup) {
        filters.business_group_id = businessGroup.id;
      } else if (selectedContext === 'branch' && selectedBranchId) {
        filters.business_id = selectedBranchId;
      }

      const response = await landingSlidersService.list(filters);
      setSliders(response.data);
    } catch (error: any) {
      console.error('Error cargando sliders:', error);
      setError('Error al cargar sliders');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContext = (type: 'group' | 'branch', branchId?: string) => {
    setSelectedContext(type);
    setContextType(type);
    if (type === 'branch' && branchId) {
      setSelectedBranchId(branchId);
    } else {
      setSelectedBranchId(null);
    }
  };

  const handleCreate = () => {
    const params = new URLSearchParams();
    if (selectedContext === 'group' && businessGroup) {
      params.append('context', 'group');
      params.append('group_id', businessGroup.id);
    } else if (selectedContext === 'branch' && selectedBranchId) {
      params.append('context', 'branch');
      params.append('branch_id', selectedBranchId);
    }
    router.push(`/sliders/new?${params.toString()}`);
  };

  const handleEdit = (slider: LandingSlider) => {
    router.push(`/sliders/${slider.id}/edit`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este slider?')) {
      return;
    }

    try {
      await landingSlidersService.delete(id);
      await loadSliders();
    } catch (error: any) {
      console.error('Error eliminando slider:', error);
      setError('Error al eliminar slider');
    }
  };

  const handleToggleActive = async (slider: LandingSlider) => {
    try {
      await landingSlidersService.update(slider.id, {
        is_active: !slider.is_active,
      });
      await loadSliders();
    } catch (error: any) {
      console.error('Error actualizando estado:', error);
      setError('Error al actualizar estado');
    }
  };

  // Cargar conteo de sliders del grupo
  const loadGroupSlidersCount = async () => {
    if (!businessGroup) return;
    try {
      const response = await landingSlidersService.list({ business_group_id: businessGroup.id });
      setGroupSlidersCount(response.data.length);
    } catch (error) {
      console.error('Error cargando conteo de sliders del grupo:', error);
      setGroupSlidersCount(0);
    }
  };

  // Cargar conteos de sliders de todas las sucursales
  const loadBranchSlidersCounts = async () => {
    const counts: Record<string, number> = {};
    for (const branch of branches) {
      try {
        const response = await landingSlidersService.list({ business_id: branch.id });
        counts[branch.id] = response.data.length;
      } catch (error) {
        console.error(`Error cargando conteo de sliders de ${branch.name}:`, error);
        counts[branch.id] = 0;
      }
    }
    setBranchSlidersCounts(counts);
  };

  if (loading && !contextType && !businessGroup) {
    return (
      <LocalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Cargando...</div>
        </div>
      </LocalLayout>
    );
  }

  return (
    <LocalLayout>
      <Head>
        <title>Gestión de Sliders - LOCALIA</title>
      </Head>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Sliders</h1>
          <p className="text-gray-600">
            Administra los sliders promocionales que se mostrarán en el landing page de tu grupo o sucursales
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Selección de Contexto - Diseño Profesional */}
        {businessGroup && branches.length > 0 && !selectedContext && (
          <div className="mb-8">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Selecciona el contexto para gestionar sliders
              </h2>
              <p className="text-sm text-gray-600">
                Elige si deseas gestionar sliders para todo el grupo o para una sucursal específica
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card del Grupo */}
              <ContextCard
                type="group"
                title={businessGroup.name}
                description="Gestiona sliders que se mostrarán en la página principal del grupo empresarial"
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
                stats={[
                  { label: 'Sucursales', value: branches.length },
                  { label: 'Sliders', value: groupSlidersCount },
                ]}
                onClick={() => handleSelectContext('group')}
                isSelected={selectedContext === 'group'}
              />

              {/* Cards de Sucursales */}
              {branches.map((branch) => (
                <ContextCard
                  key={branch.id}
                  type="branch"
                  title={branch.name}
                  description={branch.business_address || 'Gestiona sliders específicos para esta sucursal'}
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                  stats={[
                    { label: 'Sliders', value: branchSlidersCounts[branch.id] || 0 },
                    { label: 'Estado', value: branch.is_active ? 'Activa' : 'Inactiva' },
                  ]}
                  onClick={() => handleSelectContext('branch', branch.id)}
                  isSelected={selectedContext === 'branch' && selectedBranchId === branch.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Vista de gestión cuando hay contexto seleccionado */}
        {selectedContext && (
          <>
            {/* Breadcrumb y selector de contexto */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setSelectedContext(null);
                    setSelectedBranchId(null);
                    setSliders([]);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Volver a selección
                </button>
                <div className="h-4 w-px bg-gray-300"></div>
                <div className="text-sm text-gray-600">
                  {selectedContext === 'group' && businessGroup
                    ? `Grupo: ${businessGroup.name}`
                    : selectedContext === 'branch' && selectedBranchId
                    ? `Sucursal: ${branches.find(b => b.id === selectedBranchId)?.name || ''}`
                    : ''}
                </div>
              </div>
              <button
                onClick={handleCreate}
                className="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear Slider
              </button>
            </div>

            {/* Lista de sliders */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-4 text-gray-500">Cargando sliders...</p>
              </div>
            ) : sliders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay sliders configurados</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Crea tu primer slider para comenzar a promocionar en tu landing page
                </p>
                <button
                  onClick={handleCreate}
                  className="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Crear Primer Slider
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sliders.map((slider) => (
                  <div
                    key={slider.id}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 group"
                  >
                    {/* Preview del slider */}
                    <div
                      className="h-48 bg-cover bg-center relative"
                      style={{
                        backgroundImage: slider.content.imageUrl
                          ? `url(${slider.content.imageUrl})`
                          : undefined,
                        backgroundColor: slider.content.backgroundColor || '#f3f4f6',
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      {slider.content.overlay?.title && (
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p className="text-white font-bold text-lg drop-shadow-lg line-clamp-2">
                            {slider.content.overlay.title}
                          </p>
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            slider.is_active
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-500 text-white'
                          }`}
                        >
                          {slider.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>

                    {/* Información */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium">
                          Orden: <span className="text-gray-900">{slider.display_order}</span>
                        </span>
                        {slider.redirect_type && slider.redirect_type !== RedirectType.NONE && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded font-medium">
                            {slider.redirect_type}
                          </span>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => handleEdit(slider)}
                          className="flex-1 px-3 py-2 bg-black text-white rounded text-xs font-medium hover:bg-gray-800 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleActive(slider)}
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          {slider.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => handleDelete(slider.id)}
                          className="px-3 py-2 bg-red-50 text-red-700 rounded text-xs font-medium hover:bg-red-100 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </LocalLayout>
  );
}

// Componente de Card de Contexto
interface ContextCardProps {
  type: 'group' | 'branch';
  title: string;
  description: string;
  icon: React.ReactNode;
  stats: Array<{ label: string; value: string | number }>;
  onClick: () => void;
  isSelected: boolean;
}

function ContextCard({ type, title, description, icon, stats, onClick, isSelected }: ContextCardProps) {
  return (
    <button
      onClick={onClick}
      className={`relative bg-white rounded-xl border-2 p-6 text-left transition-all duration-200 hover:shadow-lg ${
        isSelected
          ? 'border-black shadow-md'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 p-3 rounded-lg ${
          isSelected ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'
        } transition-colors`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-lg font-bold ${
              isSelected ? 'text-black' : 'text-gray-900'
            }`}>
              {title}
            </h3>
            {isSelected && (
              <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            {description}
          </p>
          <div className="flex gap-4">
            {stats.map((stat, index) => (
              <div key={index} className="flex flex-col">
                <span className="text-xs text-gray-500">{stat.label}</span>
                <span className="text-base font-semibold text-gray-900">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {isSelected && (
        <div className="absolute top-4 right-4">
          <div className="w-3 h-3 bg-black rounded-full"></div>
        </div>
      )}
    </button>
  );
}
