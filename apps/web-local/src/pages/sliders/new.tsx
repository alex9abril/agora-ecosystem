/**
 * Página para crear un nuevo slider
 */

import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import {
  landingSlidersService,
  CreateLandingSliderData,
  RedirectType,
} from '@/lib/landing-sliders';
import { businessService } from '@/lib/business';
import SliderImageUpload from '@/components/SliderImageUpload';

export default function NewSliderPage() {
  const router = useRouter();
  const { context, group_id, branch_id } = router.query;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [contextInfo, setContextInfo] = useState<{ type: string; name: string } | null>(null);

  const [formData, setFormData] = useState<CreateLandingSliderData>({
    content: {
      overlay: {
        position: 'left',
      },
    },
    redirect_type: RedirectType.NONE,
    display_order: 0,
    // Los sliders nuevos inician como borrador
    is_active: false,
  });

  useEffect(() => {
    loadContextInfo();
  }, [context, group_id, branch_id]);

  const loadContextInfo = async () => {
    try {
      if (context === 'group' && group_id) {
        const group = await businessService.getMyBusinessGroup();
        if (group) {
          setContextInfo({ type: 'Grupo', name: group.name });
          formData.business_group_id = group.id;
        }
      } else if (context === 'branch' && branch_id) {
        const branch = await businessService.getMyBusiness(branch_id as string);
        if (branch) {
          setContextInfo({ type: 'Sucursal', name: branch.name });
          formData.business_id = branch.id;
        }
      }
    } catch (error) {
      console.error('Error cargando contexto:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateContent = (path: string, value: any) => {
    setFormData((prev) => {
      const newContent = { ...prev.content };
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
    try {
      setSaving(true);
      setError(null);

      // Asegurar que el contexto esté en formData
      if (context === 'group' && group_id) {
        formData.business_group_id = group_id as string;
        formData.business_id = undefined;
      } else if (context === 'branch' && branch_id) {
        formData.business_id = branch_id as string;
        formData.business_group_id = undefined;
      }

      await landingSlidersService.create(formData);
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

  return (
    <LocalLayout>
      <Head>
        <title>Crear Slider - LOCALIA</title>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear Nuevo Slider</h1>
          {contextInfo && (
            <p className="text-gray-600">
              Para: <span className="font-medium">{contextInfo.type} - {contextInfo.name}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Formulario */}
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

              <SliderImageUpload
                value={formData.content?.imageUrl || ''}
                onChange={(url) => updateContent('imageUrl', url)}
                contextType={context === 'group' ? 'group' : 'branch'}
                contextId={(context === 'group' ? group_id : branch_id) as string}
                label="Imagen de Fondo"
                placeholder="https://example.com/image.jpg o arrastra una imagen aquí"
              />

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
                <p className="mt-1 text-xs text-gray-500">
                  Los sliders con menor número aparecen primero
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active ?? false}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                />
                <div className="text-sm text-gray-700">
                  <label htmlFor="is_active" className="font-medium block text-gray-900">
                    Publicar en la sucursal
                  </label>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Los sliders se guardan como borrador por defecto y no se muestran en la sucursal. Marca esta casilla para publicarlo.
                  </p>
                </div>
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
              {saving ? 'Guardando...' : 'Guardar Slider'}
            </button>
          </div>
        </div>
      </div>
    </LocalLayout>
  );
}

