/**
 * Gestión de Sliders del Landing en web-admin: global y por marca
 */

import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/layout/AdminLayout';
import { apiRequest } from '@/lib/api';
import {
  landingSlidersService,
  LandingSlider,
  RedirectType,
} from '@/lib/landing-sliders';

interface VehicleBrand {
  id: string;
  name: string;
  code: string;
  display_order: number;
  is_active: boolean;
}

type SliderContext = 'global' | { type: 'brand'; brand: VehicleBrand };

export default function AdminSlidersPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [sliders, setSliders] = useState<LandingSlider[]>([]);
  const [slidersLoading, setSlidersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<SliderContext | null>(null);
  const [globalCount, setGlobalCount] = useState(0);
  const [brandCounts, setBrandCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (selectedContext) {
      loadSliders();
    }
  }, [selectedContext]);

  useEffect(() => {
    loadGlobalCount();
    if (brands.length) loadBrandCounts();
  }, [brands]);

  const loadBrands = async () => {
    setLoadingBrands(true);
    try {
      const response = await apiRequest<VehicleBrand[]>('/catalog/vehicles/brands', { method: 'GET' });
      setBrands(Array.isArray(response) ? response : (response as any)?.data ?? []);
    } catch (e) {
      console.error('Error cargando marcas:', e);
      setBrands([]);
    } finally {
      setLoadingBrands(false);
    }
  };

  const loadSliders = async () => {
    if (!selectedContext) return;
    setSlidersLoading(true);
    setError(null);
    try {
      let response: ListLandingSlidersResponse | LandingSlider[];
      if (selectedContext === 'global') {
        response = await landingSlidersService.list({ only_global: true });
      } else {
        response = await landingSlidersService.list({
          vehicle_brand_id: selectedContext.brand.id,
        });
      }
      const items = Array.isArray(response) ? response : (response as { data: LandingSlider[] }).data;
      setSliders(items ?? []);
    } catch (e: any) {
      console.error('Error cargando sliders:', e);
      setError(e.message || 'Error al cargar sliders');
      setSliders([]);
    } finally {
      setSlidersLoading(false);
    }
  };

  const loadGlobalCount = async () => {
    try {
      const response = await landingSlidersService.list({ only_global: true, only_active: true });
      const items = Array.isArray(response) ? response : response.data;
      setGlobalCount(items?.length ?? 0);
    } catch {
      setGlobalCount(0);
    }
  };

  const loadBrandCounts = async () => {
    const counts: Record<string, number> = {};
    for (const brand of brands) {
      try {
        const response = await landingSlidersService.list({
          vehicle_brand_id: brand.id,
          only_active: true,
        });
        const items = Array.isArray(response) ? response : response.data;
        counts[brand.id] = items?.length ?? 0;
      } catch {
        counts[brand.id] = 0;
      }
    }
    setBrandCounts(counts);
  };

  const handleSelectContext = (ctx: SliderContext) => {
    setSelectedContext(ctx);
  };

  const handleCreate = () => {
    if (selectedContext === 'global') {
      router.push('/settings/sliders/new?context=global');
    } else if (selectedContext && selectedContext !== 'global') {
      router.push(`/settings/sliders/new?context=brand&brand_id=${selectedContext.brand.id}&brand_name=${encodeURIComponent(selectedContext.brand.name)}`);
    }
  };

  const handleEdit = (slider: LandingSlider) => {
    router.push(`/settings/sliders/${slider.id}/edit`);
  };

  const handleDelete = async (slider: LandingSlider) => {
    if (!confirm('¿Eliminar este slider?')) return;
    try {
      await landingSlidersService.delete(slider.id);
      setSliders((prev) => prev.filter((s) => s.id !== slider.id));
    } catch (e: any) {
      setError(e.message || 'Error al eliminar');
    }
  };

  const handleToggleActive = async (slider: LandingSlider) => {
    const newActive = !slider.is_active;
    setSliders((prev) =>
      prev.map((s) => (s.id === slider.id ? { ...s, is_active: newActive } : s))
    );
    try {
      await landingSlidersService.update(slider.id, { is_active: newActive });
    } catch (e: any) {
      setSliders((prev) =>
        prev.map((s) => (s.id === slider.id ? { ...s, is_active: slider.is_active } : s))
      );
      setError(e.message || 'Error al actualizar');
    }
  };

  const contextLabel =
    selectedContext === 'global'
      ? 'Global'
      : selectedContext && selectedContext !== 'global'
      ? `Marca: ${selectedContext.brand.name}`
      : '';

  return (
    <>
      <Head>
        <title>Sliders Landing - AGORA Admin</title>
      </Head>

      <AdminLayout>
        <div className="flex h-full bg-gray-50">
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-6 py-8">
              <h1 className="text-xl font-normal text-gray-900 mb-2">Gestión de Sliders</h1>
              <p className="text-sm text-gray-600 mb-6">
                Administra los sliders del landing: global (todas las tiendas) o por marca de vehículo.
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  {error}
                </div>
              )}

              {!selectedContext ? (
                <div className="space-y-4">
                  <h2 className="text-sm font-medium text-gray-900">Selecciona el contexto</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div
                      onClick={() => handleSelectContext('global')}
                      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900">Global</p>
                        <p className="text-xs text-gray-500 mt-1">Sliders para todo el sitio</p>
                        <p className="text-xs text-gray-600 mt-2">Sliders: {globalCount}</p>
                      </div>
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9a9 9 0 019-9m-9 9a9 9 0 019 9" />
                      </svg>
                    </div>

                    {loadingBrands ? (
                      <div className="col-span-2 flex items-center justify-center py-8 text-gray-500 text-sm">
                        Cargando marcas...
                      </div>
                    ) : (
                      brands.map((brand) => (
                        <div
                          key={brand.id}
                          onClick={() => handleSelectContext({ type: 'brand', brand })}
                          className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{brand.name}</p>
                            <p className="text-xs text-gray-500 mt-1">Sliders por marca</p>
                            <p className="text-xs text-gray-600 mt-2">Sliders: {brandCounts[brand.id] ?? 0}</p>
                          </div>
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => {
                          setSelectedContext(null);
                          setSliders([]);
                        }}
                        className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Volver a selección
                      </button>
                      <span className="text-sm text-gray-600">{contextLabel}</span>
                    </div>
                    <button
                      onClick={handleCreate}
                      className="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Crear Slider
                    </button>
                  </div>

                  {slidersLoading ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                      <p className="mt-4 text-gray-500 text-sm">Cargando sliders...</p>
                    </div>
                  ) : sliders.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                      <p className="text-gray-600 mb-6">No hay sliders en este contexto.</p>
                      <button
                        onClick={handleCreate}
                        className="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800"
                      >
                        Crear primer slider
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {sliders.map((slider) => (
                        <div
                          key={slider.id}
                          className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all"
                        >
                          <div
                            className="h-48 bg-cover bg-center relative"
                            style={{
                              backgroundImage: slider.content?.imageUrl ? `url(${slider.content.imageUrl})` : undefined,
                              backgroundColor: slider.content?.backgroundColor || '#f3f4f6',
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            {slider.content?.overlay?.title && (
                              <div className="absolute bottom-0 left-0 right-0 p-4">
                                <p className="text-white font-bold text-lg drop-shadow-lg line-clamp-2">
                                  {slider.content.overlay.title}
                                </p>
                              </div>
                            )}
                            <div className="absolute top-3 right-3">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                  slider.is_active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                                }`}
                              >
                                {slider.is_active ? 'Publicado' : 'Borrador'}
                              </span>
                            </div>
                          </div>
                          <div className="p-4 space-y-3">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Orden: {slider.display_order}</span>
                              {slider.redirect_type && slider.redirect_type !== RedirectType.NONE && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded font-medium">
                                  {slider.redirect_type}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-gray-100">
                              <button
                                onClick={() => handleEdit(slider)}
                                className="flex-1 px-3 py-2 bg-black text-white rounded text-xs font-medium hover:bg-gray-800"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleToggleActive(slider)}
                                className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200"
                              >
                                {slider.is_active ? 'Despublicar' : 'Publicar'}
                              </button>
                              <button
                                onClick={() => handleDelete(slider)}
                                className="px-3 py-2 bg-red-50 text-red-700 rounded text-xs font-medium hover:bg-red-100"
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
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
