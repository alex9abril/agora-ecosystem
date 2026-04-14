import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import MobileLayout from '@/components/layout/MobileLayout';
import { useI18n } from '@/contexts/I18nContext';
import { authService } from '@/lib/auth';
import { getBrowserSupabase } from '@/lib/supabase-browser';

/** Si es "true", siempre se usa el backend (email con plantillas propias). */
function useApiOnlyPasswordReset(): boolean {
  return process.env.NEXT_PUBLIC_PASSWORD_RESET_USE_API === 'true';
}

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const redirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : undefined;

      if (!useApiOnlyPasswordReset()) {
        const supabase = getBrowserSupabase();
        if (supabase && redirectTo) {
          const { error: sbError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo,
          });
          if (sbError) {
            throw new Error(sbError.message);
          }
          setSuccess(true);
          return;
        }
      }

      await authService.requestPasswordReset({ email, redirectTo });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || t('auth.recoveryError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>{t('auth.recoverPassword')} - Localia</title>
      </Head>
      <MobileLayout showNavigation={false}>
        <div className="max-w-md mx-auto mt-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            {t('auth.recoverPassword')}
          </h1>
          <p className="text-sm text-gray-500 mb-6 text-center">
            {t('auth.recoverPasswordDesc')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {t('auth.recoverySent')}
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
                disabled={success}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-60"
                placeholder="tu@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 active:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? t('auth.sending') : success ? t('auth.emailSent') : t('auth.sendLink')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/auth/login"
              className="text-black hover:text-gray-700 text-sm font-medium"
            >
              {t('auth.backToLogin')}
            </Link>
          </div>
        </div>
      </MobileLayout>
    </>
  );
}
