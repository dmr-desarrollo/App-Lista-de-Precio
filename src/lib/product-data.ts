

export type Product = {
  id: string;
  SKU: string;
  Descripcion: string;
  Descripción: string;
  Marca: string;
  Modelo: string;
  'Precio Lista': string;
  Disponibilidad: string;
  categoria: string;
  imageUrl?: string;
  pdfUrl?: string;
  // Fallback properties from JS example
  sku?: string;
  description?: string;
  brand?: string;
  price?: string;
  // Advanced filter properties
  Resolucion?: string;
  Resolución?: string;
  'Tipo Impresion'?: string;
  'Tipo Impresión'?: string;
  'Tipo de Impresión'?: string;
  Interface?: string;
  Interfaz?: string;
  Velocidad?: string;
  'Volumen de impresión'?: string;
  'Tipo Accesorio'?: string;
  'Cod. Dmr'?: string;
  // Insumos properties
  sustrato?: string;
  Tipo?: string;
  Buje?: string;
  Salida?: 'IN' | 'OUT';
  'Rollos/Caja'?: string;
  bandas?: string | number;
  Ancho?: string | number;
  Largo?: string | number;
  Material?: string;
  Papel?: string;
  Diametro?: string;
};

// This list is intentionally left empty. 
// Data will be loaded via user input in the UI.
export const demoCsvFileNames: string[] = [];


export function formatCategoryName(fileName: string): string {
  return fileName
    .replace(".csv", "")
    .replace(/_/g, " ");
}
