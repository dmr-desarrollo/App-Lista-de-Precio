// src/components/comparison-tray.tsx

import type { Product } from '@/lib/product-data';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X as ClearIcon, Layers as CompareIcon } from 'lucide-react';
import Image from 'next/image';

const normalizeText = (text: string | null | undefined): string => {
    if (!text) return '';
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
};

const getProductProperty = (product: Product, key: string): any => {
    if (!product || !key) return null;
    const normalizedKey = normalizeText(key);
    for (const propKey in product) {
        if (normalizeText(propKey) === normalizedKey) {
            return product[propKey as keyof Product];
        }
    }
    return null;
};

interface ComparisonTrayProps {
  products: Product[];
  onClear: () => void;
  onCompare: () => void;
  onRemove: (productId: string) => void;
}

export function ComparisonTray({ products, onClear, onCompare, onRemove }: ComparisonTrayProps) {
  if (products.length === 0) {
    return null; // No mostrar nada si no hay productos
  }

  return (
    <Card className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl p-2 md:p-4 shadow-2xl z-50 animate-in slide-in-from-bottom-10">
      <div className="flex justify-between items-center gap-2 md:gap-4">
        <div className="flex items-center gap-2 md:gap-4 flex-grow overflow-x-auto">
          <span className="font-bold text-lg hidden sm:inline">Comparar:</span>
          {products.map(p => {
            const productId = getProductProperty(p, 'id') || getProductProperty(p, 'SKU') || getProductProperty(p, 'P/N') || getProductProperty(p, 'Modelo') || Math.random().toString();
            const imageUrl = getProductProperty(p, 'imageUrl');
            const title = getProductProperty(p, 'Modelo') || 'Producto';
            
            return (
              <div key={productId} className="relative group flex-shrink-0">
                <Image
                  src={imageUrl || '/placeholder.png'}
                  alt={title}
                  width={60}
                  height={60}
                  className="rounded-md object-contain bg-muted/30 p-1 w-12 h-12 md:w-16 md:h-16"
                />
                <button
                  onClick={() => onRemove(productId)}
                  className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Quitar ${title}`}
                >
                  <ClearIcon className="h-3 w-3 md:h-4 md:w-4" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          <Button onClick={onCompare} disabled={products.length < 2} size="sm" className="h-auto py-1 px-2 md:py-2 md:px-4 md:h-10">
            <CompareIcon className="mr-1 md:mr-2 h-4 w-4" />
            <span className="hidden md:inline">Comparar</span> ({products.length})
          </Button>
          <Button variant="ghost" size="icon" onClick={onClear} className="h-8 w-8 md:h-10 md:w-10">
            <ClearIcon className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
