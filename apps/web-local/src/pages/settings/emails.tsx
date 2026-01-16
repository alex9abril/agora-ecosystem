import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { SketchPicker, ColorResult } from 'react-color';
import LocalLayout from '@/components/layout/LocalLayout';
import SettingsSidebar from '@/components/settings/SettingsSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { businessService } from '@/lib/business';
import {
  emailTemplatesService,
  EmailTemplate,
  EmailTemplateLevel,
  EmailTriggerType,
} from '@/lib/email-templates';

// Mapeo de triggers a nombres y descripciones
const triggerInfo: Record<EmailTriggerType, { name: string; description: string; variables: string[] }> = {
  user_registration: {
    name: 'Correo de Bienvenida',
    description: 'Se envía cuando un usuario se registra en la plataforma',
    variables: ['user_name', 'dashboard_url'],
  },
  order_confirmation: {
    name: 'Confirmación de Pedido',
    description: 'Se envía cuando se confirma un pedido',
    variables: ['user_name', 'order_number', 'order_date', 'order_total', 'payment_method', 'order_url'],
  },
  order_status_change: {
    name: 'Cambio de Estado de Pedido',
    description: 'Se envía cuando cambia el estado de un pedido',
    variables: ['user_name', 'order_number', 'previous_status', 'current_status', 'status_message', 'order_url'],
  },
};

const buildLogoHtml = (logoUrl: string) =>
  `<div style="margin-bottom: 20px; text-align: center;"><img src="${logoUrl}" alt="AGORA" data-email-logo="true" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" /></div>`;

const updateLogoInContent = (content: string, logoUrl: string) => {
  if (typeof window === 'undefined') {
    return buildLogoHtml(logoUrl) + content;
  }

  const doc = new DOMParser().parseFromString(`<div>${content}</div>`, 'text/html');
  const container = doc.body.firstElementChild as HTMLElement | null;
  if (!container) {
    return buildLogoHtml(logoUrl) + content;
  }

  const logoSelector = 'img[data-email-logo="true"], img[alt="AGORA"], img[src*="agora_logo"]';
  const existingLogo = container.querySelector(logoSelector) as HTMLImageElement | null;

  if (existingLogo) {
    existingLogo.src = logoUrl;
    existingLogo.setAttribute('data-email-logo', 'true');
  } else {
    container.insertAdjacentHTML('afterbegin', buildLogoHtml(logoUrl));
  }

  return container.innerHTML;
};

const updateLogoBackgroundInContent = (content: string, color: string) => {
  if (typeof window === 'undefined') {
    return content;
  }

  const doc = new DOMParser().parseFromString(`<div>${content}</div>`, 'text/html');
  const container = doc.body.firstElementChild as HTMLElement | null;
  if (!container) {
    return content;
  }

  const logoSelector = 'img[data-email-logo="true"], img[alt="AGORA"], img[src*="agora_logo"]';
  const logoImg = container.querySelector(logoSelector) as HTMLImageElement | null;
  if (!logoImg) {
    return container.innerHTML;
  }

  const candidates: HTMLElement[] = [];
  let node: HTMLElement | null = logoImg;
  while (node && node !== container) {
    if (node.matches && node.matches('td, div, table')) {
      candidates.push(node);
    }
    node = node.parentElement;
  }

  const selectTarget = () => {
    for (const candidate of candidates) {
      const style = candidate.getAttribute('style') || '';
      if (!/background-color\s*:/i.test(style)) {
        continue;
      }

      const hasBorderRadius = /border-radius\s*:/i.test(style);
      const hasPadding = /padding\s*:/i.test(style);
      const hasCenter = /text-align\s*:\s*center/i.test(style);
      const isFullWidthTable =
        candidate.tagName.toLowerCase() === 'table' &&
        (candidate.getAttribute('width') === '100%' || /width\s*:\s*100%/i.test(style));

      if (!isFullWidthTable && (hasBorderRadius || hasPadding || hasCenter)) {
        return candidate;
      }
    }

    return candidates.find((candidate) => {
      const style = candidate.getAttribute('style') || '';
      const isFullWidthTable =
        candidate.tagName.toLowerCase() === 'table' &&
        (candidate.getAttribute('width') === '100%' || /width\s*:\s*100%/i.test(style));
      return /background-color\s*:/i.test(style) && !isFullWidthTable;
    }) || null;
  };

  const target = selectTarget();
  if (!target) {
    return container.innerHTML;
  }

  const currentStyle = target.getAttribute('style') || '';
  const hasBackground = /background-color\s*:/i.test(currentStyle);
  const updatedStyle = hasBackground
    ? currentStyle.replace(
        /background-color\s*:\s*[^;"]+/i,
        `background-color: ${color}`
      )
    : `${currentStyle ? `${currentStyle}; ` : ''}background-color: ${color}`;

  target.setAttribute('style', updatedStyle);
  return container.innerHTML;
};

// Templates HTML por defecto
const defaultTemplates: Record<EmailTriggerType, string> = {
  user_registration: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a LOCALIA</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">¡Bienvenido a LOCALIA!</h1>
  </div>
  <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hola {{user_name}},</p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Nos complace darte la bienvenida a LOCALIA. Estamos emocionados de tenerte como parte de nuestra comunidad.
    </p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Tu cuenta ha sido creada exitosamente. Ahora puedes comenzar a explorar nuestros productos y servicios.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboard_url}}" style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
        Comenzar a Explorar
      </a>
    </div>
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      Si tienes alguna pregunta, no dudes en contactarnos.
    </p>
    <p style="font-size: 14px; color: #6b7280; margin-top: 10px;">
      Saludos,<br>
      El equipo de LOCALIA
    </p>
  </div>
</body>
</html>`,
  order_confirmation: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Pedido</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">¡Pedido Confirmado!</h1>
  </div>
  <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hola {{user_name}},</p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Gracias por tu compra. Hemos recibido tu pedido y lo estamos procesando.
    </p>
    <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <h2 style="margin-top: 0; color: #4F46E5;">Detalles del Pedido</h2>
      <p><strong>Número de Pedido:</strong> {{order_number}}</p>
      <p><strong>Fecha:</strong> {{order_date}}</p>
      <p><strong>Total:</strong> {{order_total}}</p>
      <p><strong>Método de Pago:</strong> {{payment_method}}</p>
    </div>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Te notificaremos cuando tu pedido esté en camino.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{order_url}}" style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
        Ver Pedido
      </a>
    </div>
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      Si tienes alguna pregunta sobre tu pedido, contáctanos.
    </p>
  </div>
</body>
</html>`,
  order_status_change: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Actualización de Pedido</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">Actualización de Pedido</h1>
  </div>
  <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hola {{user_name}},</p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Tu pedido #{{order_number}} ha cambiado de estado.
    </p>
    <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Estado Anterior:</strong> {{previous_status}}</p>
      <p style="margin: 10px 0 0 0;"><strong>Estado Actual:</strong> <span style="color: #4F46E5; font-weight: bold;">{{current_status}}</span></p>
    </div>
    <p style="font-size: 16px; margin-bottom: 20px;">
      {{status_message}}
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{order_url}}" style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
        Ver Detalles del Pedido
      </a>
    </div>
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      Gracias por confiar en LOCALIA.
    </p>
  </div>
</body>
</html>`,
};

export default function EmailsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedBusiness, availableBusinesses } = useSelectedBusiness();
  const [loading, setLoading] = useState(true);
  const [loadingContext, setLoadingContext] = useState(true);
  const [loadingGlobalTemplates, setLoadingGlobalTemplates] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorContent, setEditorContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [templateLevel, setTemplateLevel] = useState<EmailTemplateLevel>('business');
  const [businessGroup, setBusinessGroup] = useState<{ id: string; name: string } | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [primaryColor, setPrimaryColor] = useState<string>('#4F46E5');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [managementMode, setManagementMode] = useState<'group' | 'business'>('business');
  const editorRef = useRef<HTMLDivElement>(null);
  const isInitializingEditor = useRef(false);
  const [globalTemplates, setGlobalTemplates] = useState<Record<EmailTriggerType, EmailTemplate | null>>({
    user_registration: null,
    order_confirmation: null,
    order_status_change: null,
  });

  // Calcular loading general: solo mostrar interfaz cuando todas las peticiones estén completas
  useEffect(() => {
    setLoading(loadingContext || loadingGlobalTemplates || loadingTemplates);
  }, [loadingContext, loadingGlobalTemplates, loadingTemplates]);

  // Cargar contexto inicial (grupo y sucursales)
  useEffect(() => {
    const loadContext = async () => {
      if (!user) {
        setLoadingContext(false);
        return;
      }

      try {
        setLoadingContext(true);
        setError(null);

        // Verificar si es superadmin
        const hasSuperadminRole = availableBusinesses.some(b => b.role === 'superadmin');
        setIsSuperadmin(hasSuperadminRole);

        // Cargar grupo empresarial
        let loadedGroup: { id: string; name: string } | null = null;
        try {
          const group = await businessService.getMyBusinessGroup();
          if (group) {
            loadedGroup = { id: group.id, name: group.name };
            setBusinessGroup(loadedGroup);
          }
        } catch (err) {
          // No hay grupo, continuar sin él
        }

        // Cargar sucursales disponibles
        try {
          const allBranches = await businessService.getAllBranches(user.id);
          const branchesList = allBranches.map(b => ({ id: b.id, name: b.name }));
          setBranches(branchesList);
          
          // Si hay sucursal seleccionada, usarla por defecto
          if (selectedBusiness && branchesList.length > 0) {
            const foundBranch = branchesList.find(b => b.id === selectedBusiness.business_id);
            if (foundBranch) {
              setSelectedBranchId(foundBranch.id);
            } else if (branchesList.length > 0) {
              setSelectedBranchId(branchesList[0].id);
            }
          } else if (branchesList.length > 0) {
            setSelectedBranchId(branchesList[0].id);
          }
        } catch (err) {
          console.error('Error cargando sucursales:', err);
        }

        // Establecer modo inicial: si hay grupo y es superadmin, permitir elegir; si no, solo business
        if (loadedGroup && hasSuperadminRole) {
          // Si hay grupo y es superadmin, por defecto mostrar grupo pero permitir cambiar
          setManagementMode('group');
        } else {
          setManagementMode('business');
        }
      } catch (err: any) {
        console.error('Error cargando contexto:', err);
        setError('Error al cargar el contexto');
      } finally {
        setLoadingContext(false);
      }
    };

    if (user) {
      loadContext();
    } else {
      setLoadingContext(false);
    }
  }, [user, availableBusinesses]);

  // Cargar templates globales una vez al inicio
  useEffect(() => {
    const loadGlobalTemplates = async () => {
      try {
        setLoadingGlobalTemplates(true);
        const globalTemplatesList = await emailTemplatesService.list('global');
        const globalTemplatesMap: Record<EmailTriggerType, EmailTemplate | null> = {
          user_registration: null,
          order_confirmation: null,
          order_status_change: null,
        };
        
        globalTemplatesList.forEach((template) => {
          if (template.trigger_type in globalTemplatesMap) {
            globalTemplatesMap[template.trigger_type as EmailTriggerType] = template;
          }
        });
        
        setGlobalTemplates(globalTemplatesMap);
      } catch (err: any) {
        console.error('Error cargando templates globales:', err);
      } finally {
        setLoadingGlobalTemplates(false);
      }
    };

    loadGlobalTemplates();
  }, []);

  // Actualizar templateLevel cuando cambia managementMode y limpiar selección
  useEffect(() => {
    setTemplateLevel(managementMode);
    // Limpiar selección al cambiar de modo
    setSelectedTemplate(null);
    setEditingTemplate(null);
    setEditorContent('');
    // Limpiar el editor
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  }, [managementMode]);

  // Sincronizar el contenido del editor solo cuando cambia editorContent y no estamos editando
  useEffect(() => {
    if (editorRef.current && !isInitializingEditor.current && editingTemplate) {
      // Solo actualizar si el contenido es diferente para evitar loops
      const currentContent = editorRef.current.innerHTML;
      if (currentContent !== editorContent && editorContent) {
        // Guardar la posición del cursor antes de actualizar
        const savedRange = saveSelection();
        editorRef.current.innerHTML = editorContent;
        // Restaurar la posición del cursor si existe
        if (savedRange) {
          requestAnimationFrame(() => {
            restoreSelection(savedRange);
          });
        }
      }
    }
  }, [editingTemplate?.id]); // Solo cuando cambia el template que se está editando

  // Cargar templates según el modo seleccionado
  useEffect(() => {
    const loadTemplates = async () => {
      if (!templateLevel) {
        setLoadingTemplates(false);
        return;
      }

      try {
        setLoadingTemplates(true);
        setError(null);

        const filters: { business_group_id?: string; business_id?: string } = {};
        
        if (templateLevel === 'group' && businessGroup) {
          filters.business_group_id = businessGroup.id;
        } else if (templateLevel === 'business' && selectedBranchId) {
          filters.business_id = selectedBranchId;
        } else if (templateLevel === 'business' && selectedBusiness) {
          // Fallback a selectedBusiness si no hay selectedBranchId
          filters.business_id = selectedBusiness.business_id;
        }

        if ((templateLevel === 'group' && !businessGroup) || (templateLevel === 'business' && !filters.business_id)) {
          setLoadingTemplates(false);
          return;
        }

        const loadedTemplates = await emailTemplatesService.list(templateLevel, filters);
        setTemplates(loadedTemplates);
      } catch (err: any) {
        console.error('Error cargando templates:', err);
        setError(err.message || 'Error al cargar los templates');
      } finally {
        setLoadingTemplates(false);
      }
    };

    // Solo cargar templates si el contexto ya está listo
    if (!loadingContext) {
      loadTemplates();
    }
  }, [templateLevel, businessGroup, selectedBranchId, selectedBusiness, loadingContext]);

  // Extraer contenido del body del HTML y reemplazar logo si hay logo_url
  const extractBodyContent = (html: string, logoUrl?: string): string => {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    let bodyContent = bodyMatch ? bodyMatch[1] : html;
    
    // Si hay logo_url, reemplazar el logo en el contenido
    if (logoUrl) {
      const defaultLogoUrl = 'https://agoramp.mx/_next/static/media/agora_logo_white.7075c997.png';
      const logoRegex = /<img[^>]*src="[^"]*agora_logo_white[^"]*"[^>]*>/gi;
      
      // Reemplazar todas las instancias del logo por defecto con el logo personalizado
      bodyContent = bodyContent.replace(logoRegex, (match) => {
        return match.replace(/src="[^"]*"/, `src="${logoUrl}"`);
      });
      
      // Si no se encontró el logo por defecto, buscar cualquier img con alt="AGORA" y reemplazarlo
      if (!logoRegex.test(bodyContent)) {
        const agoraLogoRegex = /<img[^>]*alt="AGORA"[^>]*>/gi;
        bodyContent = bodyContent.replace(agoraLogoRegex, (match) => {
          return match.replace(/src="[^"]*"/, `src="${logoUrl}"`);
        });
      }
    }
    
    return bodyContent;
  };

  // Reconstruir HTML completo con el contenido editado
  const rebuildTemplate = (content: string, originalTemplate: string, logoUrl?: string): string => {
    const headMatch = originalTemplate.match(/([\s\S]*)<body[^>]*>/i);
    const bodyEndMatch = originalTemplate.match(/<\/body>([\s\S]*)/i);
    
    if (headMatch && bodyEndMatch) {
      let bodyContent = content;
      
      // Si hay logo_url, reemplazar el logo en el contenido
      if (logoUrl) {
        const defaultLogoUrl = 'https://agoramp.mx/_next/static/media/agora_logo_white.7075c997.png';
        const logoRegex = /<img[^>]*src="[^"]*agora_logo_white[^"]*"[^>]*>/gi;
        
        // Reemplazar todas las instancias del logo por defecto con el logo personalizado
        bodyContent = bodyContent.replace(logoRegex, (match) => {
          return match.replace(/src="[^"]*"/, `src="${logoUrl}"`);
        });
        
        // Si no se encontró el logo por defecto, buscar cualquier img con alt="AGORA" y reemplazarlo
        if (!logoRegex.test(bodyContent)) {
          const agoraLogoRegex = /<img[^>]*alt="AGORA"[^>]*>/gi;
          bodyContent = bodyContent.replace(agoraLogoRegex, (match) => {
            return match.replace(/src="[^"]*"/, `src="${logoUrl}"`);
          });
        }
      }
      
      return headMatch[1] + '<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">' + bodyContent + '</body>' + bodyEndMatch[1];
    }
    return originalTemplate;
  };

  // Extraer color primario del template HTML
  const extractPrimaryColor = (html: string): string => {
    const colorMatch = html.match(/background-color:\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})/i);
    if (colorMatch) {
      return colorMatch[1];
    }
    return '#4F46E5'; // Color por defecto
  };

  const handleEdit = async (template: EmailTemplate) => {
    // Si el template es un placeholder (no existe), crearlo primero
    const existingTemplate = templates.find(t => t.id === template.id && t.trigger_type === template.trigger_type);
    
    if (!existingTemplate) {
      // Crear el template primero usando el template global como base
      try {
        setSaving(true);
        const triggerData = triggerInfo[template.trigger_type];
        const currentLevel = managementMode;
        
        // SIEMPRE obtener el template global DIRECTAMENTE de la base de datos
        // No usar el estado en caché para asegurar que tenemos la versión más reciente
        let globalTemplate: EmailTemplate | null = null;
        
        try {
          // Forzar la obtención del template desde la base de datos
          // Esto asegura que siempre tenemos la versión más reciente de communication.email_templates
          globalTemplate = await emailTemplatesService.getByTrigger(template.trigger_type, 'global');
          
          if (globalTemplate) {
            console.log(`✅ Template global obtenido desde BD para ${template.trigger_type}:`, {
              id: globalTemplate.id,
              hasHtml: !!globalTemplate.template_html,
              htmlLength: globalTemplate.template_html?.length,
              backgroundColor: globalTemplate.template_html?.match(/background-color:\s*([^;]+)/i)?.[1]
            });
            
            // Actualizar el estado para futuras referencias
            setGlobalTemplates(prev => ({
              ...prev,
              [template.trigger_type]: globalTemplate!,
            }));
          } else {
            console.warn(`⚠️ No se encontró template global para ${template.trigger_type}`);
          }
        } catch (error) {
          console.error('❌ Error obteniendo template global desde la base de datos:', error);
          // Intentar usar el estado en caché como último recurso
          globalTemplate = globalTemplates[template.trigger_type] || null;
          if (globalTemplate) {
            console.log(`⚠️ Usando template en caché para ${template.trigger_type}`);
          }
        }
        
        // Si no hay template global, mostrar error
        if (!globalTemplate || !globalTemplate.template_html) {
          alert('No se pudo cargar el template global desde la base de datos. Por favor, recarga la página.');
          setSaving(false);
          return;
        }
        
        // Usar el template global de la base de datos, nunca el fallback hardcodeado
        const baseTemplateHtml = globalTemplate.template_html;
        const baseSubject = globalTemplate.subject || triggerData.name;
        const baseVariables = globalTemplate.available_variables || triggerData.variables;
        
        console.log(`📝 Usando template HTML de BD (longitud: ${baseTemplateHtml.length} caracteres)`);
        
        const createData: any = {
          trigger_type: template.trigger_type,
          name: triggerData.name,
          description: triggerData.description,
          subject: baseSubject,
          template_html: baseTemplateHtml, // SIEMPRE usar el template global de la base de datos
          available_variables: baseVariables,
          is_active: true,
        };

        if (currentLevel === 'group' && businessGroup) {
          createData.business_group_id = businessGroup.id;
          createData.inherit_from_global = true;
        } else if (currentLevel === 'business' && selectedBranchId) {
          createData.business_id = selectedBranchId;
          createData.inherit_from_group = !!businessGroup;
          createData.inherit_from_global = true;
        }

        const newTemplate = await emailTemplatesService.create(currentLevel, createData);
        
        // Asegurarse de que el template creado tiene el HTML correcto de la base de datos
        // Recargar el template desde la base de datos para asegurar que tenemos la versión más reciente
        const createdTemplate = await emailTemplatesService.getById(newTemplate.id, currentLevel);
        
        // Recargar todos los templates para asegurar que tenemos la lista actualizada
        const filters: { business_group_id?: string; business_id?: string } = {};
        if (currentLevel === 'group' && businessGroup) {
          filters.business_group_id = businessGroup.id;
        } else if (currentLevel === 'business' && selectedBranchId) {
          filters.business_id = selectedBranchId;
        } else if (currentLevel === 'business' && selectedBusiness) {
          filters.business_id = selectedBusiness.business_id;
        }
        
        const updatedTemplates = await emailTemplatesService.list(currentLevel, filters);
        setTemplates(updatedTemplates);
        
        // Encontrar el template recién creado en la lista actualizada
        const finalTemplate = updatedTemplates.find(t => t.id === createdTemplate.id) || createdTemplate;
        
        // Ahora editar el template recién creado (usando el template de la base de datos)
        setEditingTemplate({ ...finalTemplate });
        setSelectedTemplate(finalTemplate);
        const bodyContent = extractBodyContent(finalTemplate.template_html, finalTemplate.logo_url);
        setEditorContent(bodyContent);
        const extractedColor = extractPrimaryColor(finalTemplate.template_html);
        setPrimaryColor(extractedColor);
        
        // Establecer el contenido en el editor después de que React haya renderizado
        isInitializingEditor.current = true;
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = bodyContent;
            isInitializingEditor.current = false;
          }
        }, 0);
      } catch (error: any) {
        console.error('Error creando template:', error);
        alert(error.message || 'Error al crear el template');
      } finally {
        setSaving(false);
      }
    } else {
      // Template existe, solo editarlo
      setEditingTemplate({ ...existingTemplate });
      setSelectedTemplate(existingTemplate);
      const bodyContent = extractBodyContent(existingTemplate.template_html, existingTemplate.logo_url);
      setEditorContent(bodyContent);
      // Extraer color primario del template
      const extractedColor = extractPrimaryColor(existingTemplate.template_html);
      setPrimaryColor(extractedColor);
      
      // Establecer el contenido en el editor después de que React haya renderizado
      isInitializingEditor.current = true;
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = bodyContent;
          isInitializingEditor.current = false;
        }
      }, 0);
    }
  };

  // Función para preservar la posición del cursor
  const saveSelection = (): Range | null => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      return selection.getRangeAt(0).cloneRange();
    }
    return null;
  };

  // Función para restaurar la posición del cursor
  const restoreSelection = (savedRange: Range | null) => {
    if (!savedRange) return;
    
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      try {
        selection.addRange(savedRange);
      } catch (e) {
        // Si falla, intentar ajustar el rango
        const range = document.createRange();
        const startContainer = savedRange.startContainer;
        const endContainer = savedRange.endContainer;
        
        if (startContainer && endContainer && editorRef.current?.contains(startContainer) && editorRef.current?.contains(endContainer)) {
          range.setStart(startContainer, savedRange.startOffset);
          range.setEnd(endContainer, savedRange.endOffset);
          selection.addRange(range);
        }
      }
    }
  };

  // Aplicar color al header y botón
  const applyColorToTemplate = (color: string) => {
    if (!editorRef.current) return;

    // Preservar la posición del cursor antes de modificar el HTML
    const savedRange = saveSelection();

    const currentHtml = editorRef.current.innerHTML;
    let updatedHtml = currentHtml;
    
    // Reemplazar color solo en el fondo donde está el logo
    updatedHtml = updateLogoBackgroundInContent(updatedHtml, color);

    // Actualizar el HTML
    editorRef.current.innerHTML = updatedHtml;
    
    // Restaurar la posición del cursor
    if (savedRange) {
      // Usar requestAnimationFrame para asegurar que el DOM se haya actualizado
      requestAnimationFrame(() => {
        restoreSelection(savedRange);
      });
    }
    
    // Actualizar el estado sin forzar re-render inmediato
    setEditorContent(updatedHtml);
  };

  const handleColorChange = (color: ColorResult) => {
    const hexColor = color.hex;
    setPrimaryColor(hexColor);
    applyColorToTemplate(hexColor);
  };

  const handleSave = async () => {
    if (!editingTemplate || !editorRef.current) return;

    setSaving(true);
    try {
      // Obtener contenido del editor
      const editedContent = editorRef.current.innerHTML;
      
      // Reconstruir template completo (usar logo_url si existe)
      const updatedHtml = rebuildTemplate(editedContent, editingTemplate.template_html, editingTemplate.logo_url);

      // Determinar el nivel actual según el modo de gestión
      const currentLevel = managementMode;

      // Guardar en el backend
      const updatedTemplate = await emailTemplatesService.update(
        editingTemplate.id,
        currentLevel,
        {
          subject: editingTemplate.subject,
          template_html: updatedHtml,
          is_active: editingTemplate.is_active,
          logo_url: editingTemplate.logo_url,
        }
      );

      // Actualizar estado local
      setTemplates(templates.map(t => 
        t.id === updatedTemplate.id ? updatedTemplate : t
      ));
      setSelectedTemplate(updatedTemplate);
      setEditingTemplate(null);
      setEditorContent('');
    } catch (error: any) {
      console.error('Error guardando template:', error);
      alert(error.message || 'Error al guardar el template');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingTemplate(null);
    setSelectedTemplate(null);
    setEditorContent('');
  };

  const toggleTemplateActive = async (template: EmailTemplate) => {
    try {
      const currentLevel = managementMode;
      const updatedTemplate = await emailTemplatesService.toggleActive(
        template.id,
        currentLevel,
        !template.is_active
      );
      setTemplates(templates.map(t => 
        t.id === updatedTemplate.id ? updatedTemplate : t
      ));
    } catch (error: any) {
      console.error('Error cambiando estado del template:', error);
      alert(error.message || 'Error al cambiar el estado del template');
    }
  };

  // Obtener todos los triggers disponibles
  const allTriggers: EmailTriggerType[] = ['user_registration', 'order_confirmation', 'order_status_change'];

  // Obtener templates para mostrar (uno por cada trigger)
  const displayTemplates = allTriggers.map(trigger => {
    const template = templates.find(t => t.trigger_type === trigger);
    if (template) {
      return template;
    }
    // Si no existe localmente, usar el template global de la base de datos
    const globalTemplate = globalTemplates[trigger];
    if (globalTemplate) {
      return {
        ...globalTemplate,
        id: trigger, // Usar el trigger como ID temporal para identificar que no existe localmente
        level: templateLevel,
      } as EmailTemplate;
    }
    // Fallback: si no hay template global, usar el default (solo como último recurso)
    const triggerData = triggerInfo[trigger];
    return {
      id: trigger,
      trigger_type: trigger,
      name: triggerData.name,
      description: triggerData.description,
      subject: triggerData.name,
      template_html: defaultTemplates[trigger],
      available_variables: triggerData.variables,
      is_active: false,
      level: templateLevel,
    } as EmailTemplate;
  });

  // Mostrar loading solo cuando todas las peticiones estén completas
  if (loading) {
    return (
      <>
        <Head>
          <title>Correos - LOCALIA Local</title>
        </Head>
        <LocalLayout>
          <div className="flex h-full bg-gray-50">
            <SettingsSidebar />
            <div className="flex-1 min-w-0 overflow-y-auto">
              <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              </div>
            </div>
          </div>
        </LocalLayout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Correos - LOCALIA Local</title>
      </Head>
      <LocalLayout>
        <div className="flex h-full bg-gray-50">
          <SettingsSidebar />

          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-6 py-8">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-xl font-normal text-gray-900 mb-2">Correos</h1>
                <p className="text-sm text-gray-600 mb-4">
                  Gestiona los templates de correos electrónicos que se envían automáticamente
                </p>

                {/* Tabs de gestión: Grupo y Sucursales */}
                <div className="mb-6">
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                      {/* Tab de Grupo Empresarial (solo si es superadmin y hay grupo) */}
                      {businessGroup && isSuperadmin && (
                        <button
                          type="button"
                          onClick={() => setManagementMode('group')}
                          className={`whitespace-nowrap py-4 px-1 border-b-2 font-normal text-sm transition-colors ${
                            managementMode === 'group'
                              ? 'border-indigo-500 text-indigo-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          Grupo Empresarial
                          <span className="ml-2 text-xs text-gray-400">({businessGroup.name})</span>
                        </button>
                      )}

                      {/* Tabs de Sucursales */}
                      {branches.map((branch) => (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => {
                            setManagementMode('business');
                            setSelectedBranchId(branch.id);
                          }}
                          className={`whitespace-nowrap py-4 px-1 border-b-2 font-normal text-sm transition-colors ${
                            managementMode === 'business' && selectedBranchId === branch.id
                              ? 'border-indigo-500 text-indigo-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {branch.name}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>

                {/* Información del contexto actual */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500">
                    {managementMode === 'group' && businessGroup && (
                      <>Gestionando templates del grupo: <strong>{businessGroup.name}</strong></>
                    )}
                    {managementMode === 'business' && selectedBranchId && (
                      <>Gestionando templates de la sucursal: <strong>{branches.find(b => b.id === selectedBranchId)?.name || 'N/A'}</strong></>
                    )}
                  </p>
                </div>

                {error && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}
              </div>

              {!selectedTemplate && !editingTemplate && (
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-normal text-gray-900">Templates de Correo</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Los correos se envían automáticamente desde agoramp.mx
                    </p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {displayTemplates.map((template) => {
                      const isPlaceholder = !templates.find(t => t.id === template.id && t.trigger_type === template.trigger_type);
                      return (
                        <div
                          key={template.trigger_type}
                          className="p-6 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-base font-normal text-gray-900">
                                  {template.name}
                                </h3>
                                {!isPlaceholder && (
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-normal ${
                                      template.is_active
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {template.is_active ? 'Activo' : 'Inactivo'}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span><strong>Asunto:</strong> {template.subject}</span>
                                <span><strong>Variables:</strong> {template.available_variables.join(', ')}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {!isPlaceholder && (
                                <button
                                  onClick={() => toggleTemplateActive(template)}
                                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                                    template.is_active
                                      ? 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                                      : 'text-green-700 bg-green-100 hover:bg-green-200'
                                  }`}
                                >
                                  {template.is_active ? 'Desactivar' : 'Activar'}
                                </button>
                              )}
                              <button
                                onClick={() => handleEdit(template)}
                                className="px-3 py-1.5 text-sm text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
                              >
                                {isPlaceholder ? 'Crear' : 'Editar'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(selectedTemplate || editingTemplate) && (
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-normal text-gray-900">
                          {editingTemplate?.name || selectedTemplate?.name}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          {editingTemplate?.description || selectedTemplate?.description}
                        </p>
                      </div>
                      {!editingTemplate && (
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          Cerrar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    {editingTemplate ? (
                      <div className="space-y-6">
                        {/* Asunto */}
                        <div>
                          <label className="block text-sm font-normal text-gray-700 mb-2">
                            Asunto del Correo
                          </label>
                          <input
                            type="text"
                            value={editingTemplate.subject}
                            onChange={(e) =>
                              setEditingTemplate({
                                ...editingTemplate,
                                subject: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Asunto del correo"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Puedes usar variables como {'{{order_number}}'}, {'{{user_name}}'}, etc.
                          </p>
                        </div>

                        {/* Variables disponibles */}
                        <div>
                          <label className="block text-sm font-normal text-gray-700 mb-2">
                            Variables Disponibles
                          </label>
                          <div className="bg-gray-50 rounded-md p-4">
                            <div className="flex flex-wrap gap-2">
                              {editingTemplate.available_variables.map((variable) => (
                                <span
                                  key={variable}
                                  className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-md text-xs font-normal"
                                >
                                  {'{{' + variable + '}}'}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-3">
                              Usa estas variables en el asunto y en el cuerpo del correo
                            </p>
                          </div>
                        </div>

                        {/* Editor Visual */}
                        <div>
                          <label className="block text-sm font-normal text-gray-700 mb-2">
                            Contenido del Correo
                          </label>
                          
                          {/* Barra de herramientas */}
                          <div className="border border-gray-300 rounded-t-md bg-gray-50 p-2 flex items-center gap-2 flex-wrap">
                            {/* Logo Upload */}
                            <label className="px-3 py-1.5 text-sm font-normal text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file || !editingTemplate) return;

                                  try {
                                    setSaving(true);
                                    const currentLevel = managementMode;
                                    
                                    // Subir logo al backend
                                    const uploadResult = await emailTemplatesService.uploadLogo(
                                      editingTemplate.id,
                                      currentLevel,
                                      file
                                    );

                                    // Actualizar el template con la URL del logo
                                    const updatedTemplate = await emailTemplatesService.update(
                                      editingTemplate.id,
                                      currentLevel,
                                      {
                                        logo_url: uploadResult.url,
                                      }
                                    );

                                    // Actualizar estado local
                                    setEditingTemplate(updatedTemplate);
                                    setTemplates(templates.map(t => 
                                      t.id === updatedTemplate.id ? updatedTemplate : t
                                    ));

                                    // Reemplazar el logo en el HTML del template
                                    if (editorRef.current) {
                                      const currentContent = editorRef.current.innerHTML;
                                      const updatedContent = updateLogoInContent(currentContent, uploadResult.url);
                                      editorRef.current.innerHTML = updatedContent;
                                      setEditorContent(updatedContent);
                                    }
                                  } catch (error: any) {
                                    console.error('Error subiendo logo:', error);
                                    alert(error.message || 'Error al subir el logo');
                                  } finally {
                                    setSaving(false);
                                  }
                                }}
                              />
                              📷 Logo
                            </label>
                            
                            <div className="h-4 w-px bg-gray-300"></div>
                            
                            {/* Color Picker */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                className="px-3 py-1.5 text-sm font-normal text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
                                title="Color del Header y Botón"
                              >
                                <div
                                  className="w-4 h-4 rounded border border-gray-300"
                                  style={{ backgroundColor: primaryColor }}
                                />
                                Color
                              </button>
                              {showColorPicker && (
                                <>
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowColorPicker(false)}
                                  />
                                  <div
                                    className="absolute z-50 mt-2 left-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <SketchPicker
                                      color={primaryColor}
                                      onChange={handleColorChange}
                                      disableAlpha={false}
                                      width="250px"
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                            
                            <div className="h-4 w-px bg-gray-300"></div>
                            
                            {/* Tamaños de texto */}
                            <select
                              className="px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white"
                              onChange={(e) => {
                                const size = e.target.value;
                                if (size) {
                                  document.execCommand('fontSize', false, size === 'small' ? '2' : size === 'medium' ? '3' : '4');
                                }
                              }}
                              defaultValue=""
                            >
                              <option value="">Tamaño</option>
                              <option value="small">Chico</option>
                              <option value="medium">Mediano</option>
                              <option value="large">Grande</option>
                            </select>
                            
                            {/* Negrita */}
                            <button
                              type="button"
                              onClick={() => document.execCommand('bold', false)}
                              className="px-3 py-1.5 text-sm font-normal text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                              title="Negrita"
                            >
                              <strong>B</strong>
                            </button>
                            
                            {/* Cursiva */}
                            <button
                              type="button"
                              onClick={() => document.execCommand('italic', false)}
                              className="px-3 py-1.5 text-sm font-normal text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                              title="Cursiva"
                            >
                              <em>I</em>
                            </button>
                            
                            <div className="h-4 w-px bg-gray-300"></div>
                            
                            {/* Variables */}
                            <select
                              className="px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white"
                              onChange={(e) => {
                                if (e.target.value && editorRef.current) {
                                  // Preservar la posición del cursor
                                  const selection = window.getSelection();
                                  const range = selection?.getRangeAt(0);
                                  
                                  // Insertar el texto
                                  document.execCommand('insertText', false, `{{${e.target.value}}}`);
                                  e.target.value = '';
                                  
                                  // No actualizar el estado inmediatamente para evitar pérdida de foco
                                  // El contenido ya está en el DOM
                                }
                              }}
                              defaultValue=""
                            >
                              <option value="">Insertar Variable</option>
                              {editingTemplate.available_variables.map((variable) => (
                                <option key={variable} value={variable}>
                                  {variable}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          {/* Editor visual */}
                          <div
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={(e) => {
                              // No actualizar el estado durante la edición para evitar pérdida de foco
                              // El contenido se mantiene en el DOM directamente
                              // Solo actualizamos el estado cuando el usuario sale del editor (onBlur)
                            }}
                            onBlur={(e) => {
                              // Solo actualizar el estado cuando el usuario sale del editor
                              if (!isInitializingEditor.current) {
                                setEditorContent(e.currentTarget.innerHTML);
                              }
                            }}
                            className="w-full min-h-[400px] px-4 py-3 border-x border-b border-gray-300 rounded-b-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                            style={{
                              fontFamily: 'Arial, sans-serif',
                              lineHeight: '1.6',
                              color: '#333',
                            }}
                          />
                          
                          <p className="text-xs text-gray-500 mt-2">
                            Edita el contenido directamente. Usa las variables disponibles desde el menú desplegable.
                          </p>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                          <button
                            onClick={handleCancel}
                            className="px-4 py-2 text-sm font-normal text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 text-sm font-normal text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-normal text-gray-700 mb-2">
                            Asunto
                          </label>
                          <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                            {selectedTemplate?.subject}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-normal text-gray-700 mb-2">
                            Vista Previa del Template
                          </label>
                          <div className="border border-gray-300 rounded-md overflow-hidden">
                            <iframe
                              srcDoc={selectedTemplate?.template_html || ''}
                              className="w-full h-96 border-0"
                              title="Preview"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                          <button
                            onClick={() => handleEdit(selectedTemplate!)}
                            className="px-4 py-2 text-sm font-normal text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
                          >
                            Editar Template
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </LocalLayout>
    </>
  );
}
