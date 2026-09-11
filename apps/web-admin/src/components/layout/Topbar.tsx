import { useAuth } from '@/contexts/AuthContext';
import UserMenu from './UserMenu';
import NotificationsDropdown from './NotificationsDropdown';
import { useLayoutShell } from './layout-shell';

export default function Topbar() {
  const { user } = useAuth();
  const { setLeftOpen, setRightOpen } = useLayoutShell();

  const getUserName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user?.email) {
      return user.email;
    }
    return 'Usuario';
  };

  return (
    <header className="bg-white border-b border-gray-200 shrink-0">
      <div className="flex items-center justify-between gap-2 h-14 md:h-16 px-3 md:px-6">
        <div className="flex items-center min-w-0 gap-2">
          <button
            type="button"
            className="lg:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
            onClick={() => setLeftOpen(true)}
            aria-label="Abrir menú"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-xs md:text-sm font-normal text-gray-900 truncate">
            <span className="sm:hidden">Hola {getUserName()}</span>
            <span className="hidden sm:inline">Hola {getUserName()}, bienvenido a tu Dashboard LOCALIA</span>
          </h1>
        </div>

        <div className="flex items-center space-x-1 md:space-x-4 shrink-0">
          <button
            type="button"
            className="xl:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
            onClick={() => setRightOpen(true)}
            aria-label="Abrir estadísticas"
            title="Estadísticas"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </button>
          <NotificationsDropdown />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
