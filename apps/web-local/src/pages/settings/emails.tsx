import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import LocalLayout from '@/components/layout/LocalLayout';
import SettingsSidebar from '@/components/settings/SettingsSidebar';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
  trigger: 'user_registration' | 'order_confirmation' | 'order_status_change';
  is_active: boolean;
  template: string;
  variables: string[];
}

const defaultTemplates: EmailTemplate[] = [
  {
    id: 'user_registration',
    name: 'Correo de Bienvenida',
    subject: 'Bienvenido a LOCALIA',
    description: 'Se envía cuando un usuario se registra en la plataforma',
    trigger: 'user_registration',
    is_active: true,
    template: `<!DOCTYPE html>
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
      <a href="{{app_url}}" style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
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
    variables: ['user_name', 'app_url'],
  },
  {
    id: 'order_confirmation',
    name: 'Confirmación de Pedido',
    subject: 'Confirmación de tu pedido #{{order_number}}',
    description: 'Se envía cuando se confirma un pedido',
    trigger: 'order_confirmation',
    is_active: true,
    template: `<!DOCTYPE html>
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
    variables: ['user_name', 'order_number', 'order_date', 'order_total', 'payment_method', 'order_url'],
  },
  {
    id: 'order_status_change',
    name: 'Cambio de Estado de Pedido',
    subject: 'Actualización de tu pedido #{{order_number}}',
    description: 'Se envía cuando cambia el estado de un pedido',
    trigger: 'order_status_change',
    is_active: true,
    template: `<!DOCTYPE html>
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
    variables: ['user_name', 'order_number', 'previous_status', 'current_status', 'status_message', 'order_url'],
  },
];

export default function EmailsPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(defaultTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorContent, setEditorContent] = useState<string>('');
  const editorRef = useRef<HTMLDivElement>(null);

  // Extraer contenido del body del HTML
  const extractBodyContent = (html: string): string => {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
      return bodyMatch[1];
    }
    return html;
  };

  // Reconstruir HTML completo con el contenido editado
  const rebuildTemplate = (content: string, originalTemplate: string): string => {
    const headMatch = originalTemplate.match(/([\s\S]*)<body[^>]*>/i);
    const bodyEndMatch = originalTemplate.match(/<\/body>([\s\S]*)/i);
    
    if (headMatch && bodyEndMatch) {
      return headMatch[1] + '<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">' + content + '</body>' + bodyEndMatch[1];
    }
    return originalTemplate;
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate({ ...template });
    setSelectedTemplate(template);
    const bodyContent = extractBodyContent(template.template);
    setEditorContent(bodyContent);
  };

  const handleSave = async () => {
    if (!editingTemplate || !editorRef.current) return;

    setSaving(true);
    try {
      // Obtener contenido del editor
      const editedContent = editorRef.current.innerHTML;
      
      // Reconstruir template completo
      const updatedTemplate = {
        ...editingTemplate,
        template: rebuildTemplate(editedContent, editingTemplate.template),
      };

      // TODO: Implementar guardado en backend
      // Por ahora solo actualizamos el estado local
      setTemplates(templates.map(t => 
        t.id === updatedTemplate.id ? updatedTemplate : t
      ));
      setSelectedTemplate(updatedTemplate);
      setEditingTemplate(null);
      setEditorContent('');
      
      // Simular delay de guardado
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Error guardando template:', error);
      alert('Error al guardar el template');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingTemplate(null);
    setSelectedTemplate(null);
  };

  const toggleTemplateActive = async (templateId: string) => {
    // TODO: Implementar toggle en backend
    setTemplates(templates.map(t => 
      t.id === templateId ? { ...t, is_active: !t.is_active } : t
    ));
  };

  return (
    <>
      <Head>
        <title>Correos - LOCALIA Local</title>
      </Head>
      <LocalLayout>
        <div className="flex h-full bg-gray-50">
          {/* Sidebar: Categorías */}
          <SettingsSidebar />

          {/* Contenido principal */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-6 py-8">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-xl font-normal text-gray-900 mb-2">Correos</h1>
                <p className="text-sm text-gray-600">
                  Gestiona los templates de correos electrónicos que se envían automáticamente
                </p>
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
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="p-6 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-base font-normal text-gray-900">
                                {template.name}
                              </h3>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-normal ${
                                  template.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {template.is_active ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span><strong>Asunto:</strong> {template.subject}</span>
                              <span><strong>Variables:</strong> {template.variables.join(', ')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => toggleTemplateActive(template.id)}
                              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                                template.is_active
                                  ? 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                                  : 'text-green-700 bg-green-100 hover:bg-green-200'
                              }`}
                            >
                              {template.is_active ? 'Desactivar' : 'Activar'}
                            </button>
                            <button
                              onClick={() => handleEdit(template)}
                              className="px-3 py-1.5 text-sm text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
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
                              {editingTemplate.variables.map((variable) => (
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
                            <div className="flex items-center gap-2">
                              <label className="px-3 py-1.5 text-sm font-normal text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file && editorRef.current) {
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        const logoUrl = event.target?.result as string;
                                        const logoHtml = `<div style="text-align: center; margin-bottom: 20px;"><img src="${logoUrl}" alt="Logo" style="max-width: 200px; height: auto;" /></div>`;
                                        
                                        // Insertar logo al inicio del contenido editable
                                        const currentContent = editorRef.current.innerHTML;
                                        editorRef.current.innerHTML = logoHtml + currentContent;
                                        setEditorContent(editorRef.current.innerHTML);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                                📷 Logo
                              </label>
                            </div>
                            
                            <div className="h-4 w-px bg-gray-300"></div>
                            
                            {/* Tamaños de texto */}
                            <select
                              className="px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white"
                              onChange={(e) => {
                                const size = e.target.value;
                                document.execCommand('fontSize', false, size === 'small' ? '2' : size === 'medium' ? '3' : '4');
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
                                if (e.target.value) {
                                  document.execCommand('insertText', false, `{{${e.target.value}}}`);
                                  e.target.value = '';
                                }
                              }}
                              defaultValue=""
                            >
                              <option value="">Insertar Variable</option>
                              {editingTemplate.variables.map((variable) => (
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
                            dangerouslySetInnerHTML={{ __html: editorContent }}
                            onInput={(e) => {
                              setEditorContent(e.currentTarget.innerHTML);
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
                              srcDoc={selectedTemplate?.template || ''}
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

