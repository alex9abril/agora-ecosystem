import { Product, ProductType } from "@/lib/products";

const priceFormatter = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PRODUCT_TYPE_LABELS: Partial<Record<ProductType, { label: string; color: string }>> = {
  food: { label: "Alimento", color: "bg-blue-100 text-blue-800" },
  beverage: { label: "Bebida", color: "bg-cyan-100 text-cyan-800" },
  medicine: { label: "Medicamento", color: "bg-red-100 text-red-800" },
  grocery: { label: "Abarrotes", color: "bg-yellow-100 text-yellow-800" },
  non_food: { label: "No Alimenticio", color: "bg-gray-100 text-gray-800" },
};

interface ProductGridProps {
  products: Product[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onEdit: (product: Product) => void;
  onToggleAvailability: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  togglingIds: Set<string>;
}

export default function ProductGrid({
  products,
  selectedIds,
  onToggleSelect,
  onEdit,
  onToggleAvailability,
  onDuplicate,
  togglingIds,
}: ProductGridProps) {
  if (products.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-4">
      {products.map((product) => {
        const typeInfo = PRODUCT_TYPE_LABELS[product.product_type] || {
          label: product.product_type,
          color: "bg-gray-100 text-gray-800",
        };
        const imageUrl = product.image_url || product.primary_image_url;
        const isSelected = selectedIds.has(product.id);
        const isToggling = togglingIds.has(product.id);

        return (
          <div
            key={product.id}
            className={`relative group rounded-lg border bg-white dark:bg-neutral-800 overflow-hidden transition-all cursor-pointer hover:shadow-md ${
              isSelected
                ? "border-gray-900 dark:border-gray-100 ring-2 ring-gray-900 dark:ring-gray-100 ring-offset-1"
                : "border-gray-200 dark:border-neutral-700"
            }`}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (
                target.closest('input[type="checkbox"]') ||
                target.closest("button")
              ) return;
              onEdit(product);
            }}
          >
            {/* Checkbox selección */}
            <div className="absolute top-2 left-2 z-10">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(product.id)}
                onClick={(e) => e.stopPropagation()}
                className="rounded border-gray-300 text-gray-600 focus:ring-gray-400 shadow"
              />
            </div>

            {/* Imagen */}
            <div className="aspect-square bg-gray-100 dark:bg-neutral-700 overflow-hidden">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-neutral-600">
                  <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Acciones rápidas (hover) */}
            <div className="absolute inset-x-0 bottom-[72px] flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDuplicate(product); }}
                className="p-1.5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-full shadow text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                title="Duplicar"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

            {/* Info */}
            <div className="p-2.5">
              <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate leading-tight">
                {product.name}
              </p>
              {product.sku && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                  {product.sku}
                </p>
              )}
              <div className="flex items-center justify-between mt-1.5 gap-1">
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  ${priceFormatter.format(product.price || 0)}
                </span>
                <span className={`px-1 py-0.5 text-[9px] font-medium rounded-full ${typeInfo.color}`}>
                  {typeInfo.label}
                </span>
              </div>

              {/* Toggle disponibilidad */}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  {product.is_available ? "Disponible" : "No disponible"}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleAvailability(product); }}
                  disabled={isToggling}
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                    product.is_available ? "bg-green-500" : "bg-gray-300 dark:bg-neutral-600"
                  }`}
                  title={product.is_available ? "Desactivar" : "Activar"}
                >
                  {isToggling ? (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="h-2.5 w-2.5 border border-white/60 border-t-white rounded-full animate-spin" />
                    </span>
                  ) : (
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                        product.is_available ? "translate-x-3.5" : "translate-x-0.5"
                      }`}
                    />
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
