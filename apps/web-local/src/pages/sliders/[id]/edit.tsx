/**
 * Página para editar un slider existente
 */

import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import {
  landingSlidersService,
  LandingSlider,
  UpdateLandingSliderData,
  RedirectType,
} from '@/lib/landing-sliders';
import SliderImageUpload from '@/components/SliderImageUpload';

export default function EditSliderPage() {
  const router = useRouter();
  const { id } = router.query;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slider, setSlider] = useState<LandingSlider | null>(null);

  const [formData, setFormData] = useState<UpdateLandingSliderData>({
    content: {
      overlay: {
        position: 'left',
      },
    },
    redirect_type: RedirectType.NONE,
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    if (id) {
      loadSlider();
    }
  }, [id]);

  const loadSlider = async () => {
    try {
      setLoading(true);
      const data = await landingSlidersService.getById(id as string);
      setSlider(data);
      setFormData({
        business_group_id: data.business_group_id || undefined,
        business_id: data.business_id || undefined,
        content: data.content,
        redirect_type: data.redirect_type || RedirectType.NONE,
        redirect_target_id: data.redirect_target_id || undefined,
        redirect_url: data.redirect_url || undefined,
        display_order: data.display_order,
        is_active: data.is_active,
        start_date: data.start_date || undefined,
        end_date: data.end_date || undefined,
      });
    } catch (error: any) {
      console.error('Error cargando slider:', error);
      setError('Error al cargar el slider');
    } finally {
      setLoading(false);
    }
  };

  const updateContent = (path: string, value: any) => {
    setFormData((prev) => {
      const newContent = { ...(prev.content || {}) };
      const keys = path.split('.');
      let current: any = newContent;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;

      return { ...prev, content: newContent };
    });
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      setSaving(true);
      setError(null);
      await landingSlidersService.update(id as string, formData);
      router.push('/sliders');
    } catch (error: any) {
      console.error('Error guardando slider:', error);
      setError(error.message || 'Error al guardar slider');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <LocalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Cargando...</div>
        </div>
      </LocalLayout>
    );
  }

  if (!slider) {
    return (
      <LocalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Slider no encontrado</div>
        </div>
      </LocalLayout>
    );
  }

  return (
    <LocalLayout>
      <Head>
        <title>Editar Slider - LOCALIA</title>
      </Head>

      <div className="p-6 w-full">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Editar Slider</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Formulario - Mismo que new.tsx */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {/* Sección: Contenido Visual */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contenido Visual</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título Principal
                </label>
                <input
                  type="text"
                  value={formData.content?.overlay?.title || ''}
                  onChange={(e) => updateContent('overlay.title', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="Ej: Ofertas Especiales"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subtítulo
                </label>
                <input
                  type="text"
                  value={formData.content?.overlay?.subtitle || ''}
                  onChange={(e) => updateContent('overlay.subtitle', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="Ej: Hasta 50% de descuento"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.content?.overlay?.description || ''}
                  onChange={(e) => updateContent('overlay.description', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black"
                  rows={3}
                  placeholder="Descripción detallada del slider"
                />
              </div>

              {slider && (
                <SliderImageUpload
                  value={formData.content?.imageUrl || ''}
                  onChange={(url) => updateContent('imageUrl', url)}
                  contextType={slider.business_group_id ? 'group' : 'branch'}
                  contextId={(slider.business_group_id || slider.business_id) as string}
                  label="Imagen de Fondo"
                  placeholder="https://example.com/image.jpg o arrastra una imagen aquí"
                />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color de Fondo
                </label>
                <div className="flex gap-4">
                  <input
                    type="color"
                    value={formData.content?.backgroundColor || '#f3f4f6'}
                    onChange={(e) => updateContent('backgroundColor', e.target.value)}
                    className="h-12 w-24 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.content?.backgroundColor || '#f3f4f6'}
                    onChange={(e) => updateContent('backgroundColor', e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="#f3f4f6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posición del Contenido
                </label>
                <select
                  value={formData.content?.overlay?.position || 'left'}
                  onChange={(e) => updateContent('overlay.position', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black"
                >
                  <option value="left">Izquierda</option>
                  <option value="center">Centro</option>
                  <option value="right">Derecha</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Texto del Botón CTA
                </label>
                <input
                  type="text"
                  value={formData.content?.overlay?.ctaText || ''}
                  onChange={(e) => updateContent('overlay.ctaText', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="Ej: Ver más, Comprar ahora, Explorar"
                />
              </div>
            </div>
          </div>

          {/* Sección: Redirección */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración de Redirección</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Redirección
                </label>
                <select
                  value={formData.redirect_type || RedirectType.NONE}
                  onChange={(e) =>
                    setFormData({ ...formData, redirect_type: e.target.value as RedirectType })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black"
                >
                  <option value={RedirectType.NONE}>Sin redirección</option>
                  <option value={RedirectType.CATEGORY}>Categoría</option>
                  <option value={RedirectType.PROMOTION}>Promoción</option>
                  <option value={RedirectType.BRANCH}>Sucursal</option>
                  <option value={RedirectType.URL}>URL Externa</option>
                </select>
              </div>

              {formData.redirect_type === RedirectType.URL && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL de Redirección
                  </label>
                  <input
                    type="url"
                    value={formData.redirect_url || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, redirect_url: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="https://example.com"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sección: Configuración */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Orden de Visualización
                </label>
                <input
                  type="number"
                  value={formData.display_order || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, display_order: parseInt(e.target.value, 10) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black"
                  min="0"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active ?? true}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-3 block text-sm text-gray-700">
                  Slider activo
                </label>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              onClick={() => router.back()}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </LocalLayout>
  );
}

