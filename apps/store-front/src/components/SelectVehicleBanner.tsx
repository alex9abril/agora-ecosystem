/**
 * Banner de selección de vehículo (estilo Parts Center Online).
 * Abre el panel de vehículo del header vía evento open-vehicle-panel.
 */

import React, { useCallback, useEffect, useState } from 'react';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import { getSelectedVehicle } from '@/lib/vehicle-storage';

function formatVehicleLabel(vehicle: any): string {
  if (!vehicle) return '';
  if (vehicle.nickname) return vehicle.nickname;
  const parts = [vehicle.brand_name, vehicle.model_name, vehicle.year].filter(Boolean);
  return parts.join(' ') || 'Tu vehículo';
}

export default function SelectVehicleBanner({ className = '' }: { className?: string }) {
  const [vehicle, setVehicle] = useState<any | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setVehicle(getSelectedVehicle());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();

    const onVehicleSelected = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setVehicle(detail ?? getSelectedVehicle());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'user_vehicle_selected' || e.key === 'user_vehicle') {
        refresh();
      }
    };
    const onSynced = () => refresh();

    window.addEventListener('vehicle-selected', onVehicleSelected as EventListener);
    window.addEventListener('storage', onStorage);
    window.addEventListener('auth:vehicles-synced', onSynced);
    return () => {
      window.removeEventListener('vehicle-selected', onVehicleSelected as EventListener);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('auth:vehicles-synced', onSynced);
    };
  }, [refresh]);

  const openVehiclePanel = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-vehicle-panel'));
    }
  };

  if (!ready) {
    return (
      <div className={`w-full bg-neutral-100 animate-pulse h-[88px] ${className}`} aria-hidden />
    );
  }

  return (
    <section
      className={`w-full border-y border-neutral-200 bg-neutral-50 ${className}`}
      aria-label="Selección de vehículo"
    >
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex-shrink-0 w-11 h-11 rounded-full bg-white border border-neutral-200 flex items-center justify-center">
            <DirectionsCarIcon className="w-6 h-6 text-neutral-800" />
          </div>
          <div className="min-w-0">
            {vehicle ? (
              <>
                <p className="text-xs uppercase tracking-wide text-neutral-500 mb-0.5">
                  Comprando para
                </p>
                <h2 className="font-display text-xl md:text-2xl font-semibold text-neutral-900 truncate">
                  {formatVehicleLabel(vehicle)}
                </h2>
                <p className="text-sm text-neutral-600 mt-1">
                  Mostramos productos y compatibilidad según este vehículo.
                </p>
              </>
            ) : (
              <>
                <h2 className="font-display text-xl md:text-2xl font-semibold text-neutral-900">
                  Compra productos para tu vehículo
                </h2>
                <p className="text-sm text-neutral-600 mt-1">
                  Selecciona tu auto para ver refacciones compatibles y comprar con confianza.
                </p>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={openVehiclePanel}
          className="inline-flex items-center justify-center px-6 py-3 bg-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors flex-shrink-0"
        >
          {vehicle ? 'Cambiar vehículo' : 'Seleccionar vehículo'}
        </button>
      </div>
    </section>
  );
}
