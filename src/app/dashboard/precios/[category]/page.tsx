
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type Catalog = {
  id: string;
  name: string;
};

const categoryMapping: { [key: string]: (name: string) => boolean } = {
  accesorios: (name) => name.toUpperCase().startsWith('ACCESORIO'),
  equipos: (name) => 
    name.toUpperCase().startsWith('IMPRESORA') || 
    name.toUpperCase().startsWith('ESCANER') || 
    name.toUpperCase().startsWith('COMPUTADORA'),
  insumos: (name) => {
    const upperName = name.toUpperCase();
    return (upperName.includes('ETIQUETA') || upperName.includes('RIBBON') || upperName.includes('PULSERAS') || upperName.includes('POLIAMIDA') || upperName.includes('ROLLOS')) && !upperName.startsWith('APLICADORES');
  },
  otros: (name) => {
    const upperName = name.toUpperCase();
    const isAccesorio = upperName.startsWith('ACCESORIO');
    const isEquipo = upperName.startsWith('IMPRESORA') || upperName.startsWith('ESCANER') || upperName.startsWith('COMPUTADORA');
    const isInsumo = (upperName.includes('ETIQUETA') || upperName.includes('RIBBON') || upperName.includes('PULSERAS') || upperName.includes('POLIAMIDA') || upperName.includes('ROLLOS')) && !upperName.startsWith('APLICADORES');
    return !isAccesorio && !isEquipo && !isInsumo;
  }
};

export default function CategoryCatalogsPage() {
  const params = useParams();
  const category = params.category as string;
  const firestore = useFirestore();

  const productsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'products'));
  }, [firestore]);

  const { data: userProducts, isLoading } = useCollection(productsQuery);

  const categoryCatalogs = useMemo(() => {
    if (!userProducts) return [];
    
    const uniqueCatalogs = [...new Map(userProducts.map(item => [item.catalogName, { name: item.catalogName, id: item.catalogName }])).values()];
    
    const filterFn = categoryMapping[category];
    if (!filterFn) return [];

    return uniqueCatalogs.filter(catalog => filterFn(catalog.name));
  }, [userProducts, category]);
  
  const categoryLabel = category ? category.charAt(0).toUpperCase() + category.slice(1) : '';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>Catálogos de {categoryLabel}</CardTitle>
                    <CardDescription>
                        Explora los catálogos disponibles para la categoría de {categoryLabel}.
                    </CardDescription>
                </div>
                 <Button asChild variant="outline">
                    <Link href="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Atrás
                    </Link>
                </Button>
            </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : categoryCatalogs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryCatalogs.map(catalog => (
                <Card key={catalog.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {catalog.name}
                    </CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/dashboard/catalogo/${encodeURIComponent(catalog.id)}`}>
                        Ver Productos <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-10">
              <p>No se encontraron catálogos para la categoría "{categoryLabel}".</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    