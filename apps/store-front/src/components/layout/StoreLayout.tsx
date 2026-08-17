/**
 * Layout principal del store-front con branding personalizado por contexto
 */

import React, { ReactNode, useState, useEffect } from 'react';
// Evitamos next/image aquí para no propagar fetchPriority a <img> en entornos que no lo soportan
import { useStoreContext } from '@/contexts/StoreContext';
import Header from './Header';
import ContextualLink from '../ContextualLink';
import agoraLogoWhite from '@/images/agora_logo_white.png';
import { brandingService, Branding } from '@/lib/branding';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import BrandingLoader from '../BrandingLoader';
import BrandingFavicon from '../BrandingFavicon';
import PromoBar from '../PromoBar';
import { BrandingProvider } from '@/contexts/BrandingContext';

interface StoreLayoutProps {
  children: ReactNode;
}

export default function StoreLayout({ children }: StoreLayoutProps) {
  const { 
    contextType, 
    groupData, 
    branchData, 
    isInStore, 
    isLoading,
    error,
    groupId,
    branchId,
    brandId,
  } = useStoreContext();
  const [branding, setBranding] = useState<Branding | null>(null);
  const [isBrandingLoading, setIsBrandingLoading] = useState(true);
  const [initialBackgroundColor, setInitialBackgroundColor] = useState<string | undefined>(undefined);

  // Función helper para guardar el color en localStorage
  const saveBackgroundColor = (color: string, branchId?: string | null, groupId?: string | null, brandId?: string | null) => {
    if (typeof window === 'undefined') return;
    try {
      if (branchId) {
        localStorage.setItem(`branding_bg_${branchId}`, color);
      } else if (groupId) {
        localStorage.setItem(`branding_bg_group_${groupId}`, color);
      } else if (brandId) {
        localStorage.setItem(`branding_bg_brand_${brandId}`, color);
      } else {
        localStorage.setItem('branding_bg_global', color);
      }
    } catch (error) {
      console.error('Error guardando color:', error);
    }
  };

  // Función helper para obtener el color guardado
  const getStoredBackgroundColor = (branchId?: string | null, groupId?: string | null, brandId?: string | null): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      if (branchId) {
        const stored = localStorage.getItem(`branding_bg_${branchId}`);
        if (stored) return stored;
      }
      if (groupId) {
        const stored = localStorage.getItem(`branding_bg_group_${groupId}`);
        if (stored) return stored;
      }
      if (brandId) {
        const stored = localStorage.getItem(`branding_bg_brand_${brandId}`);
        if (stored) return stored;
      }
      if (!branchId && !groupId && !brandId) {
        const stored = localStorage.getItem('branding_bg_global');
        if (stored) return stored;
      }
    } catch (error) {
      console.error('Error leyendo color guardado:', error);
    }
    return null;
  };

  // Aplicar color de fondo inmediatamente cuando se detecta el contexto
  useEffect(() => {
    // Intentar obtener el color guardado primero
    const storedColor = getStoredBackgroundColor(branchId, groupId, brandId);
    const colorToApply = storedColor || '#f9fafb'; // gray-50 por defecto
    
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = colorToApply;
      setInitialBackgroundColor(colorToApply);
    }
  }, [branchId, groupId, brandId]);

  // Cargar branding para mostrar redes sociales y aplicar colores
  useEffect(() => {
    let isMounted = true;
    
    const loadBranding = async () => {
      setIsBrandingLoading(true);
      
      try {
        let brandingData: Branding | null = null;
        
        if (branchId) {
          brandingData = await brandingService.getBusinessBranding(branchId);
          
          // Si no tiene colores pero tiene grupo, intentar obtener colores del grupo
          if (brandingData && !brandingData.colors?.background && groupId) {
            try {
              const groupBranding = await brandingService.getGroupBranding(groupId);
              if (groupBranding?.colors?.background) {
                brandingData = {
                  ...brandingData,
                  colors: {
                    ...brandingData.colors,
                    background: groupBranding.colors.background,
                  },
                };
              }
            } catch (error) {
              console.error('Error cargando branding del grupo para colores:', error);
            }
          }
        } else if (groupId) {
          brandingData = await brandingService.getGroupBranding(groupId);
        } else if (brandId) {
          brandingData = await brandingService.getVehicleBrandBranding(brandId);
        } else {
          // Tienda global (Agora global)
          brandingData = await brandingService.getGlobalBranding();
        }
        
        if (isMounted) {
          setBranding(brandingData);
          
          // Aplicar color de fondo inmediatamente si existe
          if (brandingData?.colors?.background) {
            const bgColor = brandingData.colors.background;
            setInitialBackgroundColor(bgColor);
            // Aplicar al body también para evitar flash
            if (typeof document !== 'undefined') {
              document.body.style.backgroundColor = bgColor;
            }
            // Guardar el color en localStorage para uso futuro
            saveBackgroundColor(bgColor, branchId, groupId, brandId);
          } else {
            // Color por defecto
            const defaultColor = '#f9fafb'; // gray-50
            setInitialBackgroundColor(defaultColor);
            if (typeof document !== 'undefined') {
              document.body.style.backgroundColor = defaultColor;
            }
            // Guardar el color por defecto también
            saveBackgroundColor(defaultColor, branchId, groupId, brandId);
          }
        }
      } catch (error) {
        console.error('Error cargando branding:', error);
        if (isMounted) {
          setBranding(null);
          const defaultColor = '#f9fafb';
          setInitialBackgroundColor(defaultColor);
          if (typeof document !== 'undefined') {
            document.body.style.backgroundColor = defaultColor;
          }
          // Guardar el color por defecto en caso de error
          saveBackgroundColor(defaultColor, branchId, groupId, brandId);
        }
      } finally {
        if (isMounted) {
          setIsBrandingLoading(false);
        }
      }
    };

    // Siempre cargar branding: por contexto (grupo/sucursal/marca) o tienda global
    loadBranding();
    
    return () => {
      isMounted = false;
    };
  }, [branchId, groupId, brandId]);

  // Función helper para detectar si una URL es una imagen
  const isImageUrl = (url: string): boolean => {
    if (!url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.includes(ext)) || 
           lowerUrl.includes('/uploads/') || 
           lowerUrl.includes('image') ||
           lowerUrl.includes('logo');
  };

  // Usar SIEMPRE el color de fondo configurado en branding cuando exista
  const configuredBackground = branding?.colors?.background && String(branding.colors.background).trim();
  const backgroundColor = configuredBackground || initialBackgroundColor || '#f9fafb';
  
  // También considerar el loading del contexto de la tienda
  const isFullyLoading = isBrandingLoading || isLoading;

  return (
    <BrandingProvider branding={branding}>
    <>
      <BrandingFavicon />
      {/* Loading overlay mientras se carga el branding */}
      <BrandingLoader 
        isLoading={isFullyLoading} 
        backgroundColor={backgroundColor}
        branchId={branchId}
        groupId={groupId}
        brandId={brandId}
      />
      
      <div 
        className="min-h-screen transition-colors duration-200"
        style={{
          backgroundColor: backgroundColor,
        }}
      >
        <div className={branding?.embed_layout === 'contained' ? 'max-w-7xl mx-auto w-full px-4 sm:px-6' : undefined}>
        {/* Promo bar estilo Parts Center Online (oculta en embed) */}
        {!branding?.embed_mode && <PromoBar />}
        {/* Header principal */}
        <Header />


      {/* Mensaje de error si el slug no existe */}
      {error && (
        <div className="bg-red-50 border-l-4 border-toyota-red p-4">
          <div className="max-w-7xl mx-auto">
            <p className="text-toyota-red-dark">{error}</p>
            <ContextualLink href="/" className="text-toyota-red hover:text-toyota-red-dark text-sm mt-2 inline-block">
              Volver al inicio
            </ContextualLink>
          </div>
        </div>
      )}

      {/* Contenido principal: mismo espacio arriba/abajo del header en iframe (16px = pt-4, igual que marginTop del header) */}
      <main className={branding?.embed_mode ? 'pt-4' : undefined}>
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Cargando...</p>
          </div>
        ) : (
          children
        )}
      </main>

      {/* Footer: oculto cuando la tienda está en modo embebido (iframe/subdominio) */}
      {!branding?.embed_mode && (
      <footer className="bg-gray-800 text-white mt-12">
        {/* Sección descriptiva sobre Ágora */}
        <div className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3 mb-2">
              <img
                src={typeof agoraLogoWhite === 'string' ? agoraLogoWhite : (agoraLogoWhite as any).src}
                alt="Ágora"
                className="object-contain"
                style={{ height: 'auto', maxHeight: '30px', width: '80px' }}
              />
              <h3 className="text-xs font-semibold text-gray-300">¿Qué es Ágora?</h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed max-w-3xl">
              Ágora es una plataforma de comercio electrónico especializada en refacciones automotrices, 
              dedicada a ofrecer a los consumidores una experiencia de compra cómoda y eficiente. 
              Somos un marketplace que te conecta con grupos empresariales y sucursales especializadas 
              en el sector automotriz. Disfruta de una experiencia de compra completamente en español, 
              con envíos rápidos, métodos de pago seguros y el catálogo más completo de refacciones.
            </p>
          </div>
        </div>

        {/* Sección principal del footer */}
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Columna 1: Atención al cliente */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Atención al cliente</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  <ContextualLink href="/orders" className="hover:text-white transition-colors">
                    Mis pedidos
                  </ContextualLink>
                </li>
                <li>
                  <ContextualLink href="/profile" className="hover:text-white transition-colors">
                    Mi cuenta
                  </ContextualLink>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Centro de ayuda
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Política de devoluciones
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Protección al comprador
                  </a>
                </li>
              </ul>
            </div>

            {/* Columna 2: Guía de compra */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Guía de compra</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Crear una cuenta
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Métodos de pago
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Información de envío
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Preguntas frecuentes
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Términos y condiciones
                  </a>
                </li>
              </ul>
            </div>

            {/* Columna 3: Sobre nosotros / Contacto */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                {isInStore() ? 'Contacto' : 'Sobre Ágora'}
              </h3>
              {isInStore() ? (
                <div className="space-y-2 text-sm text-gray-300">
                  {contextType === 'grupo' && groupData && (
                    <>
                      <p className="font-medium text-white">{groupData.name}</p>
                      {groupData.website_url && (
                        isImageUrl(groupData.website_url) ? (
                          <div className="mt-2">
                            <img 
                              src={groupData.website_url} 
                              alt={groupData.name}
                              className="max-w-[200px] max-h-[80px] object-contain"
                              onError={(e) => {
                                // Si falla la carga de la imagen, mostrar como link
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const link = document.createElement('a');
                                link.href = groupData.website_url || '';
                                link.target = '_blank';
                                link.rel = 'noopener';
                                link.className = 'hover:text-white transition-colors block text-xs break-all';
                                link.textContent = groupData.website_url || '';
                                target.parentElement?.appendChild(link);
                              }}
                            />
                          </div>
                        ) : (
                          <a 
                            href={groupData.website_url} 
                            target="_blank" 
                            rel="noopener" 
                            className="hover:text-white transition-colors block text-xs break-all"
                          >
                            {groupData.website_url}
                          </a>
                        )
                      )}
                    </>
                  )}
                  {contextType === 'sucursal' && branchData && (
                    <>
                      <p className="font-medium text-white">{branchData.name}</p>
                      {branchData.address && <p>{branchData.address}</p>}
                      {branchData.phone && (
                        <a href={`tel:${branchData.phone}`} className="hover:text-white transition-colors block">
                          {branchData.phone}
                        </a>
                      )}
                      {branchData.email && (
                        <a href={`mailto:${branchData.email}`} className="hover:text-white transition-colors block">
                          {branchData.email}
                        </a>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-sm text-gray-300">
                  <p>Ágora es tu plataforma de comercio electrónico para refacciones automotrices.</p>
                  <p>Conectamos clientes con grupos y sucursales especializadas.</p>
                </div>
              )}
            </div>

            {/* Columna 4: Métodos de pago y Redes sociales */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Pagar con</h3>
              <div className="flex flex-wrap gap-3 mb-6">
                {/* Métodos de pago - usando texto por ahora, se pueden agregar logos después */}
                <div className="flex items-center gap-2 text-xs bg-gray-700 px-3 py-1.5 rounded">
                  <span>💳</span>
                  <span>Tarjeta</span>
                </div>
                <div className="flex items-center gap-2 text-xs bg-gray-700 px-3 py-1.5 rounded">
                  <span>💵</span>
                  <span>Monedero</span>
                </div>
              </div>

              {/* Redes sociales */}
              {branding?.social_media && (
                <>
                  <h3 className="text-lg font-semibold mb-4">Síguenos en</h3>
                  <div className="flex gap-3">
                    {branding.social_media.facebook && (
                      <a
                        href={branding.social_media.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-300 hover:text-white transition-colors"
                        aria-label="Facebook"
                      >
                        <FacebookIcon />
                      </a>
                    )}
                    {branding.social_media.instagram && (
                      <a
                        href={branding.social_media.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-300 hover:text-white transition-colors"
                        aria-label="Instagram"
                      >
                        <InstagramIcon />
                      </a>
                    )}
                    {branding.social_media.twitter && (
                      <a
                        href={branding.social_media.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-300 hover:text-white transition-colors"
                        aria-label="Twitter"
                      >
                        <TwitterIcon />
                      </a>
                    )}
                    {branding.social_media.whatsapp && (
                      <a
                        href={`https://wa.me/${branding.social_media.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-300 hover:text-white transition-colors"
                        aria-label="WhatsApp"
                      >
                        <WhatsAppIcon />
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Powered by Ágora */}
          <div className="border-t border-gray-700 pt-6 mt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-400">
                © {new Date().getFullYear()} Ágora. Todos los derechos reservados.
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300">Powered by</span>
                <img
                  src={typeof agoraLogoWhite === 'string' ? agoraLogoWhite : (agoraLogoWhite as any).src}
                  alt="Ágora"
                  className="object-contain"
                  style={{ height: 'auto', maxHeight: '50px', width: '100px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Barra inferior con enlaces legales */}
        <div className="bg-gray-900 border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-wrap gap-4 text-xs text-gray-400 justify-center md:justify-start">
              <a href="#" className="hover:text-white transition-colors">
                Política de privacidad
              </a>
              <span className="text-gray-600">|</span>
              <a href="#" className="hover:text-white transition-colors">
                Términos de uso
              </a>
              <span className="text-gray-600">|</span>
              <a href="#" className="hover:text-white transition-colors">
                Mapa del sitio
              </a>
              <span className="text-gray-600">|</span>
              <a href="#" className="hover:text-white transition-colors">
                Protección de datos
              </a>
            </div>
          </div>
        </div>
      </footer>
      )}
        </div>
      </div>
    </>
    </BrandingProvider>
  );
}

