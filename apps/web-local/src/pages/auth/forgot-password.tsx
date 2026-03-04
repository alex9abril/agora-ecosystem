import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { authService } from '@/lib/auth';
import agoraLogoBlack from '@/images/agora_logo_black.png';

export default function ForgotPasswordPage() {
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
      await authService.requestPasswordReset({ email });
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
        <title>Recuperar Contraseña - AGORA Local</title>
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
                Recuperar contraseña
              </p>
              <p className="text-stone-500 font-light mt-1 text-[13px]">
                Ingresa tu email para recibir un enlace de recuperación
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 rounded-xl bg-red-50/80 text-red-800/90 text-sm font-light">
                  <p className="text-[13px]">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 rounded-xl bg-emerald-50/80 text-emerald-800 text-sm font-light">
                  <p className="text-[13px]">Enlace enviado. Revisa tu correo para recuperar tu contraseña.</p>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-[13px] font-light text-stone-500 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-3 py-2.5 text-sm font-light bg-stone-50/90 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-300 transition-colors disabled:opacity-60"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={success}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || success}
                  className="w-full py-2.5 px-4 bg-gray-900 text-white text-sm font-light rounded-xl hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Enviando...' : success ? 'Email enviado' : 'Enviar enlace'}
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
          </div>
        </div>
      </div>
    </>
  );
}
