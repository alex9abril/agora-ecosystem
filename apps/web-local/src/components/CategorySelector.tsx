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

  // Construir jerarquía de categorías agrupadas
  const categoriesGrouped = useMemo(() => {
    // Construir rutas completas recursivamente
    const buildPath = (category: ProductCategory, visited: Set<string> = new Set()): string => {
      // Prevenir loops infinitos
      if (visited.has(category.id)) {
        return category.name;
      }
      visited.add(category.id);

      if (!category.parent_category_id) {
        return category.name;
      }

      const parent = categories.find(c => c.id === category.parent_category_id);
      if (!parent) {
        return category.name;
      }

      return `${buildPath(parent, visited)} / ${category.name}`;
    };

    // Separar categorías raíz y subcategorías
    const rootCategories: CategoryWithPath[] = [];
    const childrenMap = new Map<string, CategoryWithPath[]>();

    categories.forEach(cat => {
      const fullPath = buildPath(cat);
      const level = fullPath.split(' / ').length - 1;
      
      const categoryWithPath: CategoryWithPath = {
        ...cat,
        fullPath,
        level,
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
      
      // Agregar hijos inmediatos
      const children = childrenMap.get(category.id) || [];
      children.forEach(child => {
        addCategoryAndChildren(child); // Recursivo para sub-subcategorías
      });
    };

    rootCategories.forEach(root => {
      addCategoryAndChildren(root);
    });

    return grouped;
  }, [categories]);

  // Filtrar categorías según búsqueda (manteniendo agrupación si es posible)
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) {
      return categoriesGrouped;
    }

    const search = searchTerm.toLowerCase();
    const matching = categoriesGrouped.filter(cat =>
      cat.fullPath.toLowerCase().includes(search) ||
      cat.name.toLowerCase().includes(search) ||
      cat.description?.toLowerCase().includes(search)
    );

    // Si hay búsqueda, también incluir padres de categorías que coinciden
    const result: CategoryWithPath[] = [];
    const addedIds = new Set<string>();

    matching.forEach(cat => {
      // Agregar la categoría si no está ya agregada
      if (!addedIds.has(cat.id)) {
        result.push(cat);
        addedIds.add(cat.id);
      }

      // Si es una subcategoría, agregar también su padre (si coincide con la búsqueda o no)
      if (cat.parent_category_id) {
        const parent = categoriesGrouped.find(c => c.id === cat.parent_category_id);
        if (parent && !addedIds.has(parent.id)) {
          // Insertar padre antes de la categoría actual
          const parentIndex = result.length - 1;
          result.splice(parentIndex, 0, parent);
          addedIds.add(parent.id);
        }
      }

      // Agregar hijos de la categoría si coinciden
      const children = categoriesGrouped.filter(c => c.parent_category_id === cat.id);
      children.forEach(child => {
        if (!addedIds.has(child.id) && (
          child.fullPath.toLowerCase().includes(search) ||
          child.name.toLowerCase().includes(search)
        )) {
          result.push(child);
          addedIds.add(child.id);
        }
      });
    });

    return result.length > 0 ? result : matching;
  }, [categoriesGrouped, searchTerm]);

  // Obtener categoría seleccionada
  const selectedCategory = categoriesGrouped.find(cat => cat.id === value);

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
          value={isOpen ? searchTerm : (selectedCategory ? selectedCategory.fullPath : '')}
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
            <div className="px-3 py-2 text-sm text-gray-500">
              No se encontraron categorías
            </div>
          ) : (
            <ul className="py-1">
              {filteredCategories.map((category) => (
                <li key={category.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(category.id)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      category.id === value ? 'bg-gray-100 font-medium' : ''
                    }`}
                    style={{ paddingLeft: `${category.level * 12}px` }} // Visual offset by hierarchy level
                  >
                    <div className="flex items-center">
                      {/* Indicador de nivel con indentación */}
                      <div
                        className="flex items-center mr-2"
                        style={{ width: `${category.level * 16}px`, minWidth: `${category.level * 16}px` }}
                      >
                        {category.level > 0 && (
                          <span className="text-gray-300">│</span>
                        )}
                      </div>
                      <span className="flex-1">
                        {category.level === 0 ? (
                          <span className="font-medium text-gray-900">{category.name}</span>
                        ) : (
                          <span className="text-gray-700">{category.name}</span>
                        )}
                      </span>
                      {category.id === value && (
                        <svg
                          className="w-4 h-4 text-gray-600 ml-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {/* Mostrar ruta completa solo si es subcategoría y hay búsqueda */}
                    {category.level > 0 && searchTerm && (
                      <div className="text-xs text-gray-400 mt-0.5 ml-4">
                        {category.fullPath}
                      </div>
                    )}
                    {category.description && (
                      <div className="text-xs text-gray-500 mt-0.5 ml-4">
                        {category.description}
                      </div>
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

