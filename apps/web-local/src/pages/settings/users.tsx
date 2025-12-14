import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect } from 'react';
import { usersService, BusinessUser, User, BusinessRole } from '@/lib/users';
import { businessService } from '@/lib/business';

interface Business {
  business_id: string;
  business_name: string;
  business_email: string;
  business_phone: string;
  business_address?: string;
  is_active: boolean;
  total_users: number;
  created_at: string;
}

interface UserWithBusinesses extends BusinessUser {
  business_name?: string;
  businesses?: Array<{
    business_id: string;
    business_name: string;
    role: BusinessRole;
    is_active: boolean;
  }>;
}

export default function UsersSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [users, setUsers] = useState<UserWithBusinesses[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBusinessFilter, setSelectedBusinessFilter] = useState<string>('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<BusinessRole>('operations_staff');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form data para crear usuario
  const [createUserData, setCreateUserData] = useState({
    email: '',
    password: 'Localia1*',
    confirmPassword: 'Localia1*',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'operations_staff' as BusinessRole,
    businessIds: [] as string[],
  });
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Verificar primero si el usuario es superadmin
        const business = await businessService.getMyBusiness();
        if (!business || business.user_role !== 'superadmin') {
          console.log('[UsersSettings] Usuario no es superadmin, redirigiendo...');
          router.push('/');
          return;
        }

        // Cargar todas las tiendas del superadmin
        const superadminBusinesses = await usersService.getSuperadminBusinesses();
        console.log('Tiendas cargadas:', superadminBusinesses);
        setBusinesses(superadminBusinesses);

        // Si hay tiendas, seleccionar la primera por defecto
        if (superadminBusinesses.length > 0 && selectedBusinessFilter === 'all') {
          // Mantener 'all' para mostrar todas
        }

        // Cargar usuarios de la cuenta del superadmin (todas sus tiendas)
        const accountUsers = await usersService.getSuperadminAccountUsers();
        
        // Agrupar usuarios por user_id para mostrar todas sus tiendas
        const usersMap = new Map<string, UserWithBusinesses>();
        
        accountUsers.forEach((u: any) => {
          const userId = u.user_id;
          if (!usersMap.has(userId)) {
            usersMap.set(userId, {
              id: u.user_id,
              user_id: u.user_id,
              user_email: u.user_email,
              first_name: u.first_name,
              last_name: u.last_name,
              role: u.role, // Rol principal (el más alto)
              is_active: u.is_active,
              created_at: u.created_at,
              business_id: u.business_id,
              permissions: u.permissions || {},
              updated_at: u.updated_at || u.created_at,
              businesses: [],
            });
          }
          
          const user = usersMap.get(userId)!;
          if (user.businesses) {
            user.businesses.push({
              business_id: u.business_id,
              business_name: u.business_name,
              role: u.role,
              is_active: u.is_active,
            });
          }
        });

        // Convertir map a array y ordenar
        const formattedUsers = Array.from(usersMap.values()).sort((a, b) => {
          const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.user_email || '';
          const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim() || b.user_email || '';
          return nameA.localeCompare(nameB);
        });

        setUsers(formattedUsers);

        // Cargar usuarios disponibles para la cuenta del superadmin
        const available = await usersService.getAvailableUsersForSuperadminAccount();
        setAvailableUsers(available);
      } catch (err: any) {
        console.error('Error cargando usuarios:', err);
        setError('Error al cargar los usuarios');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSearch = async () => {
    try {
      const results = await usersService.getAvailableUsersForSuperadminAccount(searchTerm);
      setAvailableUsers(results);
    } catch (err: any) {
      console.error('Error buscando usuarios:', err);
      setError('Error al buscar usuarios');
    }
  };

  const handleAssignUser = async () => {
    if (!selectedUser || selectedBusinesses.length === 0) {
      setError('Selecciona al menos una tienda');
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      // Asignar usuario a cada tienda seleccionada
      const assignments = await Promise.all(
        selectedBusinesses.map((businessId) =>
          usersService.assignUserToBusiness(businessId, {
            user_id: selectedUser.id,
            role: selectedRole,
          })
        )
      );

      setSuccess(`Usuario asignado exitosamente a ${assignments.length} tienda(s)`);

      // Recargar datos
      await reloadData();

      // Cerrar modal
      setShowAssignModal(false);
      setSelectedUser(null);
      setSelectedBusinesses([]);
      setSelectedRole('operations_staff');
    } catch (err: any) {
      console.error('Error asignando usuario:', err);
      setError(err.message || 'Error al asignar usuario');
    }
  };

  const reloadData = async () => {
    try {
      // Recargar usuarios de la cuenta
      const accountUsers = await usersService.getSuperadminAccountUsers();
      
      // Agrupar usuarios por user_id
      const usersMap = new Map<string, UserWithBusinesses>();
      
      accountUsers.forEach((u: any) => {
        const userId = u.user_id;
        if (!usersMap.has(userId)) {
          usersMap.set(userId, {
            id: u.user_id,
            user_id: u.user_id,
            user_email: u.user_email,
            first_name: u.first_name,
            last_name: u.last_name,
            role: u.role,
            is_active: u.is_active,
            created_at: u.created_at,
            business_id: u.business_id,
            permissions: u.permissions || {},
            updated_at: u.updated_at || u.created_at,
            businesses: [],
          });
        }
        
        const user = usersMap.get(userId)!;
        if (user.businesses) {
          user.businesses.push({
            business_id: u.business_id,
            business_name: u.business_name,
            role: u.role,
            is_active: u.is_active,
          });
        }
      });

      const formattedUsers = Array.from(usersMap.values()).sort((a, b) => {
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.user_email || '';
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim() || b.user_email || '';
        return nameA.localeCompare(nameB);
      });

      setUsers(formattedUsers);

      // Recargar usuarios disponibles
      const available = await usersService.getAvailableUsersForSuperadminAccount();
      setAvailableUsers(available);
    } catch (err: any) {
      console.error('Error recargando datos:', err);
    }
  };

  const handleRemoveUser = async (userId: string, businessId?: string) => {
    const message = businessId
      ? '¿Estás seguro de que deseas remover este usuario de esta tienda?'
      : '¿Estás seguro de que deseas remover este usuario de todas tus tiendas?';
    
    if (!confirm(message)) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      if (businessId) {
        // Remover de una tienda específica
        await usersService.removeUserFromBusiness(businessId, userId);
        setSuccess('Usuario removido de la tienda exitosamente');
      } else {
        // Remover de todas las tiendas
        await usersService.removeUserFromSuperadminAccount(userId);
        setSuccess('Usuario removido de todas las tiendas exitosamente');
      }

      // Recargar datos
      await reloadData();
    } catch (err: any) {
      console.error('Error removiendo usuario:', err);
      setError(err.message || 'Error al remover usuario');
    }
  };

  const handleChangeRole = async (businessId: string, userId: string, newRole: BusinessRole) => {
    try {
      setError(null);
      setSuccess(null);

      await usersService.changeUserRole(businessId, userId, {
        role: newRole,
      });

      setSuccess('Rol actualizado exitosamente');

      // Recargar datos
      await reloadData();
    } catch (err: any) {
      console.error('Error cambiando rol:', err);
      setError(err.message || 'Error al cambiar rol');
    }
  };

  const getRoleLabel = (role: BusinessRole): string => {
    const labels: Record<BusinessRole, string> = {
      superadmin: 'Super Administrador',
      admin: 'Administrador',
      operations_staff: 'Operations Staff',
      kitchen_staff: 'Kitchen Staff',
    };
    return labels[role];
  };

  const getRoleColor = (role: BusinessRole): string => {
    const colors: Record<BusinessRole, string> = {
      superadmin: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      operations_staff: 'bg-green-100 text-green-800',
      kitchen_staff: 'bg-orange-100 text-orange-800',
    };
    return colors[role];
  };

  // Filtrar usuarios según el filtro de tienda
  const filteredUsers = users.filter((user) => {
    if (selectedBusinessFilter === 'all') return true;
    return user.businesses?.some((b) => b.business_id === selectedBusinessFilter);
  });

  if (loading) {
    return (
      <LocalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </LocalLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Usuarios y Permisos - LOCALIA Local</title>
      </Head>
      <LocalLayout>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver a Configuración
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Usuarios y Permisos</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Administra a tus empleados y sus permisos de acceso
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Crear Usuario
                </button>
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Asignar Usuario Existente
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filtrar por Tienda
                </label>
                <select
                  value={selectedBusinessFilter}
                  onChange={(e) => setSelectedBusinessFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">Todas las tiendas</option>
                  {businesses.map((business) => (
                    <option key={business.business_id} value={business.business_id}>
                      {business.business_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Current Users */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Miembros del Personal</h2>
              <span className="text-sm text-gray-500">
                {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay usuarios asignados</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Asigna usuarios a tus tiendas para comenzar a gestionar tu equipo.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div
                    key={user.user_id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {user.first_name || user.last_name
                                ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                : 'Sin nombre'}
                            </h3>
                            <p className="text-sm text-gray-500">{user.user_email}</p>
                          </div>
                        </div>

                        {/* Tiendas y Roles */}
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Tiendas y Roles:</h4>
                          <div className="space-y-2">
                            {user.businesses && user.businesses.length > 0 ? (
                              user.businesses
                                .filter((b) => 
                                  selectedBusinessFilter === 'all' || b.business_id === selectedBusinessFilter
                                )
                                .map((business) => (
                                  <div
                                    key={business.business_id}
                                    className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">
                                          {business.business_name}
                                        </p>
                                        <span
                                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getRoleColor(
                                            business.role
                                          )}`}
                                        >
                                          {getRoleLabel(business.role)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={business.role}
                                        onChange={(e) =>
                                          handleChangeRole(
                                            business.business_id,
                                            user.user_id,
                                            e.target.value as BusinessRole
                                          )
                                        }
                                        disabled={business.role === 'superadmin'}
                                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <option value="admin">Administrador</option>
                                        <option value="operations_staff">Operations Staff</option>
                                        <option value="kitchen_staff">Kitchen Staff</option>
                                      </select>
                                      <button
                                        onClick={() => handleRemoveUser(user.user_id, business.business_id)}
                                        disabled={business.role === 'superadmin'}
                                        className="text-red-600 hover:text-red-900 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Remover
                                      </button>
                                    </div>
                                  </div>
                                ))
                            ) : (
                              <p className="text-sm text-gray-500">No asignado a ninguna tienda</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assign User Modal */}
          {showAssignModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Asignar Usuario</h2>

                  {/* Search */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buscar Usuario
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Buscar por email, nombre o teléfono..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <button
                        onClick={handleSearch}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        Buscar
                      </button>
                    </div>
                  </div>

                  {/* Available Users List */}
                  <div className="mb-4 max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                    {availableUsers.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No se encontraron usuarios</p>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {availableUsers.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => setSelectedUser(user)}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${
                              selectedUser?.id === user.id ? 'bg-indigo-50' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {user.first_name || user.last_name
                                    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                    : 'Sin nombre'}
                                </p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                              {(user as any).is_already_assigned && (
                                <div className="text-xs text-gray-500 mt-1">
                                  <div>Ya asignado</div>
                                  {(user as any).assigned_businesses && (user as any).assigned_businesses.length > 0 && (
                                    <div className="mt-1">
                                      {(user as any).assigned_businesses.map((business: string, idx: number) => (
                                        <span key={idx} className="inline-block mr-2">
                                          {business} ({getRoleLabel((user as any).assigned_roles?.[idx] || 'operations_staff')})
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Business Selection */}
                  {selectedUser && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seleccionar Tienda(s)
                      </label>
                      <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                        {businesses.length === 0 ? (
                          <p className="text-sm text-gray-500">No hay tiendas disponibles</p>
                        ) : (
                          businesses.map((business) => (
                            <label
                              key={business.business_id}
                              className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedBusinesses.includes(business.business_id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedBusinesses([...selectedBusinesses, business.business_id]);
                                  } else {
                                    setSelectedBusinesses(
                                      selectedBusinesses.filter((id) => id !== business.business_id)
                                    );
                                  }
                                }}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{business.business_name}</p>
                                <p className="text-xs text-gray-500">{business.business_address || 'Sin dirección'}</p>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Role Selection */}
                  {selectedUser && selectedBusinesses.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rol para las tiendas seleccionadas
                      </label>
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as BusinessRole)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="admin">Administrador</option>
                        <option value="operations_staff">Operations Staff</option>
                        <option value="kitchen_staff">Kitchen Staff</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Este rol se aplicará a todas las tiendas seleccionadas
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowAssignModal(false);
                        setSelectedUser(null);
                        setSelectedBusinesses([]);
                        setSearchTerm('');
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAssignUser}
                      disabled={!selectedUser || selectedBusinesses.length === 0}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Asignar a {selectedBusinesses.length} tienda{selectedBusinesses.length !== 1 ? 's' : ''}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Create User Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Crear Nuevo Usuario</h2>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setError(null);
                      setSuccess(null);

                      // Validaciones
                      if (createUserData.password !== createUserData.confirmPassword) {
                        setError('Las contraseñas no coinciden');
                        return;
                      }

                      if (createUserData.password.length < 6) {
                        setError('La contraseña debe tener al menos 6 caracteres');
                        return;
                      }

                      if (!createUserData.email) {
                        setError('El email es requerido');
                        return;
                      }

                      if (emailError || !emailValid) {
                        setError('Por favor, verifica que el email sea válido y no esté registrado');
                        return;
                      }

                      setIsCreatingUser(true);
                      setError(null);
                      setSuccess(null);

                      try {
                        const result = await usersService.createUserForSuperadminAccount({
                          email: createUserData.email,
                          password: createUserData.password,
                          firstName: createUserData.firstName || undefined,
                          lastName: createUserData.lastName || undefined,
                          phone: createUserData.phone || undefined,
                          role: createUserData.role,
                          businessIds: createUserData.businessIds.length > 0 ? createUserData.businessIds : undefined,
                        });

                        setSuccess(result.message || 'Usuario creado exitosamente');

                        // Recargar datos
                        await reloadData();

                        // Cerrar modal y resetear formulario
                        setShowCreateModal(false);
                        setCreateUserData({
                          email: '',
                          password: 'Localia1*',
                          confirmPassword: 'Localia1*',
                          firstName: '',
                          lastName: '',
                          phone: '',
                          role: 'operations_staff',
                          businessIds: [],
                        });
                        setEmailError(null);
                        setEmailValid(false);
                        setShowPassword(false);
                        setShowConfirmPassword(false);
                      } catch (err: any) {
                        console.error('Error creando usuario:', err);
                        setError(err.message || 'Error al crear usuario');
                      } finally {
                        setIsCreatingUser(false);
                      }
                    }}
                  >
                    {/* Email */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={createUserData.email}
                        onChange={(e) => {
                          setCreateUserData({ ...createUserData, email: e.target.value });
                          setEmailError(null);
                          setEmailValid(false);
                        }}
                        onBlur={async () => {
                          const email = createUserData.email.trim();
                          if (!email) {
                            setEmailError(null);
                            setEmailValid(false);
                            return;
                          }

                          // Validar formato de email básico
                          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                          if (!emailRegex.test(email)) {
                            setEmailError('Formato de email inválido');
                            setEmailValid(false);
                            return;
                          }

                          setIsCheckingEmail(true);
                          setEmailError(null);

                          try {
                            const exists = await usersService.checkEmailExists(email);
                            if (exists) {
                              setEmailError('Este email ya está registrado. Por favor, usa otro email.');
                              setEmailValid(false);
                            } else {
                              setEmailError(null);
                              setEmailValid(true);
                            }
                          } catch (err: any) {
                            console.error('Error verificando email:', err);
                            setEmailError('Error al verificar el email. Intenta de nuevo.');
                            setEmailValid(false);
                          } finally {
                            setIsCheckingEmail(false);
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500 ${
                          emailError
                            ? 'border-red-300 bg-red-50'
                            : emailValid
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-300'
                        }`}
                        placeholder="usuario@example.com"
                      />
                      {isCheckingEmail && (
                        <p className="mt-1 text-xs text-gray-500">Verificando email...</p>
                      )}
                      {emailError && (
                        <p className="mt-1 text-xs text-red-600">{emailError}</p>
                      )}
                      {emailValid && !emailError && (
                        <p className="mt-1 text-xs text-green-600">✓ Email disponible</p>
                      )}
                    </div>

                    {/* Password */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contraseña <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={createUserData.password}
                          onChange={(e) => setCreateUserData({ ...createUserData, password: e.target.value })}
                          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Mínimo 6 caracteres"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Contraseña autogenerada. El usuario puede cambiarla después.</p>
                    </div>

                    {/* Confirm Password */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirmar Contraseña <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          value={createUserData.confirmPassword}
                          onChange={(e) => setCreateUserData({ ...createUserData, confirmPassword: e.target.value })}
                          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Repite la contraseña"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* First Name */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={createUserData.firstName}
                        onChange={(e) => setCreateUserData({ ...createUserData, firstName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Juan"
                      />
                    </div>

                    {/* Last Name */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Apellido
                      </label>
                      <input
                        type="text"
                        value={createUserData.lastName}
                        onChange={(e) => setCreateUserData({ ...createUserData, lastName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Pérez"
                      />
                    </div>

                    {/* Phone */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={createUserData.phone}
                        onChange={(e) => setCreateUserData({ ...createUserData, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="+525512345678"
                      />
                    </div>

                    {/* Business Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seleccionar Tienda(s) (opcional - si no seleccionas, se asignará a todas)
                      </label>
                      <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                        {businesses.length === 0 ? (
                          <p className="text-sm text-gray-500">No hay tiendas disponibles</p>
                        ) : (
                          businesses.map((business) => (
                            <label
                              key={business.business_id}
                              className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={createUserData.businessIds.includes(business.business_id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCreateUserData({
                                      ...createUserData,
                                      businessIds: [...createUserData.businessIds, business.business_id],
                                    });
                                  } else {
                                    setCreateUserData({
                                      ...createUserData,
                                      businessIds: createUserData.businessIds.filter((id) => id !== business.business_id),
                                    });
                                  }
                                }}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{business.business_name}</p>
                                <p className="text-xs text-gray-500">{business.business_address || 'Sin dirección'}</p>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Role Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rol <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={createUserData.role}
                        onChange={(e) => setCreateUserData({ ...createUserData, role: e.target.value as BusinessRole })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="admin">Administrador</option>
                        <option value="operations_staff">Operations Staff</option>
                        <option value="kitchen_staff">Kitchen Staff</option>
                      </select>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateModal(false);
                          setCreateUserData({
                            email: '',
                            password: 'Localia1*',
                            confirmPassword: 'Localia1*',
                            firstName: '',
                            lastName: '',
                            phone: '',
                            role: 'operations_staff',
                            businessIds: [],
                          });
                          setError(null);
                          setEmailError(null);
                          setEmailValid(false);
                          setIsCheckingEmail(false);
                          setShowPassword(false);
                          setShowConfirmPassword(false);
                        }}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={!emailValid || isCheckingEmail || !!emailError || isCreatingUser}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isCreatingUser ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creando...
                          </>
                        ) : (
                          'Crear Usuario'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </LocalLayout>
    </>
  );
}

