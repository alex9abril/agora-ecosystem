import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { authService } from '@/lib/auth';
import agoraLogoBlack from '@/images/agora_logo_black.png';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');

    if (accessToken) {
      setToken(accessToken);
      localStorage.setItem('reset_token', accessToken);
    }
  }, []);

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
      await authService.updatePassword({
        token: token || localStorage.getItem('reset_token') || '',
        newPassword,
      });

      setSuccess(true);
      localStorage.removeItem('reset_token');

      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Restablecer Contraseña - AGORA Local</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-white via-slate-50/80 to-stone-100/60">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-100/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-stone-200/20 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl shadow-black/5 p-8">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <Image src={agoraLogoBlack} alt="AGORA" width={120} height={36} priority />
              </div>
              <span className="inline-block px-3 py-1 rounded-full text-[13px] font-light tracking-wide text-red-600 bg-red-50">
                AGORA Distribuidor
              </span>
              <p className="text-stone-800 font-medium mt-4 text-base leading-relaxed">
                Restablecer contraseña
              </p>
              <p className="text-stone-500 font-light mt-1 text-[13px]">
                Ingresa tu nueva contraseña
              </p>
            </div>

            {success ? (
              <div className="p-3 rounded-xl bg-emerald-50/80 text-emerald-800 text-sm font-light">
                <p className="text-[13px]">Contraseña actualizada exitosamente. Redirigiendo al inicio de sesión...</p>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                {error && (
                  <div className="p-3 rounded-xl bg-red-50/80 text-red-800/90 text-sm font-light">
                    <p className="text-[13px]">{error}</p>
                  </div>
                )}

                {!token && (
                  <div className="p-3 rounded-xl bg-amber-50/80 text-amber-800/90 text-sm font-light">
                    <p className="text-[13px]">No se detectó un token de recuperación válido. Verifica que hayas usado el enlace correcto del email.</p>
                  </div>
                )}

                <div>
                  <label htmlFor="newPassword" className="block text-[13px] font-light text-stone-500 mb-1.5">
                    Nueva Contraseña
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    className="w-full px-3 py-2.5 text-sm font-light bg-stone-50/90 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-300 transition-colors disabled:opacity-60"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-[13px] font-light text-stone-500 mb-1.5">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    className="w-full px-3 py-2.5 text-sm font-light bg-stone-50/90 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-300 transition-colors disabled:opacity-60"
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading || !token}
                    className="w-full py-2.5 px-4 bg-gray-900 text-white text-sm font-light rounded-xl hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                  </button>
                </div>

                <div className="text-center pt-2">
                  <Link
                    href="/auth/login"
                    className="text-[13px] font-light text-red-600 hover:text-red-700 focus:outline-none"
                  >
                    Volver al inicio de sesión
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
