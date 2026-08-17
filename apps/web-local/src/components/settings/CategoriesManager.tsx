import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { ApiError } from '@/lib/api';
import {
  categoriesService,
  type CategoryPayload,
  type ProductCategory,
} from '@/lib/categories';
import CategoryImageUpload from '@/components/CategoryImageUpload';

const emptyForm = {
  name: '',
  description: '',
  icon_url: '',
  parent_category_id: '',
  display_order: 0,
  is_active: true,
};

function normId(id?: string | null): string {
  return (id || '').trim().toLowerCase();
}

function isRootCategory(cat: ProductCategory): boolean {
  return !normId(cat.parent_category_id);
}

function buildTree(categories: ProductCategory[]): ProductCategory[] {
  const byId = new Map<string, ProductCategory>();
  categories.forEach((cat) => {
    if (cat.id) byId.set(normId(cat.id), { ...cat, children: [] });
  });

  const roots: ProductCategory[] = [];
  byId.forEach((cat) => {
    const parentKey = normId(cat.parent_category_id);
    if (!parentKey || parentKey === normId(cat.id)) {
      roots.push(cat);
      return;
    }
    const parent = byId.get(parentKey);
    if (parent) {
      parent.children = parent.children || [];
      parent.children.push(cat);
    }
    // Si el padre no está en el catálogo, no se muestra como raíz.
  });

  const sortNodes = (nodes: ProductCategory[], level = 0): ProductCategory[] =>
    nodes
      .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name, 'es'))
      .map((cat) => ({
        ...cat,
        level,
        children: sortNodes(cat.children || [], level + 1),
      }));

  return sortNodes(roots.filter(isRootCategory));
}

function filterTree(
  nodes: ProductCategory[],
  keep: (node: ProductCategory) => boolean,
): ProductCategory[] {
  return nodes
    .map((node) => {
      const children = filterTree(node.children || [], keep);
      if (!keep(node) && children.length === 0) return null;
      return { ...node, children };
    })
    .filter((node): node is ProductCategory => node != null);
}

function collectMatchAncestorIds(nodes: ProductCategory[], query: string): Record<string, boolean> {
  const q = query.trim().toLowerCase();
  const next: Record<string, boolean> = {};
  if (!q) return next;

  const walk = (list: ProductCategory[]): boolean => {
    let any = false;
    list.forEach((node) => {
      const self =
        node.name.toLowerCase().includes(q) ||
        (node.description || '').toLowerCase().includes(q);
      const childMatch = walk(node.children || []);
      if (childMatch) next[normId(node.id)] = true;
      if (self || childMatch) any = true;
    });
    return any;
  };
  walk(nodes);
  return next;
}

function collectExpandableIds(nodes: ProductCategory[]): string[] {
  const ids: string[] = [];
  const walk = (list: ProductCategory[]) => {
    list.forEach((n) => {
      if (n.children?.length) {
        ids.push(n.id);
        walk(n.children);
      }
    });
  };
  walk(nodes);
  return ids;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CategoryTreeNode({
  category,
  selectedId,
  isCreating,
  isOpen,
  onToggle,
  onSelect,
  onAddChild,
}: {
  category: ProductCategory;
  selectedId: string | null;
  isCreating: boolean;
  isOpen: (id: string) => boolean;
  onToggle: (id: string) => void;
  onSelect: (category: ProductCategory) => void;
  onAddChild: (parentId?: string) => void;
}) {
  const hasChildren = Boolean(category.children?.length);
  const open = hasChildren && isOpen(category.id);
  const selected = selectedId === category.id && !isCreating;
  const pad = 10 + (category.level ?? 0) * 18;

  return (
    <div>
      <div
        className={`group flex h-11 items-center gap-1.5 pr-2 ${
          selected ? 'bg-gray-100 dark:bg-neutral-800' : 'hover:bg-gray-50 dark:hover:bg-neutral-900'
        }`}
        style={{ paddingLeft: pad }}
      >
        <button
          type="button"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-gray-200/70 dark:hover:bg-neutral-700"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (hasChildren) onToggle(category.id);
            else onSelect(category);
          }}
          aria-expanded={hasChildren ? open : undefined}
          aria-label={hasChildren ? (open ? 'Contraer' : 'Expandir') : category.name}
        >
          {hasChildren ? (
            <Chevron open={open} />
          ) : (
            <span className="h-1 w-1 rounded-full bg-gray-300" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onSelect(category)}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <ImageThumb src={category.icon_url} name={category.name} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-gray-900 dark:text-gray-100">
              {category.name}
            </span>
            <span className="block truncate text-[11px] text-gray-400">
              {category.total_products ?? 0} prod.
              {hasChildren ? ` · ${category.children?.length} sub.` : ''}
              {!category.is_active ? ' · Inactiva' : ''}
            </span>
          </span>
        </button>
        <button
          type="button"
          title="Nueva subcategoría"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild(category.id);
          }}
          className="invisible rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 group-hover:visible dark:hover:bg-neutral-700 dark:hover:text-gray-200"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>
      {hasChildren && open &&
        category.children?.map((child) => (
          <CategoryTreeNode
            key={child.id}
            category={child}
            selectedId={selectedId}
            isCreating={isCreating}
            isOpen={isOpen}
            onToggle={onToggle}
            onSelect={onSelect}
            onAddChild={onAddChild}
          />
        ))}
    </div>
  );
}

function ImageThumb({ src, name }: { src?: string | null; name: string }) {
  if (src) {
    return <img src={src} alt="" className="h-8 w-8 rounded-md object-cover bg-gray-100 dark:bg-neutral-800" />;
  }
  const letter = name.trim().charAt(0).toUpperCase() || 'C';
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-[11px] font-semibold text-gray-500 dark:bg-neutral-800 dark:text-gray-400">
      {letter}
    </div>
  );
}

export default function CategoriesManager() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState<boolean | undefined>(true);
  const [formData, setFormData] = useState(emptyForm);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await categoriesService.listAll({ globalOnly: true });
      setCategories(data);
    } catch (e) {
      setCategories([]);
      setError(e instanceof ApiError ? e.message : 'Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 2500);
    return () => window.clearTimeout(t);
  }, [notice]);

  const categoryTree = useMemo(() => buildTree(categories), [categories]);
  const selectedCategory = categories.find((c) => c.id === selectedId) ?? null;

  const visibleTree = useMemo(() => {
    const q = search.trim().toLowerCase();
    return filterTree(categoryTree, (node) => {
      const statusOk =
        isActive === undefined ? true : node.is_active === isActive;
      const searchOk =
        !q ||
        node.name.toLowerCase().includes(q) ||
        (node.description || '').toLowerCase().includes(q);
      return statusOk && searchOk;
    });
  }, [categoryTree, isActive, search]);

  useEffect(() => {
    const q = search.trim();
    if (!q) return;
    setExpanded((prev) => ({ ...prev, ...collectMatchAncestorIds(categoryTree, q) }));
  }, [categoryTree, search]);

  const isOpen = (id: string) => Boolean(expanded[normId(id)]);

  const toggleExpand = (id: string) => {
    const key = normId(id);
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    collectExpandableIds(visibleTree).forEach((id) => {
      next[normId(id)] = true;
    });
    setExpanded(next);
  };

  const collapseAll = () => setExpanded({});

  const fillForm = (category: ProductCategory) => {
    setFormData({
      name: category.name,
      description: category.description || '',
      icon_url: category.icon_url || '',
      parent_category_id: category.parent_category_id || '',
      display_order: category.display_order,
      is_active: category.is_active,
    });
    setPendingFile(null);
  };

  const handleSelectCategory = (category: ProductCategory) => {
    setSelectedId(category.id);
    setIsCreating(false);
    setError(null);
    fillForm(category);
  };

  const handleNewCategory = (parentId?: string) => {
    setSelectedId(null);
    setIsCreating(true);
    setError(null);
    setFormData({
      ...emptyForm,
      parent_category_id: parentId || '',
    });
    setPendingFile(null);
    if (parentId) {
      setExpanded((prev) => ({ ...prev, [normId(parentId)]: true }));
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload: CategoryPayload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        display_order: formData.display_order,
        is_active: formData.is_active,
      };
      if (formData.parent_category_id) payload.parent_category_id = formData.parent_category_id;
      if (!pendingFile) payload.icon_url = formData.icon_url.trim() || null;

      let saved: ProductCategory;
      if (!isCreating && selectedCategory) {
        saved = await categoriesService.update(selectedCategory.id, payload);
      } else {
        saved = await categoriesService.create(payload);
      }

      if (pendingFile && saved?.id) {
        const uploaded = await categoriesService.uploadImage(saved.id, pendingFile);
        if (uploaded.url) saved = { ...saved, icon_url: uploaded.url };
      }

      setNotice(isCreating ? 'Categoría creada' : 'Cambios guardados');
      setIsCreating(false);
      setPendingFile(null);
      await loadCategories();
      if (saved?.id) {
        setSelectedId(saved.id);
        fillForm({ ...saved, ...payload, id: saved.id, icon_url: saved.icon_url ?? payload.icon_url });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al guardar la categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedCategory) return;
    if (!confirm(`¿Desactivar “${selectedCategory.name}”? Dejará de mostrarse en la tienda.`)) return;
    try {
      await categoriesService.remove(selectedCategory.id);
      setNotice('Categoría desactivada');
      setSelectedId(null);
      setIsCreating(false);
      setFormData(emptyForm);
      await loadCategories();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al desactivar la categoría');
    }
  };

  const showingEditor = isCreating || Boolean(selectedCategory);
  const rootCount = visibleTree.length;
  const totalCount = categories.filter((c) => isRootCategory(c)).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
            </svg>
            <input
              type="search"
              placeholder="Buscar categoría…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
            />
          </div>
          <select
            value={isActive === undefined ? '' : String(isActive)}
            onChange={(e) =>
              setIsActive(e.target.value === '' ? undefined : e.target.value === 'true')
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
          >
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
            <option value="">Todas</option>
          </select>
          <span className="hidden text-xs text-gray-400 sm:inline">
            {rootCount} {rootCount === 1 ? 'categoría padre' : 'categorías padre'}
            {totalCount !== rootCount ? ` · ${totalCount} en total` : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={() => handleNewCategory()}
          className="rounded-lg bg-black px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Nueva categoría
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {notice}
        </div>
      )}

      <div className="grid min-h-[560px] flex-1 grid-cols-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:grid-cols-[minmax(280px,38%)_1fr]">
        <aside className="flex min-h-0 flex-col border-b border-gray-200 dark:border-neutral-800 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-neutral-800">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Árbol</p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={expandAll}
                className="rounded px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800"
              >
                Expandir
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="rounded px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800"
              >
                Contraer
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {loading ? (
              <div className="space-y-1 px-3 py-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-md bg-gray-100 dark:bg-neutral-800" />
                ))}
              </div>
            ) : visibleTree.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm text-gray-500">No hay categorías con este filtro.</p>
                <button
                  type="button"
                  onClick={() => handleNewCategory()}
                  className="mt-3 text-sm font-medium text-gray-900 underline underline-offset-2 dark:text-gray-100"
                >
                  Crear la primera
                </button>
              </div>
            ) : (
              visibleTree.map((category) => (
                <CategoryTreeNode
                  key={category.id}
                  category={category}
                  selectedId={selectedId}
                  isCreating={isCreating}
                  isOpen={isOpen}
                  onToggle={toggleExpand}
                  onSelect={handleSelectCategory}
                  onAddChild={handleNewCategory}
                />
              ))
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-y-auto">
          {!showingEditor ? (
            <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-neutral-800">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Selecciona una categoría</p>
              <p className="mt-1 max-w-xs text-sm text-gray-500">
                Elige una del árbol para editar su imagen y datos, o crea una nueva.
              </p>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-lg space-y-5 px-5 py-6">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  {isCreating ? 'Nueva categoría' : 'Editar'}
                </p>
                <h2 className="mt-0.5 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {isCreating ? 'Crear categoría' : formData.name || selectedCategory?.name}
                </h2>
              </div>

              <CategoryImageUpload
                value={formData.icon_url}
                onChange={(url) => {
                  setFormData((prev) => ({ ...prev, icon_url: url }));
                  if (selectedId) {
                    setCategories((prev) =>
                      prev.map((c) => (c.id === selectedId ? { ...c, icon_url: url || null } : c)),
                    );
                  }
                }}
                categoryId={!isCreating ? selectedId ?? undefined : undefined}
                onFileSelected={(file) => setPendingFile(file)}
              />

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Categoría padre</label>
                <select
                  value={formData.parent_category_id}
                  onChange={(e) => setFormData({ ...formData, parent_category_id: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
                >
                  <option value="">Ninguna (categoría raíz)</option>
                  {(() => {
                    const options: ReactElement[] = [];
                    const walk = (nodes: ProductCategory[], prefix = '') => {
                      nodes.forEach((cat) => {
                        if (cat.id === selectedId) return;
                        options.push(
                          <option key={cat.id} value={cat.id}>
                            {prefix}
                            {cat.name}
                          </option>,
                        );
                        if (cat.children?.length) walk(cat.children, `${prefix}— `);
                      });
                    };
                    walk(categoryTree);
                    return options;
                  })()}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Orden</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.display_order}
                    onChange={(e) =>
                      setFormData({ ...formData, display_order: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Estado</label>
                  <select
                    value={String(formData.is_active)}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
                  >
                    <option value="true">Activa</option>
                    <option value="false">Inactiva</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-neutral-800">
                {!isCreating && selectedCategory ? (
                  <button
                    type="button"
                    onClick={() => void handleDeactivate()}
                    className="text-sm text-gray-400 hover:text-red-600"
                  >
                    Desactivar
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      if (selectedCategory) fillForm(selectedCategory);
                      else {
                        setSelectedId(null);
                        setFormData(emptyForm);
                      }
                    }}
                    className="rounded-lg border border-gray-200 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-neutral-700 dark:text-gray-200 dark:hover:bg-neutral-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving || !formData.name.trim()}
                    className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {saving ? 'Guardando…' : isCreating ? 'Crear' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
