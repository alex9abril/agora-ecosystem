import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useProfilePanel } from '@/contexts/ProfilePanelContext';
import { useTheme } from '@/contexts/ThemeContext';
import { businessService } from '@/lib/business';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';

interface UserMenuProps {
  user: any;
}

/** Icono: reloj con check (establecer estado) */
function IconStatus() {
  return (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

/** Icono: campana silenciada */
function IconMute() {
  return (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  );
}

/** Icono: engrane (configuración) */
function IconSettings() {
  return (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

/** Icono: luna (temas) */
function IconThemes() {
  return (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

/** Icono: personas (mi trabajo) */
function IconWork() {
  return (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

/** Icono: perfil (usuario) */
function IconProfile() {
  return (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

/** Icono: cerrar sesión */
function IconLogout() {
  return (
    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { signOut } = useAuth();
  const { openProfilePanel } = useProfilePanel();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [businessRole, setBusinessRole] = useState<string | null>(null);
  const { selectedBusiness } = useSelectedBusiness();

  useEffect(() => {
    const loadBusinessRole = async () => {
      if (user) {
        try {
          const businessId = selectedBusiness?.business_id;
          const business = await businessService.getMyBusiness(businessId);
          if (business?.user_role) setBusinessRole(business.user_role);
        } catch (error) {
          console.error('Error cargando rol del negocio:', error);
        }
      }
    };
    loadBusinessRole();
  }, [user, selectedBusiness?.business_id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    if (user?.email) return user.email.slice(0, 2).toUpperCase();
    return 'U';
  };

  /** Nombre para mostrar en el dropdown (solo nombre, ej. "Alejandro") */
  const getDisplayName = () => {
    const first = (user?.first_name || '').trim();
    if (first) return first;
    const last = (user?.last_name || '').trim();
    if (last) return last;
    if (user?.email && typeof user.email === 'string') return user.email.split('@')[0] || 'Usuario';
    return 'Usuario';
  };

  const navigate = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Botón reducido: solo avatar + indicador de estado */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
        aria-label="Menú de usuario"
      >
        <div className="w-9 h-9 rounded-full bg-black border-2 border-white flex items-center justify-center text-white text-sm font-medium shadow-sm">
          {getUserInitials()}
        </div>
        <span
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white"
          aria-hidden
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 z-50 py-3"
          role="menu"
          aria-label="Opciones de usuario"
        >
          {/* Cabecera: avatar + nombre + email */}
          <div className="flex flex-col items-center px-4 pb-3 border-b border-gray-200 dark:border-neutral-700">
            <div className="relative mb-2">
              <div className="w-14 h-14 rounded-full bg-black border-2 border-gray-100 dark:border-gray-600 flex items-center justify-center text-white text-lg font-medium">
                {getUserInitials()}
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white dark:border-neutral-800" />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{getDisplayName()}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-full px-2">{user?.email}</p>
          </div>

          {/* Opciones con iconos (español) */}
          <div className="py-1">
            <button
              type="button"
              className="flex items-center w-full gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700"
              onClick={() => {}}
            >
              <IconStatus /> Establecer estado
            </button>
            <button
              type="button"
              className="flex items-center w-full gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700"
              onClick={() => {}}
            >
              <IconMute /> Silenciar notificaciones
            </button>
            <button
              type="button"
              className="flex items-center w-full gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700"
              onClick={() => navigate('/settings')}
            >
              <IconSettings /> Configuración
            </button>
            <div className="relative">
              <button
                type="button"
                className="flex items-center w-full gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-neutral-700"
                onClick={() => setShowThemes((v) => !v)}
              >
                <IconThemes /> Temas
                <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                  {theme === 'dark' ? 'Obscuro' : 'Claro'}
                </span>
              </button>
              {showThemes && (
                <div className="pl-4 py-1 space-y-0.5 border-l-2 border-gray-200 dark:border-gray-600 ml-4 my-1">
                  <button
                    type="button"
                    className="flex items-center w-full gap-2 px-3 py-2 text-sm rounded-md text-left transition-colors text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-neutral-700"
                    onClick={() => { setTheme('light'); setShowThemes(false); }}
                  >
                    <span className="w-4 h-4 rounded-full border-2 border-gray-300 bg-white" />
                    Claro
                    {theme === 'light' && <span className="text-xs text-green-600 dark:text-green-400">✓</span>}
                  </button>
                  <button
                    type="button"
                    className="flex items-center w-full gap-2 px-3 py-2 text-sm rounded-md text-left transition-colors text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-neutral-700"
                    onClick={() => { setTheme('dark'); setShowThemes(false); }}
                  >
                    <span className="w-4 h-4 rounded-full border-2 border-gray-400 bg-gray-700" />
                    Obscuro
                    {theme === 'dark' && <span className="text-xs text-green-600 dark:text-green-400">✓</span>}
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              className="flex items-center w-full gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700"
              onClick={() => {}}
            >
              <IconWork /> Mi trabajo
            </button>
            <button
              type="button"
              className="flex items-center w-full gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700"
              onClick={() => {
                setIsOpen(false);
                openProfilePanel();
              }}
            >
              <IconProfile /> Perfil
            </button>
          </div>

          <div className="border-t border-gray-200 dark:border-neutral-700 my-1" />

          <div className="py-1">
            <button
              type="button"
              className="flex items-center w-full gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 font-medium"
              onClick={handleSignOut}
            >
              <IconLogout /> Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
