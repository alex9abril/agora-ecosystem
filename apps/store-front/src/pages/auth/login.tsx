/**
 * Página de login
 * Diseño inspirado en Toyota Autoparts
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useStoreContext } from '@/contexts/StoreContext';
import ContextualLink from '@/components/ContextualLink';
import { brandingService, Branding } from '@/lib/branding';
import agoraLogo from '@/images/agora_logo_white.png';

export default function LoginPage() {
  const { signIn, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { groupId, branchId } = useStoreContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [isBrandingLoading, setIsBrandingLoading] = useState(true);

  // Cargar branding si hay contexto
  useEffect(() => {
    const loadBranding = async () => {
      setIsBrandingLoading(true);
      try {
        let brandingData: Branding | null = null;
        
        if (branchId) {
          brandingData = await brandingService.getBusinessBranding(branchId);
          if (brandingData && !brandingData.logo_url && groupId) {
            const groupBranding = await brandingService.getGroupBranding(groupId);
            if (groupBranding?.logo_url) {
              brandingData = { ...brandingData, logo_url: groupBranding.logo_url };
            }
          }
        } else if (groupId) {
          brandingData = await brandingService.getGroupBranding(groupId);
        }
        
        setBranding(brandingData);
      } catch (error) {
        console.error('Error cargando branding:', error);
        setBranding(null);
      } finally {
        setIsBrandingLoading(false);
      }
    };

    if (branchId || groupId) {
      loadBranding();
    } else {
      setIsBrandingLoading(false);
    }
  }, [branchId, groupId]);

  // Redirigir si ya está autenticado o a la URL de redirect
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const redirect = router.query.redirect as string;
      if (redirect) {
        router.push(decodeURIComponent(redirect));
      } else {
        // Mantener el contexto de tienda si existe en la URL actual
        const currentPath = router.asPath.split('?')[0];
        const contextMatch = currentPath.match(/^\/(grupo|sucursal|brand)\/([^/]+)/);
        if (contextMatch) {
          router.push(`/${contextMatch[1]}/${contextMatch[2]}`);
        } else {
          router.push('/');
        }
      }
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      // Redirigir a la URL de redirect si existe, sino mantener el contexto o ir al home
      const redirect = router.query.redirect as string;
      if (redirect) {
        router.push(decodeURIComponent(redirect));
      } else {
        // Mantener el contexto de tienda si existe en la URL actual
        const currentPath = router.asPath.split('?')[0];
        const contextMatch = currentPath.match(/^\/(grupo|sucursal|brand)\/([^/]+)/);
        if (contextMatch) {
          router.push(`/${contextMatch[1]}/${contextMatch[2]}`);
        } else {
          router.push('/');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  // Obtener logo URL
  const logoUrl = branding?.logo_url || null;
  const logoAlt = branding?.logo_url ? 'Logo' : 'AGORA PARTS';

  return (
    <>
      <Head>
        <title>Iniciar Sesión - Agora</title>
      </Head>
      <div className="min-h-screen bg-white">
        {/* Contenido principal centrado */}
        <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 pb-8 pt-8">
          {/* Logo y botón de regreso */}
          <div className="w-full max-w-4xl mb-6 flex items-center justify-between">
            <ContextualLink href="/" className="inline-block hover:opacity-80 transition-opacity">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={logoAlt}
                  className="h-7 sm:h-8 object-contain"
                  style={{ maxHeight: '32px' }}
                />
              ) : (
                <Image
                  src={agoraLogo}
                  alt="AGORA PARTS"
                  width={128}
                  height={38}
                  className="object-contain h-7 sm:h-8"
                  style={{ maxHeight: '32px' }}
                  priority
                />
              )}
            </ContextualLink>
            <ContextualLink
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Regresar
            </ContextualLink>
          </div>
          
          <div className="w-full max-w-4xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
              {/* Sección izquierda: Sign in tradicional */}
              <div className="w-full">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                  Iniciar sesión
                </h1>
                <p className="text-gray-700 mb-5 text-sm">
                  Usa tu correo electrónico o número de teléfono
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-500 text-red-700 px-3 py-2 rounded text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Correo electrónico o número de teléfono"
                      required
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                        error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-900'
                      }`}
                    />
                    {error && (
                      <p className="mt-1 text-xs text-red-600">
                        Por favor ingresa un correo electrónico o número de teléfono válido.
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Contraseña"
                        required
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 text-xs"
                      >
                        {showPassword ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <ContextualLink
                      href="/auth/register"
                      className="flex-1 px-4 py-2.5 border-2 border-gray-900 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center text-sm"
                    >
                      Crear cuenta
                    </ContextualLink>
                    <button
                      type="submit"
                      disabled={loading || !email || !password}
                      className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-500 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 hover:text-gray-700 text-sm"
                    >
                      {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>
                  </div>
                </form>

                <p className="mt-4 text-xs text-gray-600">
                  Puedes usar la información de tu cuenta de Agora Ecosystem Marketplace para iniciar sesión.
                </p>
              </div>

              {/* Sección derecha: Single Sign-On */}
              <div className="w-full pt-[2.5rem]">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                  Continuar con Single Sign-On
                </h2>

                <div className="space-y-3">
                  <button
                    type="button"
                    className="w-full px-4 py-2.5 border-2 border-gray-900 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                    disabled
                  >
                    -
                    {/*
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.96-3.24-1.44-1.56-.59-2.3-1.23-2.3-2.11 0-.84.79-1.75 2.24-1.75.76 0 1.5.15 2.23.4.29.1.56.2.81.29.4.14.78.27 1.15.37.36.1.7.19 1.02.26.48.1.93.15 1.35.15 1.3 0 2.25-.5 2.88-1.5.63-1 .95-2.41.95-4.23 0-1.72-.26-3.04-.78-3.96-.52-.91-1.3-1.36-2.34-1.36-1.1 0-1.87.5-2.32 1.5-.45 1-.68 2.41-.68 4.23 0 1.82.23 3.23.68 4.23.45 1 1.22 1.5 2.32 1.5.76 0 1.4-.23 1.92-.69.52-.46.78-1.11.78-1.95 0-.84-.26-1.49-.78-1.95-.52-.46-1.16-.69-1.92-.69-.48 0-.93.05-1.35.15-.32.07-.66.16-1.02.26-.37.1-.75.23-1.15.37-.25.09-.52.19-.81.29-.73.25-1.47.4-2.23.4-1.45 0-2.24.91-2.24 1.75 0 .88.74 1.52 2.3 2.11 1.16.48 2.15.94 3.24 1.44 1.03.48 2.1.55 3.08-.4.98-.95 1.47-2.33 1.47-4.15 0-1.82-.49-3.2-1.47-4.15-.98-.95-2.05-.88-3.08-.4-1.09.5-2.08.96-3.24 1.44-1.56.59-2.3 1.23-2.3 2.11 0 .84.79 1.75 2.24 1.75.76 0 1.5-.15 2.23-.4.29-.1.56-.2.81-.29.4-.14.78-.27 1.15-.37.36-.1.7-.19 1.02-.26.48-.1.93-.15 1.35-.15 1.3 0 2.25.5 2.88 1.5.63 1 .95 2.41.95 4.23 0 1.82-.32 3.23-.95 4.23-.63 1-1.58 1.5-2.88 1.5z"/>
                    </svg>
                    Continuar con Apple
                    */}
                  </button>

                  <button
                    type="button"
                    className="w-full px-4 py-2.5 border-2 border-gray-900 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                    disabled
                  >
                    -
                    {/* <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continuar con Google */}
                  </button>

                  <button
                    type="button"
                    className="w-full px-4 py-2.5 border-2 border-gray-900 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                    disabled
                  >
                    -
                    {/* <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Continuar con Facebook */}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

