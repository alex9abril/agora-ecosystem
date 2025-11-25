import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getProductTypes,
  getAvailableFields,
  getFieldConfigByProductType,
  bulkUpdateFieldConfig,
  type ProductType,
  type AvailableField,
  type FieldConfig,
  type BulkUpdateFieldConfig,
} from '@/lib/product-type-field-config';

export default function ProductTypeFieldConfigManager() {
  const { token } = useAuth();
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [availableFields, setAvailableFields] = useState<AvailableField[]>([]);
  const [selectedProductType, setSelectedProductType] = useState<string>('');
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Cargar tipos de producto y campos disponibles
  useEffect(() => {
    const loadInitialData = async () => {
      if (!token) return;

      setLoading(true);
      try {
        const [types, fields] = await Promise.all([
          getProductTypes(),
          getAvailableFields(),
        ]);

        setProductTypes(types);
        setAvailableFields(fields);

        // Seleccionar el primer tipo por defecto
        if (types.length > 0 && !selectedProductType) {
          setSelectedProductType(types[0].value);
        }
      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [token]);

  // Cargar configuración cuando se selecciona un tipo de producto
  useEffect(() => {
    const loadFieldConfig = async () => {
      if (!token || !selectedProductType) return;

      setLoading(true);
      try {
        const configs = await getFieldConfigByProductType(selectedProductType);
        setFieldConfigs(configs);
        setHasChanges(false);
      } catch (error) {
        console.error('Error cargando configuración de campos:', error);
        setFieldConfigs([]);
      } finally {
        setLoading(false);
      }
    };

    loadFieldConfig();
  }, [token, selectedProductType]);

  // Inicializar campos que no tienen configuración
  const initializeMissingFields = () => {
    const existingFieldNames = new Set(fieldConfigs.map(fc => fc.fieldName));
    const missingFields = availableFields.filter(
      field => !existingFieldNames.has(field.value)
    );

    const newConfigs: FieldConfig[] = missingFields.map((field, index) => ({
      id: `temp-${field.value}`,
      productType: selectedProductType,
      fieldName: field.value,
      isVisible: false,
      isRequired: false,
      displayOrder: fieldConfigs.length + index,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    setFieldConfigs([...fieldConfigs, ...newConfigs]);
    setHasChanges(true);
  };

  // Actualizar configuración de un campo
  const updateFieldConfig = (
    fieldName: string,
    updates: Partial<Pick<FieldConfig, 'isVisible' | 'isRequired' | 'displayOrder'>>
  ) => {
    setFieldConfigs(prevConfigs =>
      prevConfigs.map(config =>
        config.fieldName === fieldName
          ? { ...config, ...updates }
          : config
      )
    );
    setHasChanges(true);
  };

  // Guardar cambios
  const handleSave = async () => {
    if (!token || !selectedProductType) return;

    setSaving(true);
    try {
      const bulkConfigs: BulkUpdateFieldConfig[] = fieldConfigs.map(config => ({
        field_name: config.fieldName,
        is_visible: config.isVisible,
        is_required: config.isRequired,
        display_order: config.displayOrder,
      }));

      await bulkUpdateFieldConfig(selectedProductType, bulkConfigs);

      // Recargar configuración actualizada
      const updatedConfigs = await getFieldConfigByProductType(selectedProductType);
      setFieldConfigs(updatedConfigs);
      setHasChanges(false);

      alert('✅ Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error guardando configuración:', error);
      alert('❌ Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  // Ordenar campos por displayOrder
  const sortedFieldConfigs = [...fieldConfigs].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  // Obtener etiqueta de campo
  const getFieldLabel = (fieldName: string): string => {
    return availableFields.find(f => f.value === fieldName)?.label || fieldName;
  };

  // Obtener etiqueta de tipo de producto
  const getProductTypeLabel = (value: string): string => {
    return productTypes.find(t => t.value === value)?.label || value;
  };

  // Seleccionar/deseleccionar todos los campos visibles
  const toggleAllVisible = (selectAll: boolean) => {
    setFieldConfigs(prevConfigs =>
      prevConfigs.map(config => ({
        ...config,
        isVisible: selectAll,
        // Si se deselecciona visible, también deseleccionar requerido
        isRequired: selectAll ? config.isRequired : false,
      }))
    );
    setHasChanges(true);
  };

  // Seleccionar/deseleccionar todos los campos requeridos (solo los visibles)
  const toggleAllRequired = (selectAll: boolean) => {
    setFieldConfigs(prevConfigs =>
      prevConfigs.map(config => ({
        ...config,
        isRequired: config.isVisible ? selectAll : false,
      }))
    );
    setHasChanges(true);
  };

  // Verificar si todos los campos visibles están seleccionados
  const areAllVisible = sortedFieldConfigs.length > 0 && sortedFieldConfigs.every(c => c.isVisible);
  const areAllRequired = sortedFieldConfigs.length > 0 && sortedFieldConfigs.filter(c => c.isVisible).every(c => c.isRequired);

  if (loading && !selectedProductType) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-xs text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector de tipo de producto */}
      <div className="flex items-center gap-4">
        <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
          Tipo de Producto:
        </label>
        <select
          value={selectedProductType}
          onChange={(e) => {
            if (hasChanges) {
              if (!confirm('¿Deseas descartar los cambios sin guardar?')) {
                return;
              }
            }
            setSelectedProductType(e.target.value);
            setHasChanges(false);
          }}
          className="flex-1 max-w-xs text-xs border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {productTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <button
          onClick={initializeMissingFields}
          className="text-xs px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          Agregar Campos Faltantes
        </button>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        )}
      </div>

      {/* Información del tipo seleccionado */}
      {selectedProductType && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3">
          <p className="text-xs text-indigo-900">
            <span className="font-medium">Configurando:</span>{' '}
            {getProductTypeLabel(selectedProductType)}
          </p>
          <p className="text-xs text-indigo-700 mt-1">
            Esta configuración define qué campos se mostrarán y cuáles serán requeridos
            en el formulario de captura de productos para este tipo.
          </p>
        </div>
      )}

      {/* Tabla de configuración */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-xs text-gray-500">Cargando configuración...</p>
        </div>
      ) : sortedFieldConfigs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xs text-gray-500 mb-4">
            No hay campos configurados para este tipo de producto.
          </p>
          <button
            onClick={initializeMissingFields}
            className="text-xs px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Inicializar Campos
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Campo</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">
                  <div className="flex flex-col items-center gap-1">
                    <span>Visible</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => toggleAllVisible(true)}
                        className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                        title="Seleccionar todos"
                      >
                        Todos
                      </button>
                      <button
                        onClick={() => toggleAllVisible(false)}
                        className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        title="Deseleccionar todos"
                      >
                        Ninguno
                      </button>
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">
                  <div className="flex flex-col items-center gap-1">
                    <span>Requerido</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => toggleAllRequired(true)}
                        disabled={!areAllVisible}
                        className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Seleccionar todos los visibles como requeridos"
                      >
                        Todos
                      </button>
                      <button
                        onClick={() => toggleAllRequired(false)}
                        className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        title="Deseleccionar todos"
                      >
                        Ninguno
                      </button>
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Orden</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedFieldConfigs.map((config) => (
                <tr key={config.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">
                      {getFieldLabel(config.fieldName)}
                    </span>
                    <span className="text-gray-500 ml-2">({config.fieldName})</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={config.isVisible}
                      onChange={(e) =>
                        updateFieldConfig(config.fieldName, {
                          isVisible: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={config.isRequired}
                      onChange={(e) =>
                        updateFieldConfig(config.fieldName, {
                          isRequired: e.target.checked,
                        })
                      }
                      disabled={!config.isVisible}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() =>
                          updateFieldConfig(config.fieldName, {
                            displayOrder: Math.max(0, config.displayOrder - 1),
                          })
                        }
                        className="px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                        title="Mover arriba"
                      >
                        ↑
                      </button>
                      <input
                        type="number"
                        value={config.displayOrder}
                        onChange={(e) =>
                          updateFieldConfig(config.fieldName, {
                            displayOrder: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-16 text-center border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        min="0"
                      />
                      <button
                        onClick={() =>
                          updateFieldConfig(config.fieldName, {
                            displayOrder: config.displayOrder + 1,
                          })
                        }
                        className="px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                        title="Mover abajo"
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Nota informativa */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600">
          <span className="font-medium">Nota:</span> Los campos marcados como "Requerido" solo
          pueden ser requeridos si están "Visible". El orden determina el orden de visualización
          en el formulario de captura de productos.
        </p>
      </div>
    </div>
  );
}


