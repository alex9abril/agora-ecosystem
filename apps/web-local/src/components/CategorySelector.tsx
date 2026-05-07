import { useState, useMemo, useRef, useEffect } from 'react';
import { ProductCategory } from '@/lib/products';

interface CategorySelectorProps {
  categories: ProductCategory[];
  value: string;
  onChange: (categoryId: string) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

interface CategoryWithPath extends ProductCategory {
  fullPath: string;
  level: number;
  searchIndex: string;
}

export default function CategorySelector({
  categories,
  value,
  onChange,
  required = false,
  placeholder = 'Selecciona una categoría',
  disabled = false,
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizeText = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  // Construir jerarquía de categorías agrupadas
  const categoriesGrouped = useMemo(() => {
    const categoryById = new Map<string, ProductCategory>();
    categories.forEach((c) => categoryById.set(c.id, c));

    const buildAncestors = (category: ProductCategory): ProductCategory[] => {
      const ancestors: ProductCategory[] = [];
      const visited = new Set<string>();
      let current: ProductCategory | undefined = category;

      while (current?.parent_category_id) {
        if (visited.has(current.id)) break;
        visited.add(current.id);

        const parent = categoryById.get(current.parent_category_id);
        if (!parent) break;

        ancestors.push(parent);
        current = parent;
      }

      return ancestors.reverse(); // root -> parent
    };

    // Separar categorías raíz y subcategorías
    const rootCategories: CategoryWithPath[] = [];
    const childrenMap = new Map<string, CategoryWithPath[]>();

    categories.forEach((cat) => {
      const ancestors = buildAncestors(cat);
      const fullPath = [...ancestors.map((a) => a.name), cat.name].join(' / ');
      const level = ancestors.length;

      const searchIndex = normalizeText([cat.name, cat.description || ''].filter(Boolean).join(' '));
      const categoryWithPath: CategoryWithPath = {
        ...cat,
        fullPath,
        level,
        searchIndex,
      };

      if (!cat.parent_category_id) {
        // Es una categoría raíz
        rootCategories.push(categoryWithPath);
      } else {
        // Es una subcategoría
        const parentId = cat.parent_category_id;
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId)!.push(categoryWithPath);
      }
    });

    // Ordenar categorías raíz
    rootCategories.sort((a, b) => {
      if (a.display_order !== b.display_order) return a.display_order - b.display_order;
      return a.name.localeCompare(b.name);
    });

    // Ordenar subcategorías de cada padre
    childrenMap.forEach((children) => {
      children.sort((a, b) => {
        if (a.display_order !== b.display_order) return a.display_order - b.display_order;
        return a.name.localeCompare(b.name);
      });
    });

    // Construir lista agrupada: padre seguido de sus hijos
    const grouped: CategoryWithPath[] = [];

    const addCategoryAndChildren = (category: CategoryWithPath) => {
      grouped.push(category);
      const children = childrenMap.get(category.id) || [];
      children.forEach((child) => addCategoryAndChildren(child));
    };

    rootCategories.forEach((root) => addCategoryAndChildren(root));
    return grouped;
  }, [categories]);

  // Filtrar categorías según búsqueda
  const searchState = useMemo(() => {
    const term = searchTerm.trim();

    if (!term) {
      return { items: categoriesGrouped, matchIds: new Set<string>() };
    }

    const tokens = normalizeText(term).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
      return { items: [] as CategoryWithPath[], matchIds: new Set<string>() };
    }

    const matchIds = new Set<string>();
    categoriesGrouped.forEach((cat) => {
      if (tokens.every((t) => cat.searchIndex.includes(t))) {
        matchIds.add(cat.id);
      }
    });

    if (matchIds.size === 0) {
      return { items: [] as CategoryWithPath[], matchIds };
    }

    const categoryById = new Map<string, CategoryWithPath>();
    categoriesGrouped.forEach((cat) => categoryById.set(cat.id, cat));

    const includeIds = new Set<string>(matchIds);
    matchIds.forEach((id) => {
      let current = categoryById.get(id);
      while (current?.parent_category_id) {
        includeIds.add(current.parent_category_id);
        current = categoryById.get(current.parent_category_id);
      }
    });

    return { items: categoriesGrouped.filter((cat) => includeIds.has(cat.id)), matchIds };
  }, [categoriesGrouped, searchTerm]);

  // Obtener categoría seleccionada
  const selectedCategory = categoriesGrouped.find((cat) => cat.id === value);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleSelect = (categoryId: string) => {
    onChange(categoryId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    // Keep searchTerm as-is so an empty input shows all categories
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const filteredCategories = searchState.items;
  const searchMatchIds = searchState.matchIds;
  const isSearching = searchTerm.trim().length > 0;

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
      inputRef.current?.blur();
    } else if (e.key === 'Enter' && filteredCategories.length === 1) {
      e.preventDefault();
      handleSelect(filteredCategories[0].id);
    }
  };

  return (
    <div className="relative">
      <label className="block text-xs font-normal text-gray-600 mb-1.5">
        Categoría {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          required={required}
          disabled={disabled}
          // When the dropdown is open, show the search term to allow live filtering
          value={isOpen ? searchTerm : selectedCategory ? selectedCategory.fullPath : ''}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white disabled:bg-gray-50 disabled:text-gray-500"
        />

        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-auto"
        >
          {filteredCategories.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No se encontraron categorías</div>
          ) : (
            <ul className="py-1">
              {filteredCategories.map((category) => (
                <li key={category.id}>
                  <button
                    type="button"
                    disabled={isSearching && !searchMatchIds.has(category.id)}
                    onClick={() => handleSelect(category.id)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      isSearching && !searchMatchIds.has(category.id)
                        ? 'cursor-default text-gray-900 font-medium'
                        : 'hover:bg-gray-50'
                    } ${category.id === value ? 'bg-gray-100 font-medium' : ''}`}
                    style={{ paddingLeft: `${category.level * 12}px` }}
                  >
                    <div className="flex items-center">
                      {true && (
                        <div
                          className="flex items-center mr-2"
                          style={{
                            width: `${category.level * 16}px`,
                            minWidth: `${category.level * 16}px`,
                          }}
                        >
                          {category.level > 0 && <span className="text-gray-300">│</span>}
                        </div>
                      )}
                      <span className="flex-1">
                        {category.level === 0 ? (
                          <span className="font-medium text-gray-900">{category.name}</span>
                        ) : (
                          <span
                            className={
                              isSearching && !searchMatchIds.has(category.id)
                                ? 'text-gray-900 font-medium'
                                : 'text-gray-700'
                            }
                          >
                            {category.name}
                          </span>
                        )}
                      </span>
                      {category.id === value && (
                        <svg
                          className="w-4 h-4 text-gray-600 ml-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    {(!isSearching || searchMatchIds.has(category.id)) && category.description && (
                      <div className="text-xs text-gray-500 mt-0.5 ml-4">{category.description}</div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-1">Gestionado por administradores</p>
    </div>
  );
}
