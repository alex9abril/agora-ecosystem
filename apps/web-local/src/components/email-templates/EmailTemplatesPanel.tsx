'use client';

import { useState, useEffect, useRef } from 'react';
import { SketchPicker, ColorResult } from 'react-color';
import {
  emailTemplatesService,
  EmailTemplate,
  EmailTemplateLevel,
  EmailTriggerType,
} from '@/lib/email-templates';
import {
  triggerInfo,
  defaultTemplates,
  extractBodyContent,
  rebuildTemplate,
  extractPrimaryColor,
  updateLogoInContent,
  updateLogoBackgroundInContent,
} from '@/lib/email-templates-constants';

export interface EmailTemplatesPanelProps {
  level: 'group' | 'business';
  businessGroupId?: string;
  businessId?: string;
  contextName: string;
}

const allTriggers: EmailTriggerType[] = ['user_registration', 'order_confirmation', 'order_status_change', 'supervisor_notification'];

export default function EmailTemplatesPanel({ level, businessGroupId, businessId, contextName }: EmailTemplatesPanelProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [loadingGlobalTemplates, setLoadingGlobalTemplates] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#4F46E5');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [globalTemplates, setGlobalTemplates] = useState<Record<EmailTriggerType, EmailTemplate | null>>({
    user_registration: null,
    order_confirmation: null,
    order_status_change: null,
    supervisor_notification: null,
  });
  const editorRef = useRef<HTMLDivElement>(null);
  const isInitializingEditor = useRef(false);

  const templateLevel: EmailTemplateLevel = level;
  const loading = loadingGlobalTemplates || loadingTemplates;

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingGlobalTemplates(true);
        const list = await emailTemplatesService.list('global');
        const map: Record<EmailTriggerType, EmailTemplate | null> = {
          user_registration: null,
          order_confirmation: null,
          order_status_change: null,
          supervisor_notification: null,
        };
        list.forEach((t) => {
          if (t.trigger_type in map) map[t.trigger_type as EmailTriggerType] = t;
        });
        setGlobalTemplates(map);
      } catch (err) {
        console.error('Error cargando templates globales:', err);
      } finally {
        setLoadingGlobalTemplates(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!templateLevel) {
      setLoadingTemplates(false);
      return;
    }
    const filters: { business_group_id?: string; business_id?: string } = {};
    if (templateLevel === 'group' && businessGroupId) filters.business_group_id = businessGroupId;
    else if (templateLevel === 'business' && businessId) filters.business_id = businessId;
    if ((templateLevel === 'group' && !businessGroupId) || (templateLevel === 'business' && !businessId)) {
      setLoadingTemplates(false);
      return;
    }
    const load = async () => {
      try {
        setLoadingTemplates(true);
        setError(null);
        const loaded = await emailTemplatesService.list(templateLevel, filters);
        setTemplates(loaded);
      } catch (err: any) {
        setError(err.message || 'Error al cargar los templates');
      } finally {
        setLoadingTemplates(false);
      }
    };
    load();
  }, [templateLevel, businessGroupId, businessId]);

  useEffect(() => {
    if (!editingTemplate) return;
    const sync = () => {
      if (editorRef.current && !isInitializingEditor.current && editorContent) {
        if (editorRef.current.innerHTML !== editorContent) editorRef.current.innerHTML = editorContent;
      }
    };
    sync();
  }, [editingTemplate?.id]);

  const displayTemplates = allTriggers.map((trigger) => {
    const t = templates.find((x) => x.trigger_type === trigger);
    if (t) return t;
    const global = globalTemplates[trigger];
    if (global) return { ...global, id: trigger, level: templateLevel } as EmailTemplate;
    const info = triggerInfo[trigger];
    return {
      id: trigger,
      trigger_type: trigger,
      name: info.name,
      description: info.description,
      subject: info.name,
      template_html: defaultTemplates[trigger],
      available_variables: info.variables,
      is_active: false,
      level: templateLevel,
    } as EmailTemplate;
  });

  const saveSelection = (): Range | null => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) return sel.getRangeAt(0).cloneRange();
    return null;
  };
  const restoreSelection = (r: Range | null) => {
    if (!r) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      try {
        sel.addRange(r);
      } catch {
        if (editorRef.current?.contains(r.startContainer) && editorRef.current?.contains(r.endContainer)) {
          const range = document.createRange();
          range.setStart(r.startContainer, r.startOffset);
          range.setEnd(r.endContainer, r.endOffset);
          sel.addRange(range);
        }
      }
    }
  };

  const applyColorToTemplate = (color: string) => {
    if (!editorRef.current) return;
    const saved = saveSelection();
    const updated = updateLogoBackgroundInContent(editorRef.current.innerHTML, color);
    editorRef.current.innerHTML = updated;
    if (saved) requestAnimationFrame(() => restoreSelection(saved));
    setEditorContent(updated);
  };

  const handleColorChange = (c: ColorResult) => {
    setPrimaryColor(c.hex);
    applyColorToTemplate(c.hex);
  };

  const handleEdit = async (template: EmailTemplate) => {
    const existing = templates.find((t) => t.id === template.id && t.trigger_type === template.trigger_type);
    if (!existing) {
      try {
        setSaving(true);
        const info = triggerInfo[template.trigger_type];
        let globalTemplate: EmailTemplate | null = null;
        try {
          globalTemplate = await emailTemplatesService.getByTrigger(template.trigger_type, 'global');
        } catch {
          globalTemplate = globalTemplates[template.trigger_type] || null;
        }
        if (!globalTemplate?.template_html) {
          alert('No se pudo cargar el template global. Recarga la página.');
          setSaving(false);
          return;
        }
        const createData: any = {
          trigger_type: template.trigger_type,
          name: info.name,
          description: info.description,
          subject: globalTemplate.subject || info.name,
          template_html: globalTemplate.template_html,
          available_variables: globalTemplate.available_variables || info.variables,
          is_active: true,
        };
        if (level === 'group' && businessGroupId) {
          createData.business_group_id = businessGroupId;
          createData.inherit_from_global = true;
        } else if (level === 'business' && businessId) {
          createData.business_id = businessId;
          createData.inherit_from_group = true;
          createData.inherit_from_global = true;
        }
        const newTemplate = await emailTemplatesService.create(templateLevel, createData);
        const created = await emailTemplatesService.getById(newTemplate.id, templateLevel);
        const filters: { business_group_id?: string; business_id?: string } = {};
        if (level === 'group' && businessGroupId) filters.business_group_id = businessGroupId;
        if (level === 'business' && businessId) filters.business_id = businessId;
        const updatedList = await emailTemplatesService.list(templateLevel, filters);
        setTemplates(updatedList);
        const final = updatedList.find((t) => t.id === created.id) || created;
        setEditingTemplate({ ...final });
        setSelectedTemplate(final);
        const body = extractBodyContent(final.template_html, final.logo_url);
        setEditorContent(body);
        setPrimaryColor(extractPrimaryColor(final.template_html));
        isInitializingEditor.current = true;
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = body;
            isInitializingEditor.current = false;
          }
        }, 0);
      } catch (err: any) {
        alert(err.message || 'Error al crear el template');
      } finally {
        setSaving(false);
      }
    } else {
      setEditingTemplate({ ...existing });
      setSelectedTemplate(existing);
      const body = extractBodyContent(existing.template_html, existing.logo_url);
      setEditorContent(body);
      setPrimaryColor(extractPrimaryColor(existing.template_html));
      isInitializingEditor.current = true;
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = body;
          isInitializingEditor.current = false;
        }
      }, 0);
    }
  };

  const handleSave = async () => {
    if (!editingTemplate || !editorRef.current) return;
    setSaving(true);
    try {
      const editedContent = editorRef.current.innerHTML;
      const updatedHtml = rebuildTemplate(editedContent, editingTemplate.template_html, editingTemplate.logo_url);
      const updated = await emailTemplatesService.update(editingTemplate.id, templateLevel, {
        subject: editingTemplate.subject,
        template_html: updatedHtml,
        is_active: editingTemplate.is_active,
        logo_url: editingTemplate.logo_url,
      });
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTemplate(updated);
      setEditingTemplate(null);
      setEditorContent('');
    } catch (err: any) {
      alert(err.message || 'Error al guardar');
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
      const updated = await emailTemplatesService.toggleActive(template.id, templateLevel, !template.is_active);
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 dark:text-neutral-400">
        Gestionando templates: <strong>{contextName}</strong>
      </p>
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {!selectedTemplate && !editingTemplate && (
        <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700">
          <div className="p-6 border-b border-gray-200 dark:border-neutral-700">
            <h2 className="text-lg font-normal text-gray-900 dark:text-neutral-100">Templates de Correo</h2>
            <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">Los correos se envían automáticamente desde agoramp.mx</p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-neutral-700">
            {displayTemplates.map((template) => {
              const isPlaceholder = !templates.find((t) => t.id === template.id && t.trigger_type === template.trigger_type);
              return (
                <div key={template.trigger_type} className="p-6 hover:bg-gray-50 dark:hover:bg-neutral-700/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-normal text-gray-900 dark:text-neutral-100">{template.name}</h3>
                        {!isPlaceholder && (
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-normal ${
                              template.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-neutral-700 dark:text-neutral-300'
                            }`}
                          >
                            {template.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-neutral-400 mb-2">{template.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-neutral-400">
                        <span><strong>Asunto:</strong> {template.subject}</span>
                        <span><strong>Variables:</strong> {template.available_variables.join(', ')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {!isPlaceholder && (
                        <button
                          type="button"
                          onClick={() => toggleTemplateActive(template)}
                          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                            template.is_active ? 'text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-600 dark:text-neutral-200' : 'text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                          }`}
                        >
                          {template.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEdit(template)}
                        className="px-3 py-1.5 text-sm text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300"
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
        <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700">
          <div className="p-6 border-b border-gray-200 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-normal text-gray-900 dark:text-neutral-100">{editingTemplate?.name || selectedTemplate?.name}</h2>
                <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">{editingTemplate?.description || selectedTemplate?.description}</p>
              </div>
              {!editingTemplate && (
                <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-neutral-600 dark:text-neutral-200">
                  Cerrar
                </button>
              )}
            </div>
          </div>
          <div className="p-6">
            {editingTemplate ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-normal text-gray-700 dark:text-neutral-300 mb-2">Asunto del Correo</label>
                  <input
                    type="text"
                    value={editingTemplate.subject}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-normal text-gray-700 dark:text-neutral-300 mb-2">Variables Disponibles</label>
                  <div className="bg-gray-50 dark:bg-neutral-700 rounded-md p-4 flex flex-wrap gap-2">
                    {editingTemplate.available_variables.map((v) => (
                      <span key={v} className="inline-flex px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded-md text-xs">
                        {'{{' + v + '}}'}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-normal text-gray-700 dark:text-neutral-300 mb-2">Contenido del Correo</label>
                  <div className="border border-gray-300 dark:border-neutral-600 rounded-t-md bg-gray-50 dark:bg-neutral-700 p-2 flex items-center gap-2 flex-wrap">
                    <label className="px-3 py-1.5 text-sm text-gray-700 dark:text-neutral-300 bg-white dark:bg-neutral-600 border border-gray-300 dark:border-neutral-500 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-500 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !editingTemplate) return;
                          try {
                            setSaving(true);
                            const uploadResult = await emailTemplatesService.uploadLogo(editingTemplate.id, templateLevel, file);
                            const updated = await emailTemplatesService.update(editingTemplate.id, templateLevel, { logo_url: uploadResult.url });
                            setEditingTemplate(updated);
                            setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
                            if (editorRef.current) {
                              const updatedContent = updateLogoInContent(editorRef.current.innerHTML, uploadResult.url);
                              editorRef.current.innerHTML = updatedContent;
                              setEditorContent(updatedContent);
                            }
                          } catch (err: any) {
                            alert(err.message || 'Error al subir logo');
                          } finally {
                            setSaving(false);
                          }
                        }}
                      />
                      📷 Logo
                    </label>
                    <div className="h-4 w-px bg-gray-300 dark:bg-neutral-500" />
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowColorPicker((v) => !v)}
                        className="px-3 py-1.5 text-sm text-gray-700 dark:text-neutral-300 bg-white dark:bg-neutral-600 border border-gray-300 dark:border-neutral-500 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-500 flex items-center gap-2"
                      >
                        <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: primaryColor }} />
                        Color
                      </button>
                      {showColorPicker && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
                          <div className="absolute z-50 mt-2 left-0" onClick={(e) => e.stopPropagation()}>
                            <SketchPicker color={primaryColor} onChange={handleColorChange} disableAlpha={false} width="250px" />
                          </div>
                        </>
                      )}
                    </div>
                    <div className="h-4 w-px bg-gray-300 dark:bg-neutral-500" />
                    <select
                      className="px-2 py-1.5 text-sm border border-gray-300 dark:border-neutral-500 rounded-md bg-white dark:bg-neutral-600 text-gray-900 dark:text-neutral-100"
                      onChange={(e) => {
                        const size = e.target.value;
                        if (size) document.execCommand('fontSize', false, size === 'small' ? '2' : size === 'medium' ? '3' : '4');
                      }}
                      defaultValue=""
                    >
                      <option value="">Tamaño</option>
                      <option value="small">Chico</option>
                      <option value="medium">Mediano</option>
                      <option value="large">Grande</option>
                    </select>
                    <button type="button" onClick={() => document.execCommand('bold', false)} className="px-3 py-1.5 text-sm text-gray-700 dark:text-neutral-300 bg-white dark:bg-neutral-600 border border-gray-300 dark:border-neutral-500 rounded-md hover:bg-gray-50">
                      <strong>B</strong>
                    </button>
                    <button type="button" onClick={() => document.execCommand('italic', false)} className="px-3 py-1.5 text-sm text-gray-700 dark:text-neutral-300 bg-white dark:bg-neutral-600 border border-gray-300 dark:border-neutral-500 rounded-md hover:bg-gray-50">
                      <em>I</em>
                    </button>
                    <div className="h-4 w-px bg-gray-300 dark:bg-neutral-500" />
                    <select
                      className="px-2 py-1.5 text-sm border border-gray-300 dark:border-neutral-500 rounded-md bg-white dark:bg-neutral-600 text-gray-900 dark:text-neutral-100"
                      onChange={(e) => {
                        if (e.target.value && editorRef.current) {
                          document.execCommand('insertText', false, `{{${e.target.value}}}`);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="">Insertar Variable</option>
                      {editingTemplate.available_variables.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      if (!isInitializingEditor.current) setEditorContent(e.currentTarget.innerHTML);
                    }}
                    className="w-full min-h-[400px] px-4 py-3 border-x border-b border-gray-300 dark:border-neutral-600 rounded-b-md bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333' }}
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-neutral-700">
                  <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm text-gray-700 bg-white dark:bg-neutral-600 border border-gray-300 dark:border-neutral-500 rounded-md hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button type="button" onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-normal text-gray-700 dark:text-neutral-300 mb-2">Asunto</label>
                  <p className="text-sm text-gray-900 dark:text-neutral-100 bg-gray-50 dark:bg-neutral-700 p-3 rounded-md">{selectedTemplate?.subject}</p>
                </div>
                <div>
                  <label className="block text-sm font-normal text-gray-700 dark:text-neutral-300 mb-2">Vista Previa</label>
                  <div className="border border-gray-300 dark:border-neutral-600 rounded-md overflow-hidden">
                    <iframe srcDoc={selectedTemplate?.template_html || ''} className="w-full h-96 border-0" title="Preview" />
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-neutral-700">
                  <button type="button" onClick={() => selectedTemplate && handleEdit(selectedTemplate)} className="px-4 py-2 text-sm text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300">
                    Editar Template
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
