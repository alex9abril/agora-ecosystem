import { useState, useEffect } from 'react';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';

export default function BusinessSelector() {
  const { availableBusinesses, selectBusiness, selectedBusiness } = useSelectedBusiness();
  const [selectedId, setSelectedId] = useState<string>(selectedBusiness?.business_id || '');
  
  // Si no hay tienda seleccionada, inicializar con '' (modo global)
  useEffect(() => {
    if (!selectedBusiness) {
      setSelectedId('');
    }
  }, [selectedBusiness]);

  const handleSelect = () => {
    // Pasar el selectedId (puede ser '' para modo global o un business_id)
    selectBusiness(selectedId);
    // Recargar la página para aplicar los cambios
    window.location.reload();
  };

  if (availableBusinesses.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Selecciona una Tienda
          </h2>
          <p className="text-sm text-gray-600">
            Tienes acceso a múltiples tiendas. Puedes seleccionar una tienda específica o continuar sin seleccionar para administrar de forma global.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {/* Opción para continuar sin seleccionar */}
          <label
            className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedId === ''
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="business"
              value=""
              checked={selectedId === ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Continuar sin seleccionar (Modo Global)</div>
              <div className="text-sm text-gray-500 mt-1">
                Administrar todas las tiendas de forma global
              </div>
            </div>
          </label>

          {/* Separador */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">O selecciona una tienda específica</span>
            </div>
          </div>

          {availableBusinesses.map((business) => (
            <label
              key={business.business_id}
              className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedId === business.business_id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="business"
                value={business.business_id}
                checked={selectedId === business.business_id}
                onChange={(e) => setSelectedId(e.target.value)}
                className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{business.business_name}</div>
                <div className="text-sm text-gray-500 mt-1">
                  Rol: {getRoleLabel(business.role)}
                </div>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={handleSelect}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    superadmin: 'Super Administrador',
    admin: 'Administrador',
    operations_staff: 'Operations Staff',
    kitchen_staff: 'Kitchen Staff',
  };
  return labels[role] || role;
}

