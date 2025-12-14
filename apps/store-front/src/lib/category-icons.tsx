/**
 * Sistema dinámico de iconos para categorías
 * Permite usar iconos de Material-UI, iconos personalizados (incluyendo AI), y configuración dinámica
 */

import React from 'react';
import {
  DirectionsCar as CarIcon,
  Build as BuildIcon,
  Settings as SettingsIcon,
  LocalGasStation as GasIcon,
  TireRepair as TireIcon,
  OilBarrel as OilIcon,
  BatteryChargingFull as BatteryIcon,
  FilterAlt as FilterIcon,
  Category as CategoryIcon,
  ShoppingCart as CartIcon,
  HomeRepairService as ServiceIcon,
  ElectricCar as ElectricIcon,
  TwoWheeler as MotorcycleIcon,
  Construction as ConstructionIcon,
  Hardware as HardwareIcon,
  Speed as SpeedIcon,
  Engineering as EngineeringIcon,
  Inventory as PartsIcon, // Usar Inventory como icono de partes/refacciones
} from '@mui/icons-material';

// Iconos personalizados que no están en Material-UI
// Estos deben definirse ANTES del mapeo para evitar errores de referencia
const EngineIcon = (props: any) => (
  <SettingsIcon {...props} style={{ transform: 'rotate(45deg)' }} />
);

const BrakeIcon = (props: any) => (
  <SpeedIcon {...props} />
);

const SuspensionIcon = (props: any) => (
  <BuildIcon {...props} />
);

const BodyIcon = (props: any) => (
  <ConstructionIcon {...props} />
);

const LightIcon = (props: any) => (
  <ElectricIcon {...props} />
);

const TransmissionIcon = (props: any) => (
  <EngineeringIcon {...props} />
);

export interface CategoryIconConfig {
  // URL de icono personalizado (puede ser de AI, imagen, etc.)
  iconUrl?: string;
  // Nombre del icono de Material-UI a usar
  muiIconName?: string;
  // Componente de icono personalizado
  customIcon?: React.ReactNode;
}

// Mapeo de nombres de categorías a iconos de Material-UI
const categoryIconMap: Record<string, React.ComponentType<any>> = {
  // Refacciones generales
  'refacciones': PartsIcon,
  'repuestos': PartsIcon,
  'partes': PartsIcon,
  'accesorios': PartsIcon,
  
  // Motor
  'motor': EngineIcon,
  'engines': EngineIcon,
  'aceite': OilIcon,
  'oil': OilIcon,
  'filtros': FilterIcon,
  'filters': FilterIcon,
  'bateria': BatteryIcon,
  'battery': BatteryIcon,
  'baterías': BatteryIcon,
  
  // Frenos
  'frenos': BrakeIcon,
  'brakes': BrakeIcon,
  'pastillas': BrakeIcon,
  'discos': BrakeIcon,
  
  // Suspensión
  'suspension': SuspensionIcon,
  'suspensión': SuspensionIcon,
  'amortiguadores': SuspensionIcon,
  'shocks': SuspensionIcon,
  
  // Llantas y rines
  'llantas': TireIcon,
  'tires': TireIcon,
  'neumaticos': TireIcon,
  'rines': TireIcon,
  'wheels': TireIcon,
  
  // Carrocería
  'carroceria': BodyIcon,
  'carrocería': BodyIcon,
  'body': BodyIcon,
  'pintura': BodyIcon,
  'paint': BodyIcon,
  
  // Iluminación
  'iluminacion': LightIcon,
  'iluminación': LightIcon,
  'lights': LightIcon,
  'focos': LightIcon,
  'lamparas': LightIcon,
  
  // Sistema eléctrico
  'electrico': ElectricIcon,
  'eléctrico': ElectricIcon,
  'electrical': ElectricIcon,
  'alternador': ElectricIcon,
  'generador': ElectricIcon,
  
  // Combustible
  'combustible': GasIcon,
  'fuel': GasIcon,
  'gasolina': GasIcon,
  'diesel': GasIcon,
  
  // Transmisión
  'transmision': TransmissionIcon,
  'transmisión': TransmissionIcon,
  'transmission': TransmissionIcon,
  'clutch': TransmissionIcon,
  'embrague': TransmissionIcon,
  
  // Servicios
  'servicios': ServiceIcon,
  'services': ServiceIcon,
  'instalacion': ServiceIcon,
  'instalación': ServiceIcon,
  'mantenimiento': ServiceIcon,
  'maintenance': ServiceIcon,
  
  // Vehículos
  'vehiculos': CarIcon,
  'vehículos': CarIcon,
  'vehicles': CarIcon,
  'autos': CarIcon,
  'cars': CarIcon,
  'motos': MotorcycleIcon,
  'motorcycles': MotorcycleIcon,
  
  // Herramientas
  'herramientas': HardwareIcon,
  'tools': HardwareIcon,
  'equipo': HardwareIcon,
  'equipment': HardwareIcon,
  
  // General/Default
  'default': CategoryIcon,
  'categoria': CategoryIcon,
  'categoría': CategoryIcon,
  'category': CategoryIcon,
};

/**
 * Obtiene el icono apropiado para una categoría
 * @param categoryName - Nombre de la categoría
 * @param config - Configuración opcional con icono personalizado
 * @returns Componente React del icono
 */
export function getCategoryIcon(
  categoryName: string,
  config?: CategoryIconConfig
): React.ReactNode {
  // Si hay una URL de icono personalizado (puede ser de AI, imagen, etc.), usarla
  if (config?.iconUrl) {
    return (
      <img
        src={config.iconUrl}
        alt={categoryName}
        className="w-5 h-5 object-contain"
        onError={(e) => {
          // Si falla la carga, usar el icono de Material-UI como fallback
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
    );
  }

  // Si hay un componente de icono personalizado, usarlo
  if (config?.customIcon) {
    return config.customIcon;
  }

  // Si hay un nombre de icono de Material-UI específico, usarlo
  if (config?.muiIconName) {
    const IconComponent = categoryIconMap[config.muiIconName.toLowerCase()];
    if (IconComponent) {
      return <IconComponent className="w-5 h-5" />;
    }
  }

  // Buscar icono por nombre de categoría
  const name = categoryName.toLowerCase().trim();
  
  // Buscar coincidencias exactas primero
  const exactMatch = categoryIconMap[name];
  if (exactMatch) {
    return <exactMatch className="w-5 h-5" />;
  }

  // Buscar coincidencias parciales
  for (const [key, IconComponent] of Object.entries(categoryIconMap)) {
    if (IconComponent && (name.includes(key) || key.includes(name))) {
      return <IconComponent className="w-5 h-5" />;
    }
  }

  // Buscar por palabras clave en el nombre
  const keywords = name.split(/[\s\-_]+/);
  for (const keyword of keywords) {
    const IconComponent = categoryIconMap[keyword];
    if (IconComponent) {
      return <IconComponent className="w-5 h-5" />;
    }
  }

  // Fallback: icono genérico
  return <CategoryIcon className="w-5 h-5" />;
}

/**
 * Obtiene la configuración de icono desde los datos de la categoría
 * Esto permite que las categorías tengan iconos personalizados configurados en la BD
 */
export function getCategoryIconFromData(category: {
  name: string;
  icon_url?: string;
  icon_type?: 'mui' | 'custom' | 'ai';
  mui_icon_name?: string;
}): React.ReactNode {
  const config: CategoryIconConfig = {};

  if (category.icon_url) {
    config.iconUrl = category.icon_url;
  }

  if (category.mui_icon_name) {
    config.muiIconName = category.mui_icon_name;
  }

  return getCategoryIcon(category.name, config);
}

/**
 * Registra un nuevo mapeo de icono para una categoría
 * Útil para extender el sistema dinámicamente
 */
export function registerCategoryIcon(
  categoryName: string,
  iconComponent: React.ComponentType<any>
): void {
  categoryIconMap[categoryName.toLowerCase()] = iconComponent;
}

