'use client';

import { useState } from 'react';
import {
  landingSlidersService,
  LandingSlider,
  UpdateLandingSliderData,
  RedirectType,
} from '@/lib/landing-sliders';
import SliderImageUpload from '@/components/SliderImageUpload';

export interface EditSliderFormProps {
  slider: LandingSlider;
  contextType: 'group' | 'branch';
  businessGroupId?: string;
  businessId?: string;
  contextName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EditSliderForm({
  slider,
  contextType,
  businessGroupId,
  businessId,
  contextName,
  onSuccess,
  onCancel,
}: EditSliderFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UpdateLandingSliderData>({
    content: slider.content ?? { overlay: { position: 'left' } },
    redirect_type: slider.redirect_type ?? RedirectType.NONE,
    redirect_target_id: slider.redirect_target_id ?? undefined,
    redirect_url: slider.redirect_url ?? undefined,
    display_order: slider.display_order ?? 0,
    is_active: slider.is_active ?? false,
  });

  const contextId = contextType === 'group' ? businessGroupId : businessId;

  const updateContent = (path: string, value: any) => {
    setFormData((prev) => {
      const newContent = prev.content ? { ...prev.content } : {};
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
    try {
      setSaving(true);
      setError(null);
      const payload: UpdateLandingSliderData = {
        ...formData,
        business_group_id: contextType === 'group' ? businessGroupId : undefined,
        business_id: contextType === 'branch' ? businessId : undefined,
      };
      await landingSlidersService.update(slider.id, payload);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al guardar slider');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Editar slider</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          Cancelar
        </button>
      </div>
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
          <input
            type="text"
            value={formData.content?.overlay?.title || ''}
            onChange={(e) => updateContent('overlay.title', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100"
            placeholder="Ej: Ofertas Especiales"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtítulo</label>
          <input
            type="text"
            value={formData.content?.overlay?.subtitle || ''}
            onChange={(e) => updateContent('overlay.subtitle', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100"
            placeholder="Ej: Hasta 50% de descuento"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imagen de fondo</label>
          <SliderImageUpload
            value={formData.content?.imageUrl || ''}
            onChange={(url) => updateContent('imageUrl', url)}
            contextType={contextType}
            contextId={contextId || ''}
            label=""
            placeholder="URL o arrastra una imagen"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color de fondo</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={formData.content?.backgroundColor || '#f3f4f6'}
              onChange={(e) => updateContent('backgroundColor', e.target.value)}
              className="h-10 w-14 border border-gray-300 dark:border-neutral-600 rounded cursor-pointer"
            />
            <input
              type="text"
              value={formData.content?.backgroundColor || '#f3f4f6'}
              onChange={(e) => updateContent('backgroundColor', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Texto del botón CTA</label>
          <input
            type="text"
            value={formData.content?.overlay?.ctaText || ''}
            onChange={(e) => updateContent('overlay.ctaText', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100"
            placeholder="Ej: Ver más"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de redirección</label>
          <select
            value={formData.redirect_type || RedirectType.NONE}
            onChange={(e) => setFormData({ ...formData, redirect_type: e.target.value as RedirectType })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
            <input
              type="url"
              value={formData.redirect_url || ''}
              onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100"
              placeholder="https://..."
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Orden</label>
          <input
            type="number"
            value={formData.display_order ?? 0}
            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value, 10) || 0 })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100"
            min={0}
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="edit-slider-active"
            checked={formData.is_active ?? false}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 dark:border-neutral-600 text-black dark:text-white focus:ring-black"
          />
          <label htmlFor="edit-slider-active" className="text-sm text-gray-700 dark:text-gray-300">
            Publicar (visible en el landing)
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-neutral-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-neutral-600"
          disabled={saving}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
