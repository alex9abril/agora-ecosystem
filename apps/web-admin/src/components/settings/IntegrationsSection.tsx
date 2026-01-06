import { useState, useEffect } from 'react';
import { settingsService, type SiteSetting } from '@/lib/settings';

interface IntegrationsSectionProps {
  settings: SiteSetting[];
  onUpdate: (key: string, value: any) => void;
  saving: boolean;
}

export default function IntegrationsSection({ settings, onUpdate, saving }: IntegrationsSectionProps) {
  const [devMode, setDevMode] = useState(false);
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});

  // Organizar settings por proveedor
  useEffect(() => {
    const devModeSetting = settings.find(s => s.key === 'integrations.dev_mode');
    if (devModeSetting) {
      setDevMode(devModeSetting.value === true);
    }
  }, [settings]);

  const getSetting = (key: string): SiteSetting | undefined => {
    const setting = settings.find(s => s.key === key);
    // Debug: Log para verificar que los settings se están cargando
    if (key.includes('redirect_url')) {
      console.log(`[IntegrationsSection] Buscando setting: ${key}`, setting ? 'ENCONTRADO' : 'NO ENCONTRADO', settings.length);
    }
    return setting;
  };

  const getSettingValue = (key: string): any => {
    return getSetting(key)?.value || '';
  };

  const toggleProvider = (providerKey: string) => {
    setExpandedProviders(prev => ({
      ...prev,
      [providerKey]: !prev[providerKey],
    }));
  };

  const renderProviderSection = (
    providerKey: string,
    providerName: string,
    providerIcon: React.ReactNode,
    enabledKey: string,
    devKeys: { label: string; key: string; type?: 'password' | 'text' }[],
    prodKeys: { label: string; key: string; type?: 'password' | 'text' }[]
  ) => {
    const enabled = getSettingValue(enabledKey) === true;
    const isExpanded = expandedProviders[providerKey] || false;

    return (
      <div key={providerKey} className="border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {providerIcon}
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{providerName}</h3>
              <p className="text-xs text-gray-500">
                {enabled ? 'Habilitado' : 'Deshabilitado'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => onUpdate(enabledKey, e.target.checked)}
                disabled={saving}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Habilitar</span>
            </label>
            <button
              onClick={() => toggleProvider(providerKey)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {isExpanded ? 'Ocultar' : 'Configurar'}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            {/* Indicador de modo actual */}
            <div className={`p-3 rounded-lg ${devMode ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${devMode ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                <span className="text-xs font-medium">
                  {devMode ? 'Modo Desarrollo' : 'Modo Producción'}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {devMode 
                  ? 'Se están usando las credenciales y endpoints de desarrollo'
                  : 'Se están usando las credenciales y endpoints de producción'}
              </p>
            </div>

            {/* Campos de Desarrollo */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Credenciales de Desarrollo
                </h4>
                {devMode && (
                  <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                    ACTIVO
                  </span>
                )}
              </div>
              {devKeys.map(({ label, key, type = 'text' }) => {
                const setting = getSetting(key);
                const value = getSettingValue(key);
                const isActive = devMode && enabled;
                const isEmpty = !value || value === '';
                
                // Debug: Log para campos redirect_url
                if (key.includes('redirect_url')) {
                  console.log(`[IntegrationsSection] Renderizando campo dev: ${key}`, {
                    setting: setting ? 'EXISTS' : 'NOT FOUND',
                    value,
                    isEmpty,
                    settingsCount: settings.length
                  });
                }
                
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-gray-700">
                        {label}
                      </label>
                      {isActive && !isEmpty && (
                        <span className="text-xs text-yellow-600 font-medium">✓ En uso</span>
                      )}
                      {isActive && isEmpty && (
                        <span className="text-xs text-red-600 font-medium">⚠ Requerido</span>
                      )}
                    </div>
                    {setting?.help_text && (
                      <p className="text-xs text-gray-500 mb-1">{setting.help_text}</p>
                    )}
                    {key.includes('redirect_url') && (
                      <div className="mb-1 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <p className="text-blue-800 font-medium mb-1">Placeholders disponibles:</p>
                        <ul className="list-disc list-inside text-blue-700 space-y-0.5">
                          <li><code className="bg-blue-100 px-1 rounded">&#123;tienda&#125;</code> - Ruta de la tienda/grupo (ej: <code className="bg-blue-100 px-1 rounded">/grupo/toyota-group</code> o <code className="bg-blue-100 px-1 rounded">/tienda/sucursal-centro</code>)</li>
                          <li><code className="bg-blue-100 px-1 rounded">&#123;session_id&#125;</code> - ID de sesión de pago (se reemplaza automáticamente)</li>
                        </ul>
                      </div>
                    )}
                    <input
                      type={type}
                      value={value || ''}
                      onChange={(e) => onUpdate(key, e.target.value)}
                      disabled={saving}
                      placeholder={setting?.description || ''}
                      className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono ${
                        isActive
                          ? 'border-yellow-400 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50 ring-2 ring-yellow-200'
                          : devMode
                          ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-gray-50'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Campos de Producción */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Credenciales de Producción
                </h4>
                {!devMode && (
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                    ACTIVO
                  </span>
                )}
              </div>
              {prodKeys.map(({ label, key, type = 'text' }) => {
                const setting = getSetting(key);
                const value = getSettingValue(key);
                const isActive = !devMode && enabled;
                const isEmpty = !value || value === '';
                
                // Debug: Log para campos redirect_url
                if (key.includes('redirect_url')) {
                  console.log(`[IntegrationsSection] Renderizando campo prod: ${key}`, {
                    setting: setting ? 'EXISTS' : 'NOT FOUND',
                    value,
                    isEmpty,
                    settingsCount: settings.length
                  });
                }
                
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-gray-700">
                        {label}
                      </label>
                      {isActive && !isEmpty && (
                        <span className="text-xs text-green-600 font-medium">✓ En uso</span>
                      )}
                      {isActive && isEmpty && (
                        <span className="text-xs text-red-600 font-medium">⚠ Requerido</span>
                      )}
                    </div>
                    {setting?.help_text && (
                      <p className="text-xs text-gray-500 mb-1">{setting.help_text}</p>
                    )}
                    {key.includes('redirect_url') && (
                      <div className="mb-1 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <p className="text-blue-800 font-medium mb-1">Placeholders disponibles:</p>
                        <ul className="list-disc list-inside text-blue-700 space-y-0.5">
                          <li><code className="bg-blue-100 px-1 rounded">&#123;tienda&#125;</code> - Ruta de la tienda/grupo (ej: <code className="bg-blue-100 px-1 rounded">/grupo/toyota-group</code> o <code className="bg-blue-100 px-1 rounded">/tienda/sucursal-centro</code>)</li>
                          <li><code className="bg-blue-100 px-1 rounded">&#123;session_id&#125;</code> - ID de sesión de pago (se reemplaza automáticamente)</li>
                        </ul>
                      </div>
                    )}
                    <input
                      type={type}
                      value={value || ''}
                      onChange={(e) => onUpdate(key, e.target.value)}
                      disabled={saving}
                      placeholder={setting?.description || ''}
                      className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono ${
                        isActive
                          ? 'border-green-400 focus:border-green-500 focus:ring-green-500 bg-green-50 ring-2 ring-green-200'
                          : !devMode
                          ? 'border-green-300 focus:border-green-500 focus:ring-green-500 bg-green-50'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-gray-50'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const devModeSetting = getSetting('integrations.dev_mode');

  return (
    <div className="space-y-6">
      {/* Toggle de Modo Desarrollo */}
      {devModeSetting && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {devModeSetting.label}
              </h3>
              <p className="text-xs text-gray-600 mb-2">
                {devModeSetting.description}
              </p>
              {devModeSetting.help_text && (
                <p className="text-xs text-gray-500 italic">
                  {devModeSetting.help_text}
                </p>
              )}
            </div>
            <label className="flex items-center space-x-3 cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={devMode}
                onChange={(e) => {
                  setDevMode(e.target.checked);
                  onUpdate('integrations.dev_mode', e.target.checked);
                }}
                disabled={saving}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className={`text-sm font-medium ${devMode ? 'text-yellow-700' : 'text-green-700'}`}>
                {devMode ? 'Desarrollo' : 'Producción'}
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Métodos de Pago */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Métodos de Pago</h2>
        
        {renderProviderSection(
          'karlopay',
          'Karlopay',
          (
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-xs font-bold text-gray-700">KP</span>
            </div>
          ),
          'integrations.payments.karlopay.enabled',
          [
        { label: 'Dominio', key: 'integrations.payments.karlopay.dev.domain' },
        { label: 'Login Endpoint', key: 'integrations.payments.karlopay.dev.login_endpoint' },
        { label: 'Órdenes Endpoint', key: 'integrations.payments.karlopay.dev.orders_endpoint' },
        { label: 'Auth Email', key: 'integrations.payments.karlopay.dev.auth_email' },
        { label: 'Auth Password', key: 'integrations.payments.karlopay.dev.auth_password', type: 'password' },
        { label: 'Redirect URL', key: 'integrations.payments.karlopay.dev.redirect_url' },
          ],
          [
        { label: 'Dominio', key: 'integrations.payments.karlopay.prod.domain' },
        { label: 'Login Endpoint', key: 'integrations.payments.karlopay.prod.login_endpoint' },
        { label: 'Órdenes Endpoint', key: 'integrations.payments.karlopay.prod.orders_endpoint' },
        { label: 'Auth Email', key: 'integrations.payments.karlopay.prod.auth_email' },
        { label: 'Auth Password', key: 'integrations.payments.karlopay.prod.auth_password', type: 'password' },
        { label: 'Redirect URL', key: 'integrations.payments.karlopay.prod.redirect_url' },
          ]
        )}

        {renderProviderSection(
          'mercadopago',
          'Mercado Pago',
          (
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-xs font-bold text-blue-700">MP</span>
            </div>
          ),
          'integrations.payments.mercadopago.enabled',
          [
            { label: 'Access Token', key: 'integrations.payments.mercadopago.dev.access_token', type: 'password' },
            { label: 'Public Key', key: 'integrations.payments.mercadopago.dev.public_key', type: 'password' },
            { label: 'Endpoint', key: 'integrations.payments.mercadopago.dev.endpoint' },
          ],
          [
            { label: 'Access Token', key: 'integrations.payments.mercadopago.prod.access_token', type: 'password' },
            { label: 'Public Key', key: 'integrations.payments.mercadopago.prod.public_key', type: 'password' },
            { label: 'Endpoint', key: 'integrations.payments.mercadopago.prod.endpoint' },
          ]
        )}

        {renderProviderSection(
          'stripe',
          'Stripe',
          (
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <span className="text-xs font-bold text-indigo-700">S</span>
            </div>
          ),
          'integrations.payments.stripe.enabled',
          [
            { label: 'Secret Key', key: 'integrations.payments.stripe.dev.secret_key', type: 'password' },
            { label: 'Publishable Key', key: 'integrations.payments.stripe.dev.publishable_key', type: 'password' },
            { label: 'Webhook Secret', key: 'integrations.payments.stripe.dev.webhook_secret', type: 'password' },
            { label: 'Endpoint', key: 'integrations.payments.stripe.dev.endpoint' },
          ],
          [
            { label: 'Secret Key', key: 'integrations.payments.stripe.prod.secret_key', type: 'password' },
            { label: 'Publishable Key', key: 'integrations.payments.stripe.prod.publishable_key', type: 'password' },
            { label: 'Webhook Secret', key: 'integrations.payments.stripe.prod.webhook_secret', type: 'password' },
            { label: 'Endpoint', key: 'integrations.payments.stripe.prod.endpoint' },
          ]
        )}
      </div>

      {/* Proveedores de Logística */}
      <div className="border-t pt-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Proveedores de Logística</h2>
        
        {renderProviderSection(
          'skydropx',
          'Skydropx',
          (
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-xs font-bold text-orange-700">SD</span>
            </div>
          ),
          'integrations.logistics.skydropx.enabled',
          [
            { label: 'Endpoint Base', key: 'integrations.logistics.skydropx.dev.endpoint' },
            { label: 'Endpoint Cotizaciones', key: 'integrations.logistics.skydropx.dev.quotations_endpoint' },
          ],
          [
            { label: 'Endpoint Base', key: 'integrations.logistics.skydropx.prod.endpoint' },
            { label: 'Endpoint Cotizaciones', key: 'integrations.logistics.skydropx.prod.quotations_endpoint' },
          ]
        )}
      </div>
    </div>
  );
}

