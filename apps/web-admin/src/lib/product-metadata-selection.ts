const STORAGE_KEY = 'admin_product_metadata_selection';

export interface ProductMetadataSelectionItem {
  id: string;
  name: string;
  sku?: string | null;
  description?: string;
  image_url?: string;
  primary_image_url?: string;
  price: number;
  product_type?: string;
  category_id?: string;
  category_name?: string;
  business_name?: string;
}

export function saveProductMetadataSelection(items: ProductMetadataSelectionItem[]) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      items,
      savedAt: Date.now(),
    }),
  );
}

export function loadProductMetadataSelection(): ProductMetadataSelectionItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}
