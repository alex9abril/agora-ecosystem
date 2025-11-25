import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTaxTypes,
  createTaxType,
  updateTaxType,
  deleteTaxType,
  type TaxType,
  type CreateTaxTypeDto,
  type UpdateTaxTypeDto,
} from '@/lib/taxes';

export default function TaxesManager() {
  const { token } = useAuth();
  const [taxTypes, setTaxTypes] = useState<TaxType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxType | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [formData, setFormData] = useState<CreateTaxTypeDto>({
    name: '',
    description: '',
    code: '',
    rate: 0.16,
    rate_type: 'percentage',
    fixed_amount: undefined,
    applies_to_subtotal: true,
    applies_to_delivery: false,
    applies_to_tip: false,
    is_default: false,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar tipos de impuestos
  useEffect(() => {
    const loadTaxTypes = async () => {
      if (!token) return;

      setLoading(true);
      try {
        const data = await getTaxTypes(includeInactive);
        setTaxTypes(data);
      } catch (error) {
        console.error('Error cargando tipos de impuestos:', error);
        alert('Error al cargar los tipos de impuestos');
      } finally {
        setLoading(false);
      }
    };

    loadTaxTypes();
  }, [token, includeInactive]);

  // Validar formulario
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (formData.rate_type === 'percentage') {
      if (formData.rate < 0 || formData.rate > 1) {
        newErrors.rate = 'El porcentaje debe estar entre 0 y 1 (ej: 0.16 = 16%)';
      }
    } else {
      if (!formData.fixed_amount || formData.fixed_amount < 0) {
        newErrors.fixed_amount = 'El monto fijo debe ser mayor o igual a 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      code: '',
      rate: 0.16,
      rate_type: 'percentage',
      fixed_amount: undefined,
      applies_to_subtotal: true,
      applies_to_delivery: false,
      applies_to_tip: false,
      is_default: false,
      is_active: true,
    });
    setEditingTax(null);
    setShowForm(false);
    setErrors({});
  };

  // Abrir formulario para editar
  const handleEdit = (tax: TaxType) => {
    setEditingTax(tax);
    setFormData({
      name: tax.name,
      description: tax.description || '',
      code: tax.code || '',
      rate: tax.rate,
      rate_type: tax.rate_type,
      fixed_amount: tax.fixed_amount,
      applies_to_subtotal: tax.applies_to_subtotal,
      applies_to_delivery: tax.applies_to_delivery,
      applies_to_tip: tax.applies_to_tip,
      is_default: tax.is_default,
      is_active: tax.is_active,
    });
    setShowForm(true);
    setErrors({});
  };

  // Guardar (crear o actualizar)
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      if (editingTax) {
        const updateData: UpdateTaxTypeDto = { ...formData };
        await updateTaxType(editingTax.id, updateData);
        alert('✅ Impuesto actualizado exitosamente');
      } else {
        await createTaxType(formData);
        alert('✅ Impuesto creado exitosamente');
      }

      // Recargar lista
      const data = await getTaxTypes(includeInactive);
      setTaxTypes(data);
      resetForm();
    } catch (error: any) {
      console.error('Error guardando impuesto:', error);
      alert(error.message || 'Error al guardar el impuesto');
    } finally {
      setSaving(false);
    }
  };

  // Desactivar impuesto
  const handleDelete = async (tax: TaxType) => {
    if (!confirm(`¿Estás seguro de desactivar el impuesto "${tax.name}"?`)) {
      return;
    }

    try {
      await deleteTaxType(tax.id);
      alert('✅ Impuesto desactivado exitosamente');
      
      // Recargar lista
      const data = await getTaxTypes(includeInactive);
      setTaxTypes(data);
    } catch (error: any) {
      console.error('Error desactivando impuesto:', error);
      alert(error.message || 'Error al desactivar el impuesto');
    }
  };

  // Formatear porcentaje
  const formatRate = (rate: number, rateType: string): string => {
    if (rateType === 'percentage') {
      return `${(rate * 100).toFixed(2)}%`;
    }
    return `$${rate.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-xs text-gray-500">Cargando impuestos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con acciones */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-normal text-gray-900">Tipos de Impuestos</h2>
          <p className="text-xs text-gray-500 mt-1">
            Gestiona los tipos de impuestos disponibles para productos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            Mostrar inactivos
          </label>
          {!showForm && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="text-xs px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              + Nuevo Impuesto
            </button>
          )}
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-xs font-medium text-gray-900">
              {editingTax ? 'Editar Impuesto' : 'Nuevo Impuesto'}
            </h3>
          </div>

          <div className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full text-xs border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Ej: IVA, Impuesto Local CDMX"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full text-xs border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={2}
                placeholder="Descripción del impuesto"
              />
            </div>

            {/* Código */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Código Fiscal
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full text-xs border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: IVA, ISR, IEPS"
              />
            </div>

            {/* Tipo de cálculo */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tipo de Cálculo <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.rate_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    rate_type: e.target.value as 'percentage' | 'fixed',
                  })
                }
                className="w-full text-xs border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="percentage">Porcentaje</option>
                <option value="fixed">Monto Fijo</option>
              </select>
            </div>

            {/* Tasa o monto fijo */}
            {formData.rate_type === 'percentage' ? (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Porcentaje <span className="text-red-500">*</span>
                  <span className="text-gray-500 ml-2">(0.16 = 16%)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={formData.rate}
                  onChange={(e) =>
                    setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })
                  }
                  className={`w-full text-xs border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.rate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.16"
                />
                {errors.rate && (
                  <p className="mt-1 text-xs text-red-600">{errors.rate}</p>
                )}
                {formData.rate > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    Equivale a: {(formData.rate * 100).toFixed(2)}%
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Monto Fijo <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.fixed_amount || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fixed_amount: parseFloat(e.target.value) || undefined,
                    })
                  }
                  className={`w-full text-xs border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.fixed_amount ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.fixed_amount && (
                  <p className="mt-1 text-xs text-red-600">{errors.fixed_amount}</p>
                )}
              </div>
            )}

            {/* Aplicación */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Se aplica a:
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.applies_to_subtotal}
                    onChange={(e) =>
                      setFormData({ ...formData, applies_to_subtotal: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  Subtotal de productos
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.applies_to_delivery}
                    onChange={(e) =>
                      setFormData({ ...formData, applies_to_delivery: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  Costo de envío
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.applies_to_tip}
                    onChange={(e) =>
                      setFormData({ ...formData, applies_to_tip: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  Propina
                </label>
              </div>
            </div>

            {/* Opciones adicionales */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) =>
                    setFormData({ ...formData, is_default: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                Impuesto por defecto (se asigna automáticamente a nuevos productos)
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                Activo
              </label>
            </div>

            {/* Botones */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={resetForm}
                className="text-xs px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Guardando...' : editingTax ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de impuestos */}
      {taxTypes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-xs text-gray-500 mb-4">No hay tipos de impuestos registrados</p>
          {!showForm && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="text-xs px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Crear Primer Impuesto
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Código</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Tasa</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Aplicación</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Estado</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {taxTypes.map((tax) => (
                <tr key={tax.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{tax.name}</p>
                      {tax.description && (
                        <p className="text-gray-500 text-xs mt-0.5">{tax.description}</p>
                      )}
                      {tax.is_default && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800 mt-1">
                          Por Defecto
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-900">{tax.code || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <p className="text-gray-900 font-medium">
                      {formatRate(tax.rate_type === 'percentage' ? tax.rate : (tax.fixed_amount || 0), tax.rate_type)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col gap-1 items-center">
                      {tax.applies_to_subtotal && (
                        <span className="text-xs text-gray-600">Subtotal</span>
                      )}
                      {tax.applies_to_delivery && (
                        <span className="text-xs text-gray-600">Envío</span>
                      )}
                      {tax.applies_to_tip && (
                        <span className="text-xs text-gray-600">Propina</span>
                      )}
                      {!tax.applies_to_subtotal && !tax.applies_to_delivery && !tax.applies_to_tip && (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        tax.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {tax.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(tax)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs"
                        title="Editar"
                      >
                        Editar
                      </button>
                      {tax.is_active && (
                        <button
                          onClick={() => handleDelete(tax)}
                          className="text-red-600 hover:text-red-800 text-xs"
                          title="Desactivar"
                        >
                          Desactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

