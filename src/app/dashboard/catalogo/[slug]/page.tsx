"use client";

import { ProductCatalog } from '@/components/product-catalog';
import { useParams } from 'next/navigation';

export default function CatalogPage() {
  const params = useParams();
  const catalogName = decodeURIComponent(params.slug as string);

  if (!catalogName) {
    return <div>Cargando...</div>;
  }

  return <ProductCatalog catalogName={catalogName} />;
}
