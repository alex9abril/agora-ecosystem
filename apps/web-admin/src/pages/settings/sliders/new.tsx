/**
 * Crear slider en web-admin (global o por marca)
 */

import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  landingSlidersService,
  CreateLandingSliderData,
  RedirectType,
} from '@/lib/landing-sliders';
import SliderImageUpload from '@/components/SliderImageUpload';

export default function NewAdminSliderPage() {
  const router = useRouter();
  const { context, brand_id, brand_name } = router.query;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGlobal = context === 'global';
  const brandId = typeof brand_id === 'string' ? brand_id : '';
  const brandName = typeof brand_name === 'string' ? decodeURIComponent(brand_name) : '';

  const [formData, setFormData] = useState<CreateLandingSliderData>({
    content: { overlay: { position: 'left' } },
    redirect_type: RedirectType.NONE,
    display_order: 0,
    is_active: false,
  });

  useEffect(() => {
    if (context === 'brand' && brand_id) {
      setFormData((prev) => ({ ...prev, vehicle_brand_id: brandId }));
    }
  }, [context, brand_id, brandId]);

  const updateContent = (path: string, value: any) => {
    setFormData((prev) => {
      const newContent = { ...prev.content };
      const keys = path.split('.');
      let current: any = newContent;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return { ...prev, content: newContent };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: CreateLandingSliderData = {
        ...formData,
        business_group_id: undefined,
        business_id: undefined,
      };
      if (isGlobal) {
        payload.vehicle_brand_id = undefined;
      } else {
        payload.vehicle_brand_id = brandId;
      }
      await landingSlidersService.create(payload);
      router.push('/settings/sliders');
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const contextLabel = isGlobal ? 'Global' : `Marca: ${brandName}`;

  return (
    <>
      <Head>
        <title>Crear Slider - AGORA Admin</title>
      </Head>

      <AdminLayout>
        <div className="max-w-3xl mx-auto px-6 py-8">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <h1 className="text-xl font-normal text-gray-900 mb-2">Crear Slider</h1>
          <p className="text-sm text-gray-600 mb-6">Para: {contextLabel}</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contenido visual</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
                  <input
                    type="text"
                    value={formData.content?.overlay?.title || ''}
                    onChange={(e) => updateContent('overlay.title', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="Ej: Ofertas Especiales"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subtítulo</label>
                  <input
                    type="text"
                    value={formData.content?.overlay?.subtitle || ''}
                    onChange={(e) => updateContent('overlay.subtitle', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="Ej: Hasta 50% de descuento"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                  <textarea
                    value={formData.content?.overlay?.description || ''}
                    onChange={(e) => updateContent('overlay.description', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black"
                    rows={3}
                    placeholder="Descripción del slider"
                  />
                </div>

                <SliderImageUpload
                  value={formData.content?.imageUrl || ''}
                  onChange={(url) => updateContent('imageUrl', url)}
                  contextType={isGlobal ? 'global' : 'brand'}
                  contextId={isGlobal ? 'global' : brandId}
                  label="Imagen de fondo"
                  placeholder="URL o arrastra una imagen"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color de fondo</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Posición del contenido</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Texto del botón CTA</label>
                  <input
                    type="text"
                    value={formData.content?.overlay?.ctaText || ''}
                    onChange={(e) => updateContent('overlay.ctaText', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="Ej: Ver más"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Redirección</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                  <select
                    value={formData.redirect_type || RedirectType.NONE}
                    onChange={(e) => setFormData({ ...formData, redirect_type: e.target.value as RedirectType })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black"
                  >
                    <option value={RedirectType.NONE}>Sin redirección</option>
                    <option value={RedirectType.CATEGORY}>Categoría</option>
                    <option value={RedirectType.PROMOTION}>Promoción</option>
                    <option value={RedirectType.BRANCH}>Sucursal</option>
                    <option value={RedirectType.URL}>URL externa</option>
                  </select>
                </div>
                {formData.redirect_type === RedirectType.URL && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
                    <input
                      type="url"
                      value={formData.redirect_url || ''}
                      onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black"
                      placeholder="https://example.com"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Orden</label>
                  <input
                    type="number"
                    value={formData.display_order ?? 0}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value, 10) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black"
                    min={0}
                  />
                  <p className="mt-1 text-xs text-gray-500">Menor número = aparece primero</p>
                </div>
                <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active ?? false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    Publicar (visible en el landing). Si no se marca, queda como borrador.
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                onClick={() => router.back()}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar Slider'}
              </button>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
