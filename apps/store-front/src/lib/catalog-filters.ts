import type { ParsedUrlQuery } from 'querystring';

export type CatalogListFilters = {
  categoryId?: string;
  uncategorized?: boolean;
  collectionId?: string;
  search?: string;
  productType?: string;
  priceMin?: number;
  priceMax?: number;
  isFeatured?: boolean;
  compatible?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

function first(query: ParsedUrlQuery, key: string): string | undefined {
  const value = query[key];
  if (Array.isArray(value)) return value[0] || undefined;
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function parseCatalogFilters(query: ParsedUrlQuery): CatalogListFilters {
  const uncategorized = first(query, 'uncategorized');
  const priceMin = first(query, 'priceMin');
  const priceMax = first(query, 'priceMax');
  const sortOrder = first(query, 'sortOrder');
  const featured = first(query, 'featured') || first(query, 'isFeatured');
  const productType = first(query, 'productType');
  const compatible = first(query, 'compatible');

  return {
    categoryId: first(query, 'categoryId'),
    uncategorized: uncategorized === 'true' || uncategorized === '1' ? true : undefined,
    collectionId: first(query, 'collectionId'),
    search: first(query, 'search') || first(query, 'q'),
    productType: productType === 'refaccion' || productType === 'accesorio' ? productType : undefined,
    priceMin: priceMin && !Number.isNaN(Number(priceMin)) ? Number(priceMin) : undefined,
    priceMax: priceMax && !Number.isNaN(Number(priceMax)) ? Number(priceMax) : undefined,
    isFeatured: featured === 'true' || featured === '1' ? true : undefined,
    compatible:
      compatible === 'false' || compatible === '0'
        ? false
        : compatible === 'true' || compatible === '1'
          ? true
          : undefined,
    sortBy: first(query, 'sortBy'),
    sortOrder: sortOrder === 'desc' || sortOrder === 'asc' ? sortOrder : undefined,
  };
}

export function catalogFiltersActive(filters: CatalogListFilters): boolean {
  return Boolean(
    filters.categoryId ||
      filters.uncategorized ||
      filters.collectionId ||
      filters.search ||
      filters.productType ||
      filters.priceMin != null ||
      filters.priceMax != null ||
      filters.isFeatured ||
      filters.compatible ||
      filters.sortBy,
  );
}
