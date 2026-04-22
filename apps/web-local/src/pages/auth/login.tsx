import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  getRememberedAccounts,
  addOrUpdateRememberedAccount,
  removeRememberedAccount,
  type RememberedAccount,
} from '@/lib/remembered-accounts';
import agoraLogoBlack from '@/images/agora_logo_black.png';

function getInitial(email: string, fullName?: string): string {
  if (fullName && fullName.trim()) {
    return fullName.trim().charAt(0).toUpperCase();
  }
  return (email || '').trim().charAt(0).toUpperCase() || '?';
}

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberedAccounts, setRememberedAccounts] = useState<RememberedAccount[]>([]);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const sessionExpired = router.query.expired === 'true';

  useEffect(() => {
    setRememberedAccounts(getRememberedAccounts());
  }, []);

  if (isAuthenticated) {
    router.push('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await signIn(email, password);
      if (response?.user) {
        const profile = response.user?.profile;
        const fullName =
          profile?.first_name || profile?.last_name
            ? [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
            : undefined;
        addOrUpdateRememberedAccount(email, fullName);
        setRememberedAccounts(getRememberedAccounts());
      }
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas. Revisa tu correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRemembered = (account: RememberedAccount) => {
    setEmail(account.email);
    setPassword('');
    setError('');
    setTimeout(() => passwordInputRef.current?.focus(), 0);
  };

  const handleForget = (e: React.MouseEvent, accountEmail: string) => {
    e.stopPropagation();
    removeRememberedAccount(accountEmail);
    setRememberedAccounts(getRememberedAccounts());
    if (email.trim().toLowerCase() === accountEmail.trim().toLowerCase()) {
      setEmail('');
      setPassword('');
      setError('');
    }
  };

  return (
    <>
      <Head>
        <title>Iniciar Sesión - AGORA Local</title>
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
                <img
                  src={agoraLogoBlack.src}
                  alt="AGORA"
                  width={120}
                  height={36}
                  className="h-9 w-auto mx-auto"
                />
              </div>
              <span className="inline-block px-3 py-1 rounded-full text-[13px] font-light tracking-wide text-red-600 bg-red-50">
                AGORA Distribuidor
              </span>
              <p className="text-stone-800 font-medium mt-4 text-base leading-relaxed">
                Bienvenido. Inicia sesión para continuar.
              </p>
            </div>

            {sessionExpired && (
              <div className="mb-5 p-3 rounded-xl bg-amber-50/80 text-amber-800 text-sm font-light">
                <p>Sesión expirada. Inicia sesión nuevamente para continuar.</p>
              </div>
            )}

            {rememberedAccounts.length > 0 && (
              <div className="mb-5">
                <p className="text-[11px] font-light text-stone-400 uppercase tracking-widest mb-3">
                  Cuentas recientes
                </p>
                <ul className="space-y-2">
                  {rememberedAccounts.map((account) => (
                    <li
                      key={account.email}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectRemembered(account)}
                      onKeyDown={(e) =>
                        (e.key === 'Enter' || e.key === ' ') && handleSelectRemembered(account)
                      }
                      className="flex items-center gap-3 p-3 rounded-xl bg-stone-50/80 hover:bg-stone-100/80 transition-colors cursor-pointer"
                    >
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-stone-200/60 text-stone-600 font-light flex items-center justify-center text-[13px]">
                        {getInitial(account.email, account.fullName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-stone-800 font-light text-sm truncate">
                          {account.fullName || 'Cuenta recordada'}
                        </p>
                        <p className="text-[13px] text-stone-500 truncate">{account.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleForget(e, account.email)}
                        className="flex-shrink-0 text-[13px] font-light text-stone-400 hover:text-stone-600 focus:outline-none"
                      >
                        Olvidar
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-px bg-stone-200/80" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-2 text-[11px] font-light text-stone-400">O</span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-3 py-2.5 text-sm font-light bg-stone-50/90 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-300 transition-colors"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="relative">
                <input
                  ref={passwordInputRef}
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="w-full px-3 py-2.5 pr-10 text-sm font-light bg-stone-50/90 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-300 transition-colors"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50/80 text-red-800/90 text-sm font-light">
                  <p className="text-[13px]">Revisa estos puntos:</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-[13px]">
                    <li>{error}</li>
                  </ul>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-gray-900 text-white text-sm font-light rounded-xl hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[13px] font-light text-stone-500">
                <Link href="/auth/forgot-password" className="text-red-600 hover:text-red-700 focus:outline-none">
                  ¿Olvidaste tu contraseña?
                </Link>
                <span className="text-stone-300 hidden sm:inline">·</span>
                <span>
                  ¿No tienes cuenta?{' '}
                  <Link href="/auth/register" className="text-red-600 hover:text-red-700 focus:outline-none">
                    Regístrate
                  </Link>
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
