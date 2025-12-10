import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';

interface BrandingColors {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  text_primary?: string;
  text_secondary?: string;
  background_color?: string;
  background_secondary?: string;
  success_color?: string;
  warning_color?: string;
  error_color?: string;
  info_color?: string;
}

interface BrandingFonts {
  primary?: string;
  secondary?: string;
  heading?: string;
}

interface BrandingTexts {
  welcome_message?: string;
  tagline?: string;
  footer_text?: string;
  contact_message?: string;
}

interface BrandingSocialMedia {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  whatsapp?: string;
}

interface Branding {
  logo_url?: string;
  logo_light_url?: string;
  logo_dark_url?: string;
  favicon_url?: string;
  colors?: BrandingColors;
  fonts?: BrandingFonts;
  texts?: BrandingTexts;
  social_media?: BrandingSocialMedia;
  custom_css?: string;
  custom_js?: string;
}

interface BrandingManagerProps {
  type: 'group' | 'business';
  id: string;
  name: string;
}

export default function BrandingManager({ type, id, name }: BrandingManagerProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'logos' | 'colors' | 'fonts' | 'texts' | 'social' | 'advanced'>('logos');
  const [uploading, setUploading] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  
  const [branding, setBranding] = useState<Branding>({
    colors: {},
    fonts: {},
    texts: {},
    social_media: {},
  });

  // Cargar branding
  useEffect(() => {
    const loadBranding = async () => {
      if (!token) return;

      setLoading(true);
      try {
        const endpoint = type === 'group' 
          ? `/businesses/groups/${id}/branding`
          : `/businesses/${id}/branding`;
        
        const response = await apiRequest<{ branding: Branding }>(endpoint, {
          method: 'GET',
        });

        setBranding(response.branding || {
          colors: {},
          fonts: {},
          texts: {},
          social_media: {},
        });
      } catch (error) {
        console.error('Error cargando branding:', error);
        // Inicializar con valores vacíos si hay error
        setBranding({
          colors: {},
          fonts: {},
          texts: {},
          social_media: {},
        });
      } finally {
        setLoading(false);
      }
    };

    loadBranding();
  }, [token, type, id]);

  // Guardar branding
  const handleSave = async () => {
    if (!token) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      const endpoint = type === 'group'
        ? `/businesses/groups/${id}/branding`
        : `/businesses/${id}/branding`;

      await apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify({ branding }),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error guardando branding:', error);
      alert('Error al guardar la configuración de branding');
    } finally {
      setSaving(false);
    }
  };

  // Actualizar campo específico
  const updateField = (section: keyof Branding, field: string, value: any) => {
    setBranding((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: value,
      },
    }));
  };

  // Validar archivo de imagen
  const validateImageFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      alert('Tipo de archivo no permitido. Solo se aceptan: JPEG, JPG, PNG, WebP, SVG');
      return false;
    }

    if (file.size > maxSize) {
      alert('El archivo es demasiado grande. Tamaño máximo: 5MB');
      return false;
    }

    return true;
  };

  // Subir imagen
  const handleUploadImage = async (imageType: 'logo' | 'logo_light' | 'logo_dark' | 'favicon', file: File) => {
    if (!token) return;

    if (!validateImageFile(file)) {
      return;
    }

    setUploading(imageType);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = type === 'group'
        ? `/businesses/groups/${id}/branding/upload-${imageType === 'logo' ? 'logo' : imageType === 'logo_light' ? 'logo-light' : imageType === 'logo_dark' ? 'logo-dark' : 'favicon'}`
        : `/businesses/${id}/branding/upload-${imageType === 'logo' ? 'logo' : imageType === 'logo_light' ? 'logo-light' : imageType === 'logo_dark' ? 'logo-dark' : 'favicon'}`;

      // Usar la misma URL base que apiRequest
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error al subir la imagen' }));
        throw new Error(error.message || 'Error al subir la imagen');
      }

      const result = await response.json();

      // Actualizar el branding con la nueva URL
      const fieldName = imageType === 'logo' ? 'logo_url' : 
                       imageType === 'logo_light' ? 'logo_light_url' :
                       imageType === 'logo_dark' ? 'logo_dark_url' :
                       'favicon_url';

      setBranding((prev) => ({
        ...prev,
        [fieldName]: result.url,
      }));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error subiendo imagen:', error);
      alert(error.message || 'Error al subir la imagen');
    } finally {
      setUploading(null);
    }
  };

  // Handlers para drag and drop
  const handleDragEnter = (e: React.DragEvent, imageType: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(imageType);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, imageType: 'logo' | 'logo_light' | 'logo_dark' | 'favicon') => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(null);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleUploadImage(imageType, file);
    }
  };

  // Renderizar preview de color
  const ColorPreview = ({ color, field, label }: { color?: string; field: string; label: string }) => (
    <div className="flex items-center space-x-3">
      <div
        className="w-12 h-12 rounded border border-gray-300"
        style={{ backgroundColor: color || '#FFFFFF' }}
      />
      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
        <input
          type="text"
          value={color || ''}
          onChange={(e) => updateField('colors', field, e.target.value)}
          placeholder="#000000"
          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-xs text-gray-600">Cargando configuración de branding...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">
            Personalización de {type === 'group' ? 'Grupo' : 'Sucursal'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">{name}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded text-xs text-green-800">
          ✓ Configuración guardada exitosamente
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'logos', label: 'Logos' },
            { id: 'colors', label: 'Colores' },
            { id: 'fonts', label: 'Fuentes' },
            { id: 'texts', label: 'Textos' },
            { id: 'social', label: 'Redes Sociales' },
            { id: 'advanced', label: 'Avanzado' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido de tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'logos' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Logos</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Logo Principal
                  </label>
                  <div
                    onDragEnter={(e) => handleDragEnter(e, 'logo')}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'logo')}
                    className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                      dragging === 'logo'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="url"
                        value={branding.logo_url || ''}
                        onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })}
                        placeholder="https://example.com/logo.png o arrastra una imagen aquí"
                        className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <label className="px-3 py-2 text-xs bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 cursor-pointer transition-colors whitespace-nowrap">
                        {uploading === 'logo' ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Subiendo...
                          </span>
                        ) : (
                          'Subir'
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadImage('logo', file);
                          }}
                          disabled={uploading === 'logo'}
                        />
                      </label>
                    </div>
                    {dragging === 'logo' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-indigo-50 bg-opacity-90 rounded-lg z-10">
                        <div className="text-center">
                          <svg className="mx-auto h-8 w-8 text-indigo-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-xs font-medium text-indigo-700">Suelta la imagen aquí</p>
                        </div>
                      </div>
                    )}
                    {branding.logo_url && (
                      <div className="mt-3 flex items-center space-x-3">
                        <img
                          src={branding.logo_url}
                          alt="Logo preview"
                          className="h-16 object-contain border border-gray-200 rounded bg-white p-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <button
                          onClick={() => setBranding({ ...branding, logo_url: '' })}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Logo para Fondos Claros
                  </label>
                  <div
                    onDragEnter={(e) => handleDragEnter(e, 'logo_light')}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'logo_light')}
                    className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                      dragging === 'logo_light'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="url"
                        value={branding.logo_light_url || ''}
                        onChange={(e) => setBranding({ ...branding, logo_light_url: e.target.value })}
                        placeholder="https://example.com/logo-light.png o arrastra una imagen aquí"
                        className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <label className="px-3 py-2 text-xs bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 cursor-pointer transition-colors whitespace-nowrap">
                        {uploading === 'logo_light' ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Subiendo...
                          </span>
                        ) : (
                          'Subir'
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadImage('logo_light', file);
                          }}
                          disabled={uploading === 'logo_light'}
                        />
                      </label>
                    </div>
                    {dragging === 'logo_light' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-indigo-50 bg-opacity-90 rounded-lg z-10">
                        <div className="text-center">
                          <svg className="mx-auto h-8 w-8 text-indigo-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-xs font-medium text-indigo-700">Suelta la imagen aquí</p>
                        </div>
                      </div>
                    )}
                    {branding.logo_light_url && (
                      <div className="mt-3 flex items-center space-x-3">
                        <img
                          src={branding.logo_light_url}
                          alt="Logo light preview"
                          className="h-16 object-contain border border-gray-200 rounded bg-white p-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <button
                          onClick={() => setBranding({ ...branding, logo_light_url: '' })}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Logo para Fondos Oscuros
                  </label>
                  <div
                    onDragEnter={(e) => handleDragEnter(e, 'logo_dark')}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'logo_dark')}
                    className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                      dragging === 'logo_dark'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="url"
                        value={branding.logo_dark_url || ''}
                        onChange={(e) => setBranding({ ...branding, logo_dark_url: e.target.value })}
                        placeholder="https://example.com/logo-dark.png o arrastra una imagen aquí"
                        className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <label className="px-3 py-2 text-xs bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 cursor-pointer transition-colors whitespace-nowrap">
                        {uploading === 'logo_dark' ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Subiendo...
                          </span>
                        ) : (
                          'Subir'
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadImage('logo_dark', file);
                          }}
                          disabled={uploading === 'logo_dark'}
                        />
                      </label>
                    </div>
                    {dragging === 'logo_dark' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-indigo-50 bg-opacity-90 rounded-lg z-10">
                        <div className="text-center">
                          <svg className="mx-auto h-8 w-8 text-indigo-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-xs font-medium text-indigo-700">Suelta la imagen aquí</p>
                        </div>
                      </div>
                    )}
                    {branding.logo_dark_url && (
                      <div className="mt-3 flex items-center space-x-3">
                        <img
                          src={branding.logo_dark_url}
                          alt="Logo dark preview"
                          className="h-16 object-contain border border-gray-200 rounded bg-white p-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <button
                          onClick={() => setBranding({ ...branding, logo_dark_url: '' })}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Favicon
                  </label>
                  <div
                    onDragEnter={(e) => handleDragEnter(e, 'favicon')}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'favicon')}
                    className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                      dragging === 'favicon'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="url"
                        value={branding.favicon_url || ''}
                        onChange={(e) => setBranding({ ...branding, favicon_url: e.target.value })}
                        placeholder="https://example.com/favicon.ico o arrastra una imagen aquí"
                        className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <label className="px-3 py-2 text-xs bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 cursor-pointer transition-colors whitespace-nowrap">
                        {uploading === 'favicon' ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Subiendo...
                          </span>
                        ) : (
                          'Subir'
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadImage('favicon', file);
                          }}
                          disabled={uploading === 'favicon'}
                        />
                      </label>
                    </div>
                    {dragging === 'favicon' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-indigo-50 bg-opacity-90 rounded-lg z-10">
                        <div className="text-center">
                          <svg className="mx-auto h-8 w-8 text-indigo-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-xs font-medium text-indigo-700">Suelta la imagen aquí</p>
                        </div>
                      </div>
                    )}
                    {branding.favicon_url && (
                      <div className="mt-3 flex items-center space-x-3">
                        <img
                          src={branding.favicon_url}
                          alt="Favicon preview"
                          className="h-16 w-16 object-contain border border-gray-200 rounded bg-white p-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <button
                          onClick={() => setBranding({ ...branding, favicon_url: '' })}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'colors' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Colores Principales</h3>
              <div className="space-y-4">
                <ColorPreview color={branding.colors?.primary_color} field="primary_color" label="Color Primario" />
                <ColorPreview color={branding.colors?.secondary_color} field="secondary_color" label="Color Secundario" />
                <ColorPreview color={branding.colors?.accent_color} field="accent_color" label="Color de Acento" />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Colores de Texto</h3>
              <div className="space-y-4">
                <ColorPreview color={branding.colors?.text_primary} field="text_primary" label="Texto Primario" />
                <ColorPreview color={branding.colors?.text_secondary} field="text_secondary" label="Texto Secundario" />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Colores de Fondo</h3>
              <div className="space-y-4">
                <ColorPreview color={branding.colors?.background_color} field="background_color" label="Fondo Principal" />
                <ColorPreview color={branding.colors?.background_secondary} field="background_secondary" label="Fondo Secundario" />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Colores de Estado</h3>
              <div className="space-y-4">
                <ColorPreview color={branding.colors?.success_color} field="success_color" label="Éxito" />
                <ColorPreview color={branding.colors?.warning_color} field="warning_color" label="Advertencia" />
                <ColorPreview color={branding.colors?.error_color} field="error_color" label="Error" />
                <ColorPreview color={branding.colors?.info_color} field="info_color" label="Información" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fonts' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Fuentes</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Fuente Primaria
                  </label>
                  <input
                    type="text"
                    value={branding.fonts?.primary || ''}
                    onChange={(e) => updateField('fonts', 'primary', e.target.value)}
                    placeholder="Inter, Arial, sans-serif"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Fuente Secundaria
                  </label>
                  <input
                    type="text"
                    value={branding.fonts?.secondary || ''}
                    onChange={(e) => updateField('fonts', 'secondary', e.target.value)}
                    placeholder="Roboto, Arial, sans-serif"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Fuente para Títulos
                  </label>
                  <input
                    type="text"
                    value={branding.fonts?.heading || ''}
                    onChange={(e) => updateField('fonts', 'heading', e.target.value)}
                    placeholder="Poppins, Arial, sans-serif"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'texts' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Textos Personalizados</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Mensaje de Bienvenida
                  </label>
                  <input
                    type="text"
                    value={branding.texts?.welcome_message || ''}
                    onChange={(e) => updateField('texts', 'welcome_message', e.target.value)}
                    placeholder="Bienvenido a nuestra tienda"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Tagline / Eslogan
                  </label>
                  <input
                    type="text"
                    value={branding.texts?.tagline || ''}
                    onChange={(e) => updateField('texts', 'tagline', e.target.value)}
                    placeholder="Tu tienda de confianza"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Texto del Footer
                  </label>
                  <input
                    type="text"
                    value={branding.texts?.footer_text || ''}
                    onChange={(e) => updateField('texts', 'footer_text', e.target.value)}
                    placeholder="© 2025 Todos los derechos reservados"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Mensaje de Contacto
                  </label>
                  <input
                    type="text"
                    value={branding.texts?.contact_message || ''}
                    onChange={(e) => updateField('texts', 'contact_message', e.target.value)}
                    placeholder="¿Necesitas ayuda? Contáctanos"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'social' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Redes Sociales</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Facebook
                  </label>
                  <input
                    type="url"
                    value={branding.social_media?.facebook || ''}
                    onChange={(e) => updateField('social_media', 'facebook', e.target.value)}
                    placeholder="https://facebook.com/tienda"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Instagram
                  </label>
                  <input
                    type="url"
                    value={branding.social_media?.instagram || ''}
                    onChange={(e) => updateField('social_media', 'instagram', e.target.value)}
                    placeholder="https://instagram.com/tienda"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Twitter / X
                  </label>
                  <input
                    type="url"
                    value={branding.social_media?.twitter || ''}
                    onChange={(e) => updateField('social_media', 'twitter', e.target.value)}
                    placeholder="https://twitter.com/tienda"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    value={branding.social_media?.whatsapp || ''}
                    onChange={(e) => updateField('social_media', 'whatsapp', e.target.value)}
                    placeholder="+521234567890"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">CSS Personalizado</h3>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Código CSS (opcional)
                </label>
                <textarea
                  value={branding.custom_css || ''}
                  onChange={(e) => setBranding({ ...branding, custom_css: e.target.value })}
                  placeholder=".custom-class { color: red; }"
                  rows={8}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ⚠️ Usa con precaución. El CSS personalizado se aplicará globalmente.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">JavaScript Personalizado</h3>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Código JavaScript (opcional)
                </label>
                <textarea
                  value={branding.custom_js || ''}
                  onChange={(e) => setBranding({ ...branding, custom_js: e.target.value })}
                  placeholder="console.log('Custom JS');"
                  rows={8}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ⚠️ Usa con precaución. El JavaScript personalizado se ejecutará en todas las páginas.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

