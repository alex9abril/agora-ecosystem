import { Product } from "@/lib/products";
import { getSkuLineFromSku } from "@/lib/sku-line";

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  food: "Alimento",
  beverage: "Bebida",
  medicine: "Medicamento",
  grocery: "Abarrotes",
  non_food: "No Alimenticio",
  refaccion: "Refacción",
  accesorio: "Accesorio",
  servicio_instalacion: "Servicio Instalación",
  servicio_mantenimiento: "Servicio Mantenimiento",
  fluido: "Fluido",
};

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportProductsToCsv(
  products: Product[],
  filename = "productos.csv",
): void {
  const headers = [
    "Nombre",
    "SKU",
    "Línea SKU",
    "Precio",
    "Tipo",
    "Disponibilidad",
    "Descripción",
    "ID",
  ];

  const rows = products.map((p) => {
    const skuLine = getSkuLineFromSku(p.sku) || (p.sku ? "Otro" : "");
    const typeLabel = PRODUCT_TYPE_LABELS[p.product_type] || p.product_type;
    return [
      escapeCsvCell(p.name),
      escapeCsvCell(p.sku),
      escapeCsvCell(skuLine),
      escapeCsvCell(p.price),
      escapeCsvCell(typeLabel),
      escapeCsvCell(p.is_available ? "Disponible" : "No disponible"),
      escapeCsvCell(p.description),
      escapeCsvCell(p.id),
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");
  const bom = "\uFEFF"; // UTF-8 BOM para compatibilidad con Excel
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
