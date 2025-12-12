/**
 * Página de registro mejorada con campos de Business Group
 * Diseño profesional con identidad Agora
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import { useAuth } from '@/contexts/AuthContext';
import ContextualLink from '@/components/ContextualLink';
import { apiRequest } from '@/lib/api';

interface BusinessGroupData {
  name: string;
  legal_name?: string;
  description?: string;
  tax_id?: string;
  website_url?: string;
  logo_url?: string;
}

export default function RegisterPage() {
  const { signUp, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Estados del formulario
  const [step, setStep] = useState<'personal' | 'business'>('personal');
  const [formData, setFormData] = useState({
    // Datos personales
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    // Datos del grupo empresarial
    businessName: '',
    legalName: '',
    businessDescription: '',
    taxId: '',
    websiteUrl: '',
    logoUrl: '',
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [creatingBusinessGroup, setCreatingBusinessGroup] = useState(false);

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

  const validateBusinessData = () => {
    if (!formData.businessName.trim()) {
      setError('El nombre del grupo empresarial es requerido');
      return false;
    }
    return true;
  };

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validatePersonalData()) {
      return;
    }

    setStep('business');
  };

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateBusinessData()) {
      return;
    }

    setLoading(true);
    setCreatingBusinessGroup(false);

    try {
      // 1. Registrar usuario
      const authResponse = await signUp({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        phone: formData.phone || undefined,
        role: 'local', // Cambiar a 'local' para permitir crear business groups
      });

      // 2. Crear business group si hay token
      if (authResponse.accessToken && formData.businessName) {
        setCreatingBusinessGroup(true);
        
        const businessGroupData: BusinessGroupData = {
          name: formData.businessName,
          legal_name: formData.legalName || undefined,
          description: formData.businessDescription || undefined,
          tax_id: formData.taxId || undefined,
          website_url: formData.websiteUrl || undefined,
          logo_url: formData.logoUrl || undefined,
        };

        try {
          await apiRequest('/businesses/business-groups', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authResponse.accessToken}`,
            },
            body: JSON.stringify(businessGroupData),
          });
        } catch (businessError: any) {
          console.error('Error creando grupo empresarial:', businessError);
          // Continuar aunque falle la creación del grupo, el usuario ya está registrado
        }
      }

      // 3. Redirigir manteniendo el contexto de tienda si existe
      const currentPath = router.asPath.split('?')[0];
      const contextMatch = currentPath.match(/^\/(grupo|sucursal|brand)\/([^/]+)/);
      if (contextMatch) {
        router.push(`/${contextMatch[1]}/${contextMatch[2]}`);
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Error al registrar usuario');
    } finally {
      setLoading(false);
      setCreatingBusinessGroup(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <>
      <Head>
        <title>Registro - Agora</title>
      </Head>
      <StoreLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Crear Cuenta
              </h1>
              <p className="text-gray-600">
                Regístrate en Agora y comienza a gestionar tu negocio
              </p>
            </div>

            {/* Progress Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-center">
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    step === 'personal' 
                      ? 'bg-toyota-red border-toyota-red text-white' 
                      : 'bg-white border-toyota-red text-toyota-red'
                  }`}>
                    <span className="font-semibold">1</span>
                  </div>
                  <div className={`w-24 h-1 ${step === 'business' ? 'bg-toyota-red' : 'bg-gray-300'}`}></div>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    step === 'business' 
                      ? 'bg-toyota-red border-toyota-red text-white' 
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    <span className="font-semibold">2</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-600">
                <span className={step === 'personal' ? 'font-semibold text-toyota-red' : ''}>
                  Datos Personales
                </span>
                <span className={step === 'business' ? 'font-semibold text-toyota-red' : ''}>
                  Información Empresarial
                </span>
              </div>
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

              {step === 'personal' ? (
                <form onSubmit={handlePersonalSubmit} className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-semibold text-gray-900">Información Personal</h2>
                    <p className="text-sm text-gray-600">Completa tus datos de contacto</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-toyota-red focus:border-transparent transition-all"
                        placeholder="Juan"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                        Apellido
                      </label>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-toyota-red focus:border-transparent transition-all"
                        placeholder="Pérez"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-toyota-red focus:border-transparent transition-all"
                      placeholder="tu@email.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono <span className="text-gray-400 text-xs">(opcional)</span>
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-toyota-red focus:border-transparent transition-all"
                      placeholder="+525512345678"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Contraseña <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleChange}
                        required
                        minLength={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-toyota-red focus:border-transparent transition-all pr-12"
                        placeholder="Mínimo 6 caracteres"
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
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirmar Contraseña <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-toyota-red focus:border-transparent transition-all"
                      placeholder="Confirma tu contraseña"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-all font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    Continuar
                  </button>
                </form>
              ) : (
                <form onSubmit={handleBusinessSubmit} className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-semibold text-gray-900">Información Empresarial</h2>
                    <p className="text-sm text-gray-600">Datos de tu grupo empresarial</p>
                  </div>

                  <div>
                    <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Grupo Empresarial <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="businessName"
                      name="businessName"
                      type="text"
                      value={formData.businessName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-toyota-red focus:border-transparent transition-all"
                      placeholder="Ej: Grupo Andrade, AutoParts México"
                    />
                    <p className="mt-1 text-xs text-gray-500">Nombre comercial de tu grupo empresarial</p>
                  </div>

                  <div>
                    <label htmlFor="legalName" className="block text-sm font-medium text-gray-700 mb-2">
                      Razón Social <span className="text-gray-400 text-xs">(opcional)</span>
                    </label>
                    <input
                      id="legalName"
                      name="legalName"
                      type="text"
                      value={formData.legalName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-toyota-red focus:border-transparent transition-all"
                      placeholder="Ej: Grupo Andrade S.A. de C.V."
                    />
                  </div>

                  <div>
                    <label htmlFor="businessDescription" className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción <span className="text-gray-400 text-xs">(opcional)</span>
                    </label>
                    <textarea
                      id="businessDescription"
                      name="businessDescription"
                      value={formData.businessDescription}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-toyota-red focus:border-transparent transition-all resize-none"
                      placeholder="Describe brevemente tu negocio..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-2">
                        RFC / Tax ID <span className="text-gray-400 text-xs">(opcional)</span>
                      </label>
                      <input
                        id="taxId"
                        name="taxId"
                        type="text"
                        value={formData.taxId}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-toyota-red focus:border-transparent transition-all"
                        placeholder="Ej: GAN990101ABC"
                      />
                    </div>
                    <div>
                      <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 mb-2">
                        Sitio Web <span className="text-gray-400 text-xs">(opcional)</span>
                      </label>
                      <input
                        id="websiteUrl"
                        name="websiteUrl"
                        type="url"
                        value={formData.websiteUrl}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-toyota-red focus:border-transparent transition-all"
                        placeholder="https://ejemplo.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-2">
                      URL del Logo <span className="text-gray-400 text-xs">(opcional)</span>
                    </label>
                    <input
                      id="logoUrl"
                      name="logoUrl"
                      type="url"
                      value={formData.logoUrl}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-toyota-red focus:border-transparent transition-all"
                      placeholder="https://ejemplo.com/logo.png"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep('personal')}
                      className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold"
                    >
                      Atrás
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3.5 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-all font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {loading ? (
                        creatingBusinessGroup ? (
                          'Creando grupo empresarial...'
                        ) : (
                          'Registrando...'
                        )
                      ) : (
                        'Registrarse'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer Link */}
            <div className="mt-8 text-center">
              <ContextualLink
                href="/auth/login"
                className="text-gray-600 hover:text-toyota-red transition-colors text-sm font-medium"
              >
                ¿Ya tienes cuenta? <span className="font-semibold">Inicia sesión</span>
              </ContextualLink>
            </div>
          </div>
        </div>
      </StoreLayout>
    </>
  );
}
