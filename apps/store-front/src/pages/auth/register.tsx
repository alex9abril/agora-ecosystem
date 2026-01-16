/**
 * Página de registro para clientes
 * Solo solicita datos personales (no información empresarial)
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

export default function RegisterPage() {
  const { signUp, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { groupId, branchId } = useStoreContext();
  const [branding, setBranding] = useState<Branding | null>(null);
  const [isBrandingLoading, setIsBrandingLoading] = useState(true);
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // Mantener el contexto de tienda si existe en la URL actual
      const currentPath = router.asPath.split('?')[0];
      const contextMatch = currentPath.match(/^\/(grupo|sucursal|brand)\/([^/]+)/);
      if (contextMatch) {
        router.push(`/${contextMatch[1]}/${contextMatch[2]}`);
      } else {
        router.push('/');
      }
    }
  }, [isAuthenticated, authLoading, router]);

  const validatePersonalData = () => {
    if (!formData.email) {
      setError('El email es requerido');
      return false;
    }
    if (!formData.password) {
      setError('La contraseña es requerida');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    return true;
  };

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!validatePersonalData()) return;

    setLoading(true);

    try {
      const currentPath = router.asPath.split('?')[0];
      const contextMatch = currentPath.match(/^\/(grupo|sucursal|brand)\/([^/]+)/);
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://agoramp.mx';
      const appUrl = contextMatch
        ? `${origin}/${contextMatch[1]}/${contextMatch[2]}`
        : `${origin}/`;

      await signUp({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        phone: formData.phone || undefined,
        role: 'client',
        requiresEmailConfirmation: true,
        appUrl,
        businessId: branchId || undefined,
        businessGroupId: groupId || undefined,
      });

      setSuccessMessage('Cuenta registrada. Te enviamos un correo para confirmar tu cuenta.');

      // Redirigir al login manteniendo el contexto de tienda si existe
      const loginPath = contextMatch
        ? `/${contextMatch[1]}/${contextMatch[2]}/auth/login`
        : '/auth/login';

      setTimeout(() => {
        router.push(loginPath);
      }, 10000);
    } catch (err: any) {
      setError(err.message || 'Error al registrar usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const logoUrl = branding?.logo_url || null;
  const logoAlt = branding?.logo_url ? 'Logo' : 'AGORA PARTS';

  return (
    <>
      <Head>
        <title>Registro - Agora</title>
      </Head>
      <div className="min-h-screen bg-white">
        <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 pb-8 pt-8">
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
              {/* Sección izquierda: Registro */}
              <div className="w-full">
                {/* Header */}
                <div className="mb-6">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                    Crear Cuenta
                  </h1>
                  <p className="text-gray-700 text-sm">
                    Regístrate en Agora y comienza a comprar
                  </p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10">
              {error && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p>{error}</p>
                  </div>
                </div>
              )}
              {successMessage ? (
                <div className="text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900">Registro exitoso</h2>
                  <p className="text-sm text-gray-600">{successMessage}</p>
                  <p className="text-xs text-gray-500">Redirigiendo al inicio de sesión…</p>
                </div>
              ) : (
                <form onSubmit={handlePersonalSubmit} className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold text-gray-900">Información Personal</h2>
                  <p className="text-sm text-gray-600">Completa tus datos para crear tu cuenta</p>
                </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
                      placeholder="Nombre"
                      />
                    </div>
                    <div>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
                      placeholder="Apellido"
                      />
                    </div>
                  </div>

                  <div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
                      placeholder="Correo electrónico *"
                    />
                  </div>

                  <div>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
                      placeholder="Teléfono (opcional)"
                    />
                  </div>

                  <div>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleChange}
                        required
                        minLength={6}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all pr-12"
                        placeholder="Contraseña *"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        minLength={6}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all pr-12"
                        placeholder="Confirmar contraseña *"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <ContextualLink
                      href="/auth/login"
                      className="flex-1 px-4 py-2.5 border-2 border-gray-900 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center text-sm"
                    >
                      Iniciar sesión
                    </ContextualLink>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-500 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 hover:text-gray-700 text-sm"
                    >
                      {loading ? 'Registrando...' : 'Crear Cuenta'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer Link */}
                <p className="mt-4 text-xs text-gray-600">
                  Usa los mismos datos de Agora Ecosystem Marketplace.
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
                    {/* Continuar con Apple */}
                  </button>

                  <button
                    type="button"
                    className="w-full px-4 py-2.5 border-2 border-gray-900 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                    disabled
                  >
                    -
                    {/* Continuar con Google */}
                  </button>

                  <button
                    type="button"
                    className="w-full px-4 py-2.5 border-2 border-gray-900 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                    disabled
                  >
                    -
                    {/* Continuar con Facebook */}
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
