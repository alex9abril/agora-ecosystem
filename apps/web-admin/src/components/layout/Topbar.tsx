import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import UserMenu from './UserMenu';

export default function Topbar() {
  const { user } = useAuth();

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
    <header className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Título de bienvenida */}
        <div className="flex items-center">
          <h1 className="text-sm font-normal text-gray-900">
            Hola {getUserName()}, bienvenido a tu Dashboard LOCALIA
          </h1>
        </div>

        {/* Menú de usuario */}
        <div className="flex items-center space-x-4">
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}

