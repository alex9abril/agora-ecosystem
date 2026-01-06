/**
 * Tarjetas inteligentes que se adaptan al estado del usuario
 * Inspirado en Mercado Libre - muestra tarjetas relevantes según contexto
 */

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import ContextualLink from './ContextualLink';
import { useAuth } from '@/contexts/AuthContext';
import { ordersService, Order } from '@/lib/orders';
import { useStoreContext } from '@/contexts/StoreContext';

// Importar iconos personalizados
import trendingTopicIcon from '@/images/iconos/trending-topic.png';
import carPartsIcon from '@/images/iconos/autos.png';
import mantenimientoIcon from '@/images/iconos/mantenimiento.png';
import ahorrosIcon from '@/images/iconos/ahorros.png';
import botConversacionalIcon from '@/images/iconos/bot-conversacional.png';
import entregaRapidaIcon from '@/images/iconos/entrega-rapida.png';
import piezasAutomovilIcon from '@/images/iconos/piezas-de-automovil.png';

interface SmartCard {
  id: string;
  type: string;
  title: string;
  description: string;
  icon?: React.ReactNode; // Icono de Material-UI (opcional)
  iconImage?: any; // Imagen de icono personalizado (opcional)
  link?: string;
  backgroundColor?: string;
  onClick?: () => void;
  priority: number; // Menor número = mayor prioridad
}

interface SmartCategoryCardsProps {
  className?: string;
}

export default function SmartCategoryCards({ className = '' }: SmartCategoryCardsProps) {
  const { isAuthenticated, user } = useAuth();
  const { getContextualUrl } = useStoreContext();
  const [cards, setCards] = useState<SmartCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [userVehicle, setUserVehicle] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lastViewedProduct, setLastViewedProduct] = useState<any>(null);

  // Cargar estado del usuario
  useEffect(() => {
    loadUserState();
  }, [isAuthenticated, user]);

  const loadUserState = async () => {
    try {
      setLoading(true);

      // 1. Cargar vehículo del usuario (solo si está autenticado)
      if (isAuthenticated && typeof window !== 'undefined') {
        const vehicleStr = localStorage.getItem('user_vehicle');
        if (vehicleStr) {
          try {
            setUserVehicle(JSON.parse(vehicleStr));
          } catch (e) {
            console.error('Error parsing vehicle:', e);
          }
        }
      } else {
        // Si no está autenticado, limpiar el vehículo
        setUserVehicle(null);
      }

      // 2. Cargar pedidos recientes (si está autenticado)
      if (isAuthenticated) {
        try {
          const orders = await ordersService.findAll();
          setRecentOrders(orders.slice(0, 3)); // Últimos 3 pedidos
        } catch (error) {
          console.error('Error cargando pedidos:', error);
        }
      } else {
        setRecentOrders([]);
      }

      // 3. Cargar último producto visitado (desde localStorage)
      if (typeof window !== 'undefined') {
        const lastProductStr = localStorage.getItem('last_viewed_product');
        if (lastProductStr) {
          try {
            setLastViewedProduct(JSON.parse(lastProductStr));
          } catch (e) {
            console.error('Error parsing last product:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error cargando estado del usuario:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generar tarjetas inteligentes
  useEffect(() => {
    if (loading) return;

    const generatedCards: SmartCard[] = [];

    // 1️⃣ Último producto visitado (prioridad 1)
    if (lastViewedProduct) {
      generatedCards.push({
        id: 'last-product',
        type: 'last-product',
        title: 'CONTINÚA DONDE LO DEJASTE',
        description: `Vimos que consultaste este producto recientemente`,
        iconImage: trendingTopicIcon,
        link: getContextualUrl(`/products/${lastViewedProduct.id}`),
        backgroundColor: '#ffffff',
        priority: 1,
      });
    }

    // 2️⃣ Vehículo no seleccionado (prioridad 2 - solo si no hay vehículo y está autenticado)
    if (isAuthenticated && !userVehicle) {
      generatedCards.push({
        id: 'select-vehicle',
        type: 'select-vehicle',
        title: 'SELECCIONA TU VEHÍCULO',
        description: 'Selecciona tu auto para ver refacciones compatibles',
        iconImage: carPartsIcon,
        link: getContextualUrl('/profile?tab=vehicle'),
        backgroundColor: '#ffffff',
        priority: 2,
      });
    }

    // 3️⃣ Refacciones compatibles (prioridad 3 - solo si hay vehículo y está autenticado)
    if (isAuthenticated && userVehicle) {
      generatedCards.push({
        id: 'compatible-parts',
        type: 'compatible-parts',
        title: 'COMPATIBLES CON TU AUTO',
        description: 'Refacciones 100% compatibles con tu vehículo',
        iconImage: piezasAutomovilIcon,
        link: getContextualUrl('/products?compatible=true'),
        backgroundColor: '#ffffff',
        priority: 3,
      });
    }

    // 4️⃣ Productos más comprados (prioridad 4 - solo si hay vehículo y está autenticado)
    if (isAuthenticated && userVehicle) {
      generatedCards.push({
        id: 'popular-parts',
        type: 'popular-parts',
        title: 'LO MÁS USADO EN TU MODELO',
        description: 'Lo más comprado para tu modelo',
        iconImage: trendingTopicIcon,
        link: getContextualUrl('/products?popular=true'),
        backgroundColor: '#ffffff',
        priority: 4,
      });
    }

    // 5️⃣ Mantenimiento recomendado (prioridad 5 - solo si hay vehículo y está autenticado)
    if (isAuthenticated && userVehicle) {
      generatedCards.push({
        id: 'maintenance',
        type: 'maintenance',
        title: 'MANTENIMIENTO RECOMENDADO',
        description: 'Cambia filtros, balatas y aceite a tiempo',
        iconImage: mantenimientoIcon,
        link: getContextualUrl('/products?category=maintenance'),
        backgroundColor: '#ffffff',
        priority: 5,
      });
    }

    // 6️⃣ Ofertas relevantes (prioridad 6 - solo si hay vehículo y está autenticado)
    if (isAuthenticated && userVehicle) {
      generatedCards.push({
        id: 'vehicle-offers',
        type: 'vehicle-offers',
        title: 'AHORRA EN REFACCIONES COMPATIBLES',
        description: 'Promociones activas para tu vehículo',
        iconImage: ahorrosIcon,
        link: getContextualUrl('/products?promotions=true'),
        backgroundColor: '#ffffff',
        priority: 6,
      });
    }

    // 7️⃣ Accesorios populares (prioridad 7 - solo si hay vehículo y está autenticado)
    if (isAuthenticated && userVehicle) {
      generatedCards.push({
        id: 'accessories',
        type: 'accessories',
        title: 'MEJORA TU VEHÍCULO',
        description: 'Accesorios más populares para tu modelo',
        iconImage: carPartsIcon,
        link: getContextualUrl('/products?category=accessories'),
        backgroundColor: '#ffffff',
        priority: 7,
      });
    }

    // 8️⃣ Asesoría rápida (prioridad 8)
    generatedCards.push({
      id: 'support',
      type: 'support',
      title: '¿NO ESTÁS SEGURO DE QUÉ COMPRAR?',
      description: 'Recibe ayuda personalizada para elegir',
      iconImage: botConversacionalIcon,
      link: getContextualUrl('/support'),
      backgroundColor: '#ffffff',
      priority: 8,
    });

    // 9️⃣ Historial de pedidos (prioridad 9 - solo si hay pedidos y está autenticado)
    if (isAuthenticated && recentOrders.length > 0) {
      generatedCards.push({
        id: 'orders',
        type: 'orders',
        title: 'TUS PEDIDOS RECIENTES',
        description: 'Consulta o repite una compra anterior',
        iconImage: entregaRapidaIcon,
        link: getContextualUrl('/orders'),
        backgroundColor: '#ffffff',
        priority: 9,
      });
    }

    // Ordenar por prioridad y tomar las primeras 6
    const sortedCards = generatedCards
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 6);

    // Si hay menos de 6 tarjetas, agregar tarjetas de categorías genéricas
    if (sortedCards.length < 6) {
      const defaultCards: SmartCard[] = [
        {
          id: 'parts',
          type: 'category',
          title: 'REFACCIONES',
          description: 'Piezas de repuesto y componentes originales',
          iconImage: piezasAutomovilIcon,
          link: getContextualUrl('/products?category=parts'),
          backgroundColor: '#ffffff',
          priority: 10,
        },
        {
          id: 'installation',
          type: 'category',
          title: 'INSTALACIÓN',
          description: 'Servicios de instalación profesional',
          iconImage: mantenimientoIcon,
          link: getContextualUrl('/products?category=installation'),
          backgroundColor: '#ffffff',
          priority: 11,
        },
      ];

      sortedCards.push(...defaultCards.slice(0, 6 - sortedCards.length));
    }

    setCards(sortedCards);
  }, [loading, userVehicle, recentOrders, lastViewedProduct, isAuthenticated, getContextualUrl]);

  if (loading) {
    return (
      <div className={`py-6 ${className}`} style={{ marginTop: '0px', position: 'relative' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-white rounded-lg animate-pulse shadow-md" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <div
      className={`py-6 ${className}`}
      style={{ marginTop: '0px', position: 'relative' }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {cards.map((card) => {
            const CardContent = (
              <div
                className="h-48 rounded-lg shadow-md hover:shadow-xl transition-all hover:scale-105 p-6 flex flex-col justify-between cursor-pointer"
                style={{
                  backgroundColor: card.backgroundColor || '#ffffff',
                }}
                onClick={card.onClick}
              >
                {/* Icono */}
                <div className="flex-shrink-0 mb-3 flex items-center justify-center">
                  {card.iconImage ? (
                    <Image
                      src={card.iconImage}
                      alt={card.title}
                      width={64}
                      height={64}
                      className="object-contain"
                    />
                  ) : card.icon ? (
                    <div className="text-gray-700">{card.icon}</div>
                  ) : (
                    <span className="text-2xl">📦</span>
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900 mb-2 line-clamp-2">
                    {card.title}
                  </h3>
                  <p className="text-xs text-gray-600 line-clamp-3">
                    {card.description}
                  </p>
                </div>
              </div>
            );

            return card.link ? (
              <ContextualLink key={card.id} href={card.link}>
                {CardContent}
              </ContextualLink>
            ) : (
              <div key={card.id}>{CardContent}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

