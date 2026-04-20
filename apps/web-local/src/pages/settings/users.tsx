import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import SettingsSidebar from '@/components/settings/SettingsSidebar';
import { useState, useEffect } from 'react';
import { usersService, BusinessUser, User, BusinessRole } from '@/lib/users';
import { businessService } from '@/lib/business';
import { apiRequest } from '@/lib/api';
import {
  EMPTY_OPERATOR_PERMISSIONS,
  MODULE_KEYS,
  SETTINGS_KEYS,
  TIENDAS_KEYS,
  MODULE_LABELS,
  SETTINGS_LABELS,
  TIENDAS_LABELS,
  MODULE_DESCRIPTIONS,
  SETTINGS_DESCRIPTIONS,
  TIENDAS_DESCRIPTIONS,
  CAPABILITIES_KEYS,
  CAPABILITIES_LABELS,
  CAPABILITIES_DESCRIPTIONS,
  normalizeOperatorPermissions,
  type OperatorPermissions,
  type ModuleKey,
  type SettingsKey,
  type TiendasKey,
  type CapabilityKey,
} from '@/lib/operator-permissions';

interface Business {
  business_id: string;
  business_name: string;
  business_email: string;
  business_phone: string;
  business_address?: string;
  business_group_id?: string | null;
  is_active: boolean;
  total_users: number;
  created_at: string;
}

/** Fila de tienda (canal) para el formulario de invitar usuario */
interface InviteStoreRow {
  storeId: string;
  storeName: string;
  storeType: string;
  businessIds: string[];
}

/** Permisos por tienda para invitar usuario */
interface InviteStorePerms {
  hasAccess: boolean;
  canFulfill: boolean;
  canAddProducts: boolean;
  canAccessConfig: boolean;
}

interface UserWithBusinesses extends BusinessUser {
  business_name?: string;
  businesses?: Array<{
    business_id: string;
    business_name: string;
    role: BusinessRole;
    is_active: boolean;
    permissions?: Record<string, unknown>;
  }>;
}

export default function UsersSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [users, setUsers] = useState<UserWithBusinesses[]>([]);
  const [selectedBusinessFilter, setSelectedBusinessFilter] = useState<string>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStoreRows, setInviteStoreRows] = useState<InviteStoreRow[]>([]);
  const [inviteStorePerms, setInviteStorePerms] = useState<Record<string, InviteStorePerms>>({});
  const [loadingInviteStores, setLoadingInviteStores] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteUserNotFound, setInviteUserNotFound] = useState(false);
  const [inviteCreateData, setInviteCreateData] = useState({ password: 'AGORA1*', firstName: '', lastName: '' });
  const [editPermissionsFor, setEditPermissionsFor] = useState<{
    userId: string;
    businessId: string;
    businessName: string;
    currentRole: BusinessRole;
  } | null>(null);
  const [editPermissionsValue, setEditPermissionsValue] = useState<OperatorPermissions>(EMPTY_OPERATOR_PERMISSIONS);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
              permissions: u.permissions,
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
      } catch (err: any) {
        console.error('Error cargando usuarios:', err);
        setError('Error al cargar los usuarios');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Cargar tiendas (stores) al abrir el modal Invitar usuario
  useEffect(() => {
    if (!showInviteModal) return;
    let cancelled = false;
    const load = async () => {
      setLoadingInviteStores(true);
      setInviteStoreRows([]);
      setInviteStorePerms({});
      try {
        const group = await businessService.getMyBusinessGroup();
        if (!group?.id) {
          setInviteStoreRows([]);
          return;
        }
        type StoreRow = { id: string; type: string; name: string; business_group_id?: string | null; business_id?: string | null };
        const [storesRes, storesBranchRes, bizList] = await Promise.all([
          apiRequest<{ data?: StoreRow[] }>(`/stores?businessGroupId=${group.id}&limit=100`),
          /* Incluye sucursales aunque stores.business_group_id esté NULL si la sucursal pertenece al grupo */
          apiRequest<{ data?: StoreRow[] }>(`/stores?businessGroupId=${encodeURIComponent(group.id)}&type=branch&limit=100`),
          usersService.getSuperadminBusinesses(),
        ]);
        if (cancelled) return;
        const byStoreId = new Map<string, StoreRow>();
        for (const s of [...(storesRes?.data ?? []), ...(storesBranchRes?.data ?? [])]) {
          if (s?.id && !byStoreId.has(s.id)) byStoreId.set(s.id, s);
        }
        const stores = [...byStoreId.values()];
        const businessesWithGroup = bizList as Array<{ business_id: string; business_name: string; business_group_id?: string | null }>;
        const rows: InviteStoreRow[] = [];
        for (const s of stores) {
          let businessIds: string[] = [];
          if (s.type === 'branch' && s.business_id) {
            businessIds = [s.business_id];
          } else if ((s.type === 'group' || s.type === 'group_brand') && (s.business_group_id ?? (s as any).business_group_id)) {
            const gid = String(s.business_group_id ?? (s as any).business_group_id);
            businessIds = businessesWithGroup
              .filter((b) => String(b.business_group_id ?? '') === gid)
              .map((b) => b.business_id);
          }
          if (businessIds.length > 0) {
            rows.push({
              storeId: s.id,
              storeName: s.name,
              storeType: s.type,
              businessIds,
            });
            setInviteStorePerms((prev) => ({
              ...prev,
              [s.id]: prev[s.id] ?? { hasAccess: false, canFulfill: false, canAddProducts: false, canAccessConfig: false },
            }));
          }
        }
        setInviteStoreRows(rows);
      } catch (e) {
        console.error('Error cargando tiendas para invitar:', e);
        setInviteStoreRows([]);
      } finally {
        if (!cancelled) setLoadingInviteStores(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [showInviteModal]);

  const setInvitePerm = (storeId: string, key: keyof InviteStorePerms, value: boolean) => {
    setInviteStorePerms((prev) => ({
      ...prev,
      [storeId]: { ...(prev[storeId] ?? { hasAccess: false, canFulfill: false, canAddProducts: false, canAccessConfig: false }), [key]: value },
    }));
  };

  const handleInviteSubmit = async (createUserIfMissing: boolean = false) => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setError('Indica el correo del usuario');
      return;
    }
    const storeIdsWithAccess = inviteStoreRows.filter((r) => inviteStorePerms[r.storeId]?.hasAccess);
    if (storeIdsWithAccess.length === 0) {
      setError('Selecciona al menos una tienda con acceso');
      return;
    }
    setError(null);
    setSuccess(null);
    setInviteSubmitting(true);
    try {
      let userId: string | null = null;
      const available = await usersService.getAvailableUsersForSuperadminAccount(email);
      const existing = available.find((u) => u.email?.toLowerCase() === email);
      if (existing) {
        userId = existing.id;
      } else if (createUserIfMissing && inviteCreateData.password.length >= 6) {
        const created = await usersService.createUserForSuperadminAccount({
          email,
          password: inviteCreateData.password,
          firstName: inviteCreateData.firstName || undefined,
          lastName: inviteCreateData.lastName || undefined,
          role: 'operations_staff',
          businessIds: [],
        });
        userId = created.user?.id ?? (created as any).created_user?.id;
      }
      if (!userId) {
        setInviteUserNotFound(true);
        setInviteSubmitting(false);
        return;
      }
      setInviteUserNotFound(false);
      const businessPermMap = new Map<string, OperatorPermissions>();
      for (const row of storeIdsWithAccess) {
        const p = inviteStorePerms[row.storeId];
        if (!p) continue;
        const perms: OperatorPermissions = {
          ...EMPTY_OPERATOR_PERMISSIONS,
          modules: {
            ...EMPTY_OPERATOR_PERMISSIONS.modules,
            products: p.canAddProducts,
          },
          settings: {
            ...EMPTY_OPERATOR_PERMISSIONS.settings,
            store: p.canAccessConfig,
            branches: p.canAccessConfig,
            users: p.canAccessConfig,
            emails: p.canAccessConfig,
          },
          capabilities: {
            ...EMPTY_OPERATOR_PERMISSIONS.capabilities,
            can_fulfill: p.canFulfill,
          },
        };
        for (const bid of row.businessIds) {
          const existing = businessPermMap.get(bid);
          if (!existing) {
            businessPermMap.set(bid, perms);
            continue;
          }
          const merged: OperatorPermissions = {
            modules: {} as any,
            settings: {} as any,
            capabilities: {} as any,
          };
          for (const k of Object.keys(emptyM) as (keyof typeof emptyM)[]) {
            (merged.modules as any)[k] = (existing.modules?.[k] ?? false) || (perms.modules?.[k] ?? false);
          }
          for (const k of Object.keys(emptyS) as (keyof typeof emptyS)[]) {
            (merged.settings as any)[k] = (existing.settings?.[k] ?? false) || (perms.settings?.[k] ?? false);
          }
          for (const k of Object.keys(emptyC) as (keyof typeof emptyC)[]) {
            (merged.capabilities as any)[k] = (existing.capabilities?.[k] ?? false) || (perms.capabilities?.[k] ?? false);
          }
          businessPermMap.set(bid, merged);
        }
      }
      const assignments = Array.from(businessPermMap.entries()).map(([business_id, permissions]) => ({
        business_id,
        role: 'operations_staff' as BusinessRole,
        permissions,
      }));
      const result = await usersService.bulkAssignUser({ user_id: userId, assignments });
      const ok = result.assignments.filter((a) => a.success).length;
      setSuccess(`Usuario invitado correctamente a ${ok} sucursal(es).`);
      await reloadData();
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteStorePerms({});
      setInviteUserNotFound(false);
    } catch (err: any) {
      setError(err?.message || 'Error al invitar usuario');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const emptyM = EMPTY_OPERATOR_PERMISSIONS.modules!;
  const emptyS = EMPTY_OPERATOR_PERMISSIONS.settings!;
  const emptyT = EMPTY_OPERATOR_PERMISSIONS.tiendas!;
  const emptyC = EMPTY_OPERATOR_PERMISSIONS.capabilities!;

  const setEditPermission = (kind: 'modules' | 'settings' | 'tiendas' | 'capabilities', key: ModuleKey | SettingsKey | TiendasKey | CapabilityKey, value: boolean) => {
    setEditPermissionsValue((prev) => ({
      ...prev,
      [kind]: { ...(prev[kind] ?? {}), [key]: value },
    }));
  };

  const handleSaveEditPermissions = async () => {
    if (!editPermissionsFor) return;
    try {
      setError(null);
      await usersService.changeUserRole(editPermissionsFor.businessId, editPermissionsFor.userId, {
        role: editPermissionsFor.currentRole,
        permissions: editPermissionsValue,
      });
      setSuccess('Permisos actualizados');
      setEditPermissionsFor(null);
      await reloadData();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar permisos');
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
            permissions: u.permissions,
          });
        }
      });

      const formattedUsers = Array.from(usersMap.values()).sort((a, b) => {
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.user_email || '';
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim() || b.user_email || '';
        return nameA.localeCompare(nameB);
      });

      setUsers(formattedUsers);
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
    if (role === 'superadmin' || role === 'admin') return 'Administrador';
    return 'Operador';
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

  return (
    <LocalLayout>
      <Head>
        <title>Usuarios y Permisos - AGORA Local</title>
      </Head>
      <div className="p-6 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-normal text-gray-900 mb-2">Configuración</h1>
              <p className="text-sm text-gray-600">
                Gestiona la configuración de tu tienda y personal
              </p>
            </div>

            <div className="flex gap-6">
              {/* Sidebar: Categorías */}
              <SettingsSidebar />

              {/* Contenido principal */}
              <div className="flex-1">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-normal text-gray-900">Usuarios y Permisos</h2>
                      <p className="mt-2 text-sm text-gray-600">
                        Administra a tus empleados y sus permisos de acceso
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowInviteModal(true);
                          setInviteEmail('');
                          setInviteUserNotFound(false);
                        }}
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        Invitar usuario
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
                      <label className="block text-sm font-normal text-gray-700 mb-2">
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
                    <h2 className="text-lg font-normal text-gray-900">Miembros del Personal</h2>
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
                <h3 className="mt-2 text-sm font-normal text-gray-900">No hay usuarios asignados</h3>
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
                            <h3 className="text-base font-normal text-gray-900">
                              {user.first_name || user.last_name
                                ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                : 'Sin nombre'}
                            </h3>
                            <p className="text-sm text-gray-500">{user.user_email}</p>
                          </div>
                        </div>

                        {/* Tiendas y Roles */}
                        <div className="mt-4">
                          <h4 className="text-sm font-normal text-gray-700 mb-2">Tiendas y Roles:</h4>
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
                                        <p className="text-sm font-normal text-gray-900">
                                          {business.business_name}
                                        </p>
                                        <span
                                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-normal mt-1 ${getRoleColor(
                                            business.role
                                          )}`}
                                        >
                                          {getRoleLabel(business.role)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={business.role === 'kitchen_staff' ? 'operations_staff' : business.role}
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
                                        <option value="operations_staff">Operador</option>
                                      </select>
                                      {(business.role === 'operations_staff' || business.role === 'kitchen_staff') && (
                                        <button
                                          onClick={() => {
                                            setEditPermissionsValue(
                                              normalizeOperatorPermissions(
                                                (business.permissions as Record<string, unknown>) ?? {}
                                              )
                                            );
                                            setEditPermissionsFor({
                                              userId: user.user_id,
                                              businessId: business.business_id,
                                              businessName: business.business_name ?? business.business_id,
                                              currentRole: business.role,
                                            });
                                          }}
                                          className="text-indigo-600 hover:text-indigo-900 text-sm"
                                        >
                                          Editar permisos
                                        </button>
                                      )}
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

          {/* Modal Invitar usuario */}
          {showInviteModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-xl font-normal text-gray-900 mb-2">Invitar usuario</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Indica el correo y las tiendas a las que tendrá acceso. Por cada tienda (canal) defines si puede hacer fulfillment, agregar productos o entrar a configuración.
                  </p>

                  <div className="mb-4">
                    <label className="block text-sm font-normal text-gray-700 mb-2">Correo <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => { setInviteEmail(e.target.value); setInviteUserNotFound(false); }}
                      placeholder="usuario@ejemplo.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-normal text-gray-700 mb-2">Tiendas y permisos</label>
                    <p className="text-xs text-gray-500 mb-2">
                      La tienda es el canal (configuración, personalizaciones). La sucursal/distribuidor es quien surte pedidos y gestiona precios y disponibilidad.
                    </p>
                    {loadingInviteStores ? (
                      <p className="text-gray-500 py-4">Cargando tiendas...</p>
                    ) : inviteStoreRows.length === 0 ? (
                      <p className="text-gray-500 py-4">No hay tiendas disponibles para tu cuenta.</p>
                    ) : (
                      <div className="space-y-4 max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-3">
                        {inviteStoreRows.map((row) => {
                          const p = inviteStorePerms[row.storeId] ?? { hasAccess: false, canFulfill: false, canAddProducts: false, canAccessConfig: false };
                          return (
                            <div key={row.storeId} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                              <label className="flex items-center gap-2 font-medium text-gray-900 mb-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={p.hasAccess}
                                  onChange={(e) => setInvitePerm(row.storeId, 'hasAccess', e.target.checked)}
                                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                {row.storeName}
                                <span className="text-xs font-normal text-gray-500">({row.storeType === 'branch' ? 'Sucursal' : row.storeType === 'group' ? 'Grupo' : 'Tienda'})</span>
                              </label>
                              {p.hasAccess && (
                                <div className="ml-6 space-y-2 text-sm">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={p.canFulfill}
                                      onChange={(e) => setInvitePerm(row.storeId, 'canFulfill', e.target.checked)}
                                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Puede hacer fulfillment (surtir pedidos, validar precios y disponibilidad)
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={p.canAddProducts}
                                      onChange={(e) => setInvitePerm(row.storeId, 'canAddProducts', e.target.checked)}
                                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Puede agregar productos
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={p.canAccessConfig}
                                      onChange={(e) => setInvitePerm(row.storeId, 'canAccessConfig', e.target.checked)}
                                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Puede entrar a configuración (tienda, sucursales, usuarios, correos)
                                  </label>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {inviteUserNotFound && (
                    <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800 mb-2">No hay usuario registrado con este correo.</p>
                      <p className="text-sm text-amber-700 mb-3">Créalo y asígnalo con los permisos elegidos:</p>
                      <div className="space-y-2">
                        <input
                          type="password"
                          value={inviteCreateData.password}
                          onChange={(e) => setInviteCreateData({ ...inviteCreateData, password: e.target.value })}
                          placeholder="Contraseña (mín. 6 caracteres)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <input
                          type="text"
                          value={inviteCreateData.firstName}
                          onChange={(e) => setInviteCreateData({ ...inviteCreateData, firstName: e.target.value })}
                          placeholder="Nombre"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <input
                          type="text"
                          value={inviteCreateData.lastName}
                          onChange={(e) => setInviteCreateData({ ...inviteCreateData, lastName: e.target.value })}
                          placeholder="Apellido"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowInviteModal(false);
                        setInviteUserNotFound(false);
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => inviteUserNotFound ? handleInviteSubmit(true) : handleInviteSubmit(false)}
                      disabled={inviteSubmitting || !inviteEmail.trim() || inviteStoreRows.filter((r) => inviteStorePerms[r.storeId]?.hasAccess).length === 0 || (inviteUserNotFound && inviteCreateData.password.length < 6)}
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {inviteSubmitting ? 'Enviando...' : inviteUserNotFound ? 'Crear usuario e invitar' : 'Invitar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit Permissions Modal (Operador) */}
          {editPermissionsFor && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-xl font-normal text-gray-900 mb-2">Editar permisos (Operador)</h2>
                  <p className="text-sm text-gray-500 mb-4">{editPermissionsFor.businessName}</p>
                  <div className="space-y-6 mb-6">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Módulos</p>
                      <ul className="space-y-2.5 list-none">
                        {MODULE_KEYS.map((key) => (
                          <li key={key} className="flex gap-3">
                            <input
                              id={`edit-module-${key}`}
                              type="checkbox"
                              checked={editPermissionsValue.modules?.[key] === true}
                              onChange={(e) => setEditPermission('modules', key, e.target.checked)}
                              className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                            />
                            <label htmlFor={`edit-module-${key}`} className="cursor-pointer flex-1">
                              <span className="block text-sm font-medium text-gray-900">{MODULE_LABELS[key]}</span>
                              <span className="block text-xs text-gray-500 mt-0.5">{MODULE_DESCRIPTIONS[key]}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Configuración</p>
                      <ul className="space-y-2.5 list-none">
                        {SETTINGS_KEYS.map((key) => (
                          <li key={key} className="flex gap-3">
                            <input
                              id={`edit-settings-${key}`}
                              type="checkbox"
                              checked={editPermissionsValue.settings?.[key] === true}
                              onChange={(e) => setEditPermission('settings', key, e.target.checked)}
                              className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                            />
                            <label htmlFor={`edit-settings-${key}`} className="cursor-pointer flex-1">
                              <span className="block text-sm font-medium text-gray-900">{SETTINGS_LABELS[key]}</span>
                              <span className="block text-xs text-gray-500 mt-0.5">{SETTINGS_DESCRIPTIONS[key]}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Tiendas</p>
                      <p className="text-xs text-gray-400 mb-2">Pestañas visibles dentro del módulo Tiendas (requiere el módulo &quot;Tiendas&quot; activo en Módulos).</p>
                      <ul className="space-y-2.5 list-none">
                        {TIENDAS_KEYS.map((key) => (
                          <li key={key} className="flex gap-3">
                            <input
                              id={`edit-tiendas-${key}`}
                              type="checkbox"
                              checked={editPermissionsValue.tiendas?.[key] === true}
                              onChange={(e) => setEditPermission('tiendas', key, e.target.checked)}
                              className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                            />
                            <label htmlFor={`edit-tiendas-${key}`} className="cursor-pointer flex-1">
                              <span className="block text-sm font-medium text-gray-900">{TIENDAS_LABELS[key]}</span>
                              <span className="block text-xs text-gray-500 mt-0.5">{TIENDAS_DESCRIPTIONS[key]}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Capacidades</p>
                      <ul className="space-y-2.5 list-none">
                        {CAPABILITIES_KEYS.map((key) => (
                          <li key={key} className="flex gap-3">
                            <input
                              id={`edit-cap-${key}`}
                              type="checkbox"
                              checked={editPermissionsValue.capabilities?.[key] === true}
                              onChange={(e) => setEditPermission('capabilities', key, e.target.checked)}
                              className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                            />
                            <label htmlFor={`edit-cap-${key}`} className="cursor-pointer flex-1">
                              <span className="block text-sm font-medium text-gray-900">{CAPABILITIES_LABELS[key]}</span>
                              <span className="block text-xs text-gray-500 mt-0.5">{CAPABILITIES_DESCRIPTIONS[key]}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setEditPermissionsFor(null)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveEditPermissions}
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </LocalLayout>
  );
}

