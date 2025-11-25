import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { businessService } from '@/lib/business';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';

interface UserMenuProps {
  user: any;
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { signOut } = useAuth();
  const router = useRouter();
  const [businessRole, setBusinessRole] = useState<string | null>(null);

  // Obtener el rol del negocio del usuario
  const { selectedBusiness } = useSelectedBusiness();

  useEffect(() => {
    const loadBusinessRole = async () => {
      if (user) {
        try {
          // Usar la tienda seleccionada si está disponible
          const businessId = selectedBusiness?.business_id;
          const business = await businessService.getMyBusiness(businessId);
          if (business?.user_role) {
            setBusinessRole(business.user_role);
          }
        } catch (error) {
          console.error('Error cargando rol del negocio:', error);
        }
      }
    };

    loadBusinessRole();
  }, [user, selectedBusiness?.business_id]);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const getUserName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user?.email) {
      return user.email;
    }
    return 'Usuario';
  };

  const getBusinessRoleLabel = (role: string | null): string => {
    if (!role) return 'Sin rol';
    
    const roleLabels: Record<string, string> = {
      superadmin: 'Super Administrador',
      admin: 'Administrador',
      operations_staff: 'Operations Staff',
      kitchen_staff: 'Kitchen Staff',
    };
    
    return roleLabels[role] || role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium">
          {getUserInitials()}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-gray-900">{getUserName()}</div>
          <div className="text-xs text-gray-500">{businessRole ? getBusinessRoleLabel(businessRole) : 'Sin rol'}</div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
          <div className="px-4 py-2 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900">{getUserName()}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          
          <a
            href="#"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={(e) => {
              e.preventDefault();
              router.push('/profile');
              setIsOpen(false);
            }}
          >
            Mi Perfil
          </a>
          
          <a
            href="#"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={(e) => {
              e.preventDefault();
              router.push('/settings');
              setIsOpen(false);
            }}
          >
            Configuración
          </a>
          
          <div className="border-t border-gray-200 my-1"></div>
          
          <button
            onClick={handleSignOut}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
          >
            Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  );
}

