/**
 * Página de login
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MobileLayout from '@/components/layout/MobileLayout';
import PasswordInput from '@/components/PasswordInput';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { t } = useI18n();
  const { signIn, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>{t('auth.login')} - Localia</title>
      </Head>
      <MobileLayout showNavigation={false}>
        <div className="max-w-md mx-auto mt-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {t('auth.login')}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              label={t('auth.password')}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 active:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? t('common.loading') : t('auth.signIn')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/auth/register"
              className="text-black hover:text-gray-700 text-sm font-medium"
            >
              {t('auth.noAccount')} {t('auth.register')}
            </Link>
          </div>
        </div>
      </MobileLayout>
    </>
  );
}

