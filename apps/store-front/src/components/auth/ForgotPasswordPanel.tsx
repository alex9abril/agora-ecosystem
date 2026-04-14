import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { authService } from '@/lib/auth';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { passwordResetViaApiOnly, rememberRecoveryLoginHref } from '@/lib/password-recovery';

export interface ForgotPasswordPanelProps {
  /** URL absoluta del callback (debe estar en Redirect URLs de Supabase). */
  redirectTo: string;
  /** Ruta para volver al login (ej. /sucursal/foo/auth/login). */
  loginHref: string;
}

export default function ForgotPasswordPanel({ redirectTo, loginHref }: ForgotPasswordPanelProps) {
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
      rememberRecoveryLoginHref(loginHref);

      if (!passwordResetViaApiOnly()) {
        const supabase = getSupabaseBrowser();
        if (supabase) {
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
      setError(err.message || 'Error al solicitar recuperación de contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Recuperar contraseña - Agora</title>
      </Head>
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Recuperar contraseña</h1>
          <p className="text-sm text-gray-600 mb-6 text-center">
            Ingresa tu correo y te enviaremos un enlace para restablecerla.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                Si el correo existe, recibirás un enlace para restablecer tu contraseña.
              </div>
            )}

            <div>
              <label htmlFor="recovery-email" className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <input
                id="recovery-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={success}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-60"
                placeholder="tu@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {loading ? 'Enviando…' : success ? 'Enviado' : 'Enviar enlace'}
            </button>
          </form>

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
