'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  landingSlidersService,
  LandingSlider,
  RedirectType,
} from '@/lib/landing-sliders';
import { SkeletonCardList } from '@/components/ui/Skeleton';
import CreateSliderForm from './CreateSliderForm';
import EditSliderForm from './EditSliderForm';

export interface LandingSlidersPanelProps {
  contextType: 'group' | 'branch';
  businessGroupId?: string;
  businessId?: string;
  contextName: string;
  /** Si true, el formulario de crear se muestra dentro del panel (ej. en Tiendas). Si false, se redirige a /sliders/new */
  embedCreate?: boolean;
}

export default function LandingSlidersPanel({
  contextType,
  businessGroupId,
  businessId,
  contextName,
  embedCreate = false,
}: LandingSlidersPanelProps) {
  const router = useRouter();
  const [sliders, setSliders] = useState<LandingSlider[]>([]);
  const [slidersLoading, setSlidersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSlider, setEditingSlider] = useState<LandingSlider | null>(null);

  const hasContext =
    (contextType === 'group' && businessGroupId) || (contextType === 'branch' && businessId);

  const loadSliders = useCallback(async () => {
    if (!hasContext) return;
    try {
      setSlidersLoading(true);
      setError(null);
      const filters: { business_group_id?: string; business_id?: string } = {};
      if (contextType === 'group' && businessGroupId) filters.business_group_id = businessGroupId;
      if (contextType === 'branch' && businessId) filters.business_id = businessId;
      const response = await landingSlidersService.list(filters);
      const items = Array.isArray(response) ? response : response.data;
      setSliders(items || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar sliders');
    } finally {
      setSlidersLoading(false);
    }
  }, [contextType, businessGroupId, businessId, hasContext]);

  useEffect(() => {
    if (!hasContext) {
      setSlidersLoading(false);
      return;
    }
    loadSliders();
  }, [hasContext, loadSliders]);

  const handleCreate = () => {
    if (embedCreate) {
      setShowCreateForm(true);
      return;
    }
    const params = new URLSearchParams();
    if (contextType === 'group' && businessGroupId) {
      params.append('context', 'group');
      params.append('group_id', businessGroupId);
    } else if (contextType === 'branch' && businessId) {
      params.append('context', 'branch');
      params.append('branch_id', businessId);
    }
    router.push(`/sliders/new?${params.toString()}`);
  };

  const handleEdit = (slider: LandingSlider) => {
    if (embedCreate) {
      setEditingSlider(slider);
      return;
    }
    router.push(`/sliders/${slider.id}/edit`);
  };

  const handleDelete = async (slider: LandingSlider) => {
    if (!confirm('¿Estás seguro de eliminar este slider?')) return;
    try {
      await landingSlidersService.delete(slider.id);
      setSliders((prev) => prev.filter((s) => s.id !== slider.id));
    } catch (err: any) {
      setError(err.message || 'Error al eliminar slider');
    }
  };

  const handleToggleActive = async (slider: LandingSlider) => {
    setSliders((prev) =>
      prev.map((s) => (s.id === slider.id ? { ...s, is_active: !slider.is_active } : s))
    );
    try {
      await landingSlidersService.update(slider.id, { is_active: !slider.is_active });
    } catch (err: any) {
      setSliders((prev) =>
        prev.map((s) => (s.id === slider.id ? { ...s, is_active: slider.is_active } : s))
      );
      setError('Error al actualizar estado');
    }
  };

  if (!hasContext) {
    return (
      <div className="text-sm text-gray-500 dark:text-neutral-400 pt-4">
        No hay contexto configurado para sliders.
      </div>
    );
  }

  if (editingSlider && embedCreate) {
    return (
      <div className="space-y-4 pt-4">
        <EditSliderForm
          slider={editingSlider}
          contextType={contextType}
          businessGroupId={businessGroupId}
          businessId={businessId}
          contextName={contextName}
          onSuccess={() => {
            setEditingSlider(null);
            loadSliders();
          }}
          onCancel={() => setEditingSlider(null)}
        />
      </div>
    );
  }

  if (showCreateForm && embedCreate) {
    return (
      <div className="space-y-4 pt-4">
        <CreateSliderForm
          contextType={contextType}
          businessGroupId={businessGroupId}
          businessId={businessId}
          contextName={contextName}
          onSuccess={() => {
            setShowCreateForm(false);
            loadSliders();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-neutral-400">
          {contextType === 'group' ? 'Grupo' : 'Sucursal'}: <strong>{contextName}</strong>
        </p>
        <button
          type="button"
          onClick={handleCreate}
          className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Crear Slider
        </button>
      </div>

      {slidersLoading ? (
        <SkeletonCardList count={6} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />
      ) : sliders.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No hay sliders configurados
          </h3>
          <p className="text-sm text-gray-600 dark:text-neutral-400 mb-6">
            Crea tu primer slider para mostrar en el landing de esta {contextType === 'group' ? 'grupo' : 'sucursal'}
          </p>
          <button
            type="button"
            onClick={handleCreate}
            className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Crear primer slider
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sliders.map((slider) => (
            <div
              key={slider.id}
              className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200"
            >
              <div
                className="h-48 bg-cover bg-center relative"
                style={{
                  backgroundImage: slider.content.imageUrl
                    ? `url(${slider.content.imageUrl})`
                    : undefined,
                  backgroundColor: slider.content.backgroundColor || '#f3f4f6',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
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
                      slider.is_active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                    }`}
                  >
                    {slider.is_active ? 'Publicado' : 'Borrador'}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    Orden: <span className="text-gray-900 dark:text-gray-100">{slider.display_order}</span>
                  </span>
                  {slider.redirect_type && slider.redirect_type !== RedirectType.NONE && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 rounded font-medium">
                      {slider.redirect_type}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-neutral-700">
                  <button
                    type="button"
                    onClick={() => handleEdit(slider)}
                    className="flex-1 px-3 py-2 bg-black dark:bg-white text-white dark:text-black rounded text-xs font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(slider)}
                    className="px-3 py-2 bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 rounded text-xs font-medium hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
                  >
                    {slider.is_active ? 'Despublicar' : 'Publicar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(slider)}
                    className="px-3 py-2 bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
