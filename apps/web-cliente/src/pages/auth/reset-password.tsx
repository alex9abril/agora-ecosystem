import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import MobileLayout from '@/components/layout/MobileLayout';
import PasswordInput from '@/components/PasswordInput';
import { useI18n } from '@/contexts/I18nContext';
import { authService } from '@/lib/auth';
import { getBrowserSupabase } from '@/lib/supabase-browser';

type RecoveryMode = 'pending' | 'supabase' | 'api' | 'none';

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [recoveryMode, setRecoveryMode] = useState<RecoveryMode>('pending');
  const [apiAccessToken, setApiAccessToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const stripRecoveryFromUrl = useCallback(() => {
    if (typeof window === 'undefined') return;
    const u = new URL(window.location.href);
    u.hash = '';
    u.searchParams.delete('code');
    const qs = u.searchParams.toString();
    const clean = u.pathname + (qs ? `?${qs}` : '');
    window.history.replaceState(null, '', clean);
  }, []);

  useEffect(() => {
    if (!router.isReady || typeof window === 'undefined') return;

    let cancelled = false;

    async function establishRecoverySession() {
      const supabase = getBrowserSupabase();

      const code = typeof router.query.code === 'string' ? router.query.code : null;
      if (code && supabase) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (!exchangeError) {
          setRecoveryMode('supabase');
          stripRecoveryFromUrl();
          return;
        }
      }

      const hash = window.location.hash?.replace(/^#/, '') ?? '';
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken && supabase) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (cancelled) return;
        if (!sessionError) {
          setRecoveryMode('supabase');
          stripRecoveryFromUrl();
          return;
        }
      }

      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          setRecoveryMode('supabase');
          return;
        }
      }

      if (accessToken) {
        if (cancelled) return;
        setApiAccessToken(accessToken);
        try {
          localStorage.setItem('reset_token', accessToken);
        } catch {
          /* ignore */
        }
        setRecoveryMode('api');
        stripRecoveryFromUrl();
        return;
      }

      const stored = localStorage.getItem('reset_token');
      if (stored) {
        if (cancelled) return;
        setApiAccessToken(stored);
        setRecoveryMode('api');
        return;
      }

      if (cancelled) return;
      setRecoveryMode('none');
    }

    establishRecoverySession();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.query.code, stripRecoveryFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    setLoading(true);

    try {
      const supabase = getBrowserSupabase();

      if (recoveryMode === 'supabase' && supabase) {
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        if (updateError) {
          throw new Error(updateError.message);
        }
        await supabase.auth.signOut();
      } else {
        const token = apiAccessToken || (typeof window !== 'undefined' ? localStorage.getItem('reset_token') : null) || '';
        if (!token) {
          throw new Error(t('auth.noTokenDetected'));
        }
        await authService.updatePassword({ token, newPassword });
      }

      setSuccess(true);
      try {
        localStorage.removeItem('reset_token');
      } catch {
        /* ignore */
      }

      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || t('auth.passwordUpdateError'));
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = recoveryMode === 'supabase' || recoveryMode === 'api';
  const showWaiting = recoveryMode === 'pending';

  return (
    <>
      <Head>
        <title>{t('auth.resetPassword')} - Localia</title>
      </Head>
      <MobileLayout showNavigation={false}>
        <div className="max-w-md mx-auto mt-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            {t('auth.resetPassword')}
          </h1>
          <p className="text-sm text-gray-500 mb-6 text-center">
            {t('auth.resetPasswordDesc')}
          </p>

          {showWaiting && (
            <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded-lg text-sm mb-4">
              {t('auth.verifyingRecoveryLink')}
            </div>
          )}

          {success ? (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {t('auth.passwordUpdated')}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {!showWaiting && recoveryMode === 'none' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
                  {t('auth.noTokenDetected')}
                </div>
              )}

              <PasswordInput
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                label={t('auth.newPassword')}
              />

              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                label={t('auth.confirmNewPassword')}
              />

              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 active:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? t('auth.updating') : t('auth.updatePassword')}
              </button>
            </form>
          )}

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
