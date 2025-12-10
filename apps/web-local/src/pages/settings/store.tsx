import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { businessService, BusinessGroup, CreateBusinessGroupData } from '@/lib/business';

export default function StoreSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { availableBusinesses } = useSelectedBusiness();
  const [loading, setLoading] = useState(true);
  const [businessGroup, setBusinessGroup] = useState<BusinessGroup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    description: '',
    slug: '',
    logo_url: '',
    website_url: '',
    tax_id: '',
    is_active: true,
  });
  const [branchesWithoutGroup, setBranchesWithoutGroup] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Verificar si el usuario es superadmin
  useEffect(() => {
    const checkSuperadmin = () => {
      // Verificar si el usuario es superadmin en alguna de las sucursales disponibles
      const hasSuperadminRole = availableBusinesses.some(
        business => business.role === 'superadmin'
      );
      
      if (hasSuperadminRole) {
        setIsSuperadmin(true);
      } else {
        // Si no es superadmin, redirigir
        console.log('[StoreSettings] Usuario no es superadmin, redirigiendo...');
        router.push('/settings');
      }
    };

    if (availableBusinesses.length > 0) {
      checkSuperadmin();
    }
  }, [availableBusinesses, router]);

  // Cargar grupo empresarial
  useEffect(() => {
    const loadBusinessGroup = async () => {
      if (!isSuperadmin) return;

      try {
        setLoading(true);
        setError(null);
        
        const group = await businessService.getMyBusinessGroup();
        
        if (group) {
          setBusinessGroup(group);
          setFormData({
            name: group.name || '',
            legal_name: group.legal_name || '',
            description: group.description || '',
            slug: group.slug || '',
            logo_url: group.logo_url || '',
            website_url: group.website_url || '',
            tax_id: group.tax_id || '',
            is_active: group.is_active ?? true,
          });
          
          // Verificar si el slug fue editado manualmente
          const generatedSlug = group.name
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          setSlugManuallyEdited(group.slug !== generatedSlug);
        } else {
          // No hay grupo empresarial, permitir crear uno nuevo
          setBusinessGroup(null);
        }
      } catch (err: any) {
        console.error('Error cargando grupo empresarial:', err);
        if (err?.statusCode === 404) {
          // No hay grupo empresarial, permitir crear uno nuevo
          setBusinessGroup(null);
        } else {
          setError('Error al cargar la información del grupo empresarial');
        }
      } finally {
        setLoading(false);
      }
    };

    if (isSuperadmin) {
      loadBusinessGroup();
    }
  }, [isSuperadmin]);

  // Generar slug automáticamente desde el nombre si no fue editado manualmente
  useEffect(() => {
    if (!slugManuallyEdited && formData.name && !businessGroup) {
      const generatedSlug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, slug: generatedSlug }));
    }
  }, [formData.name, slugManuallyEdited, businessGroup]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (businessGroup) {
      setFormData({
        name: businessGroup.name || '',
        legal_name: businessGroup.legal_name || '',
        description: businessGroup.description || '',
        slug: businessGroup.slug || '',
        logo_url: businessGroup.logo_url || '',
        website_url: businessGroup.website_url || '',
        tax_id: businessGroup.tax_id || '',
        is_active: businessGroup.is_active ?? true,
      });
      
      const generatedSlug = businessGroup.name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setSlugManuallyEdited(businessGroup.slug !== generatedSlug);
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (businessGroup) {
        // Actualizar grupo existente
        const updated = await businessService.updateBusinessGroup(businessGroup.id, {
          name: formData.name,
          legal_name: formData.legal_name || undefined,
          description: formData.description || undefined,
          slug: formData.slug || undefined,
          logo_url: formData.logo_url || undefined,
          website_url: formData.website_url || undefined,
          tax_id: formData.tax_id || undefined,
          is_active: formData.is_active,
        });
        
        setBusinessGroup(updated);
        setFormData({
          name: updated.name || '',
          legal_name: updated.legal_name || '',
          description: updated.description || '',
          slug: updated.slug || '',
          logo_url: updated.logo_url || '',
          website_url: updated.website_url || '',
          tax_id: updated.tax_id || '',
          is_active: updated.is_active ?? true,
        });
      } else {
        // Crear nuevo grupo
        const branchesCount = branchesWithoutGroup.length;
        const created = await businessService.createBusinessGroup({
          name: formData.name,
          legal_name: formData.legal_name || undefined,
          description: formData.description || undefined,
          slug: formData.slug || undefined,
          logo_url: formData.logo_url || undefined,
          website_url: formData.website_url || undefined,
          tax_id: formData.tax_id || undefined,
          is_active: formData.is_active,
        });
        
        setBusinessGroup(created);
        setFormData({
          name: created.name || '',
          legal_name: created.legal_name || '',
          description: created.description || '',
          slug: created.slug || '',
          logo_url: created.logo_url || '',
          website_url: created.website_url || '',
          tax_id: created.tax_id || '',
          is_active: created.is_active ?? true,
        });
        
        // Mostrar confirmación con sucursales asignadas
        if (branchesCount > 0) {
          alert(`✅ Grupo creado exitosamente. ${branchesCount} sucursal${branchesCount > 1 ? 'es' : ''} asignada${branchesCount > 1 ? 's' : ''} automáticamente.`);
        } else {
          alert('✅ Grupo creado exitosamente');
        }
        setBranchesWithoutGroup([]); // Limpiar lista ya que fueron asignadas
      }
      
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error guardando grupo empresarial:', err);
      alert(err.message || 'Error al guardar la información. Por favor, intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <LocalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </LocalLayout>
    );
  }

  // Si no es superadmin, no mostrar nada (ya se redirigió en useEffect)
  if (!isSuperadmin) {
    return null;
  }

  if (error && businessGroup === null) {
    return (
      <LocalLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </LocalLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Configuración de Grupo Empresarial - LOCALIA Local</title>
      </Head>
      <LocalLayout>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/settings')}
              className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver a Configuración
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Configuración de Grupo Empresarial</h1>
            <p className="mt-2 text-sm text-gray-600">
              Gestiona la información de tu grupo empresarial
            </p>
          </div>

          {/* Business Group Information Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {businessGroup ? 'Información del Grupo Empresarial' : 'Crear Grupo Empresarial'}
              </h2>
              {!isEditing && businessGroup && (
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Editar
                </button>
              )}
            </div>
            
            {!isEditing && businessGroup ? (
              // Vista de solo lectura
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Grupo
                  </label>
                  <p className="text-gray-900">{businessGroup.name}</p>
                </div>

                {businessGroup.legal_name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Razón Social
                    </label>
                    <p className="text-gray-900">{businessGroup.legal_name}</p>
                  </div>
                )}

                {businessGroup.description && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <p className="text-gray-900">{businessGroup.description}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slug (URL)
                  </label>
                  <p className="text-gray-900 font-mono text-sm">{businessGroup.slug}</p>
                </div>

                {businessGroup.tax_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RFC / Tax ID
                    </label>
                    <p className="text-gray-900">{businessGroup.tax_id}</p>
                  </div>
                )}

                {businessGroup.website_url && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sitio Web
                    </label>
                    <a 
                      href={businessGroup.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      {businessGroup.website_url}
                    </a>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      businessGroup.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {businessGroup.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            ) : (
              // Formulario de edición/creación
              <>
                {/* Preview de sucursales que serán asignadas al crear grupo */}
                {!businessGroup && branchesWithoutGroup.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-blue-900 mb-2">
                          Al crear este grupo, se asignarán automáticamente <strong>{branchesWithoutGroup.length} sucursal{branchesWithoutGroup.length > 1 ? 'es' : ''}</strong> sin grupo:
                        </p>
                        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                          {branchesWithoutGroup.map(branch => (
                            <li key={branch.id}>{branch.name}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                {!businessGroup && branchesWithoutGroup.length === 0 && !loadingBranches && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-gray-700">
                      No hay sucursales sin grupo para asignar. Todas tus sucursales ya tienen un grupo asignado.
                    </p>
                  </div>
                )}
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Grupo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ej: Grupo Andrade"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Razón Social
                    </label>
                    <input
                      type="text"
                      value={formData.legal_name}
                      onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ej: Grupo Andrade S.A. de C.V."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Descripción del grupo empresarial..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Slug (URL amigable) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(e) => {
                        setSlugManuallyEdited(true);
                        const slugValue = e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, '-')
                          .replace(/-+/g, '-')
                          .replace(/^-|-$/g, '');
                        setFormData({ ...formData, slug: slugValue });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                      placeholder="grupo-andrade"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Se genera automáticamente desde el nombre si no lo editas manualmente
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RFC / Tax ID
                    </label>
                    <input
                      type="text"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="GAN850101ABC"
                      maxLength={50}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL del Logo
                    </label>
                    <input
                      type="url"
                      value={formData.logo_url}
                      onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sitio Web
                    </label>
                    <input
                      type="url"
                      value={formData.website_url}
                      onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="https://grupoandrade.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="is_active"
                          checked={formData.is_active === true}
                          onChange={() => setFormData({ ...formData, is_active: true })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">Activo</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="is_active"
                          checked={formData.is_active === false}
                          onChange={() => setFormData({ ...formData, is_active: false })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">Inactivo</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  {businessGroup && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : businessGroup ? 'Guardar Cambios' : 'Crear Grupo'}
                  </button>
                </div>
              </form>
              </>
            )}
          </div>
        </div>
      </LocalLayout>
    </>
  );
}
