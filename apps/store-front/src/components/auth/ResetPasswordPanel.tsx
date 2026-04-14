import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { authService } from '@/lib/auth';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { clearRecoveryLoginHref } from '@/lib/password-recovery';

type RecoveryMode = 'pending' | 'supabase' | 'api' | 'none';

export interface ResetPasswordPanelProps {
  /** Ruta del login tras éxito (contextual o global). */
  loginHref: string;
}

export default function ResetPasswordPanel({ loginHref }: ResetPasswordPanelProps) {
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
      const supabase = getSupabaseBrowser();

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
      setError('Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabaseBrowser();

      if (recoveryMode === 'supabase' && supabase) {
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        if (updateError) {
          throw new Error(updateError.message);
        }
        await supabase.auth.signOut();
      } else {
        const token =
          apiAccessToken || (typeof window !== 'undefined' ? localStorage.getItem('reset_token') : null) || '';
        if (!token) {
          throw new Error('No se detectó un enlace de recuperación válido. Solicita uno nuevo.');
        }
        await authService.updatePassword({ token, newPassword });
      }

      setSuccess(true);
      try {
        localStorage.removeItem('reset_token');
      } catch {
        /* ignore */
      }
      clearRecoveryLoginHref();

      setTimeout(() => {
        router.push(loginHref);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = recoveryMode === 'supabase' || recoveryMode === 'api';
  const showWaiting = recoveryMode === 'pending';

  return (
    <>
      <Head>
        <title>Restablecer contraseña - Agora</title>
      </Head>
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Nueva contraseña</h1>
          <p className="text-sm text-gray-600 mb-6 text-center">Elige una contraseña segura para tu cuenta.</p>

          {showWaiting && (
            <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded-lg text-sm mb-4">
              Verificando tu enlace de recuperación…
            </div>
          )}

          {success ? (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              Contraseña actualizada. Redirigiendo al inicio de sesión…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

              {!showWaiting && recoveryMode === 'none' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
                  No se detectó un enlace válido. Abre el enlace del correo o solicita uno nuevo desde recuperar
                  contraseña.
                </div>
              )}

              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva contraseña
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar contraseña
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="w-full py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {loading ? 'Guardando…' : 'Actualizar contraseña'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href={loginHref} className="text-sm text-gray-900 font-medium hover:underline">
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
