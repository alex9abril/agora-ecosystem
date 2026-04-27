import { useAuth } from '@/contexts/AuthContext';
import UserMenu from './UserMenu';
import NotificationsDropdown from './NotificationsDropdown';
import BranchDropdown from './BranchDropdown';

export default function Topbar() {
  const { user } = useAuth();

  return (
    <header className="relative z-[205] bg-white dark:bg-neutral-800">
      <div className="flex items-center justify-end h-16 px-6">
        <div className="flex items-center space-x-4">
          <BranchDropdown />
          <NotificationsDropdown />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}

