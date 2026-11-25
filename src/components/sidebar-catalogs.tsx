
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Package, Printer, Tags, MoreHorizontal, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccordion } from '@/context/accordion-context';
import { cn } from '@/lib/utils';

type Product = {
  id: string;
  catalogName: string;
}
type Catalog = {
  id: string;
  name: string;
}
type CatalogGroups = {
  accesorios: Catalog[];
  equipos: Catalog[];
  insumos: Catalog[];
  otros: Catalog[];
};

const categoryConfig = {
  accesorios: { icon: <Package className="size-4" />, label: 'Accesorios', href: '/dashboard/precios/accesorios' },
  equipos: { icon: <Printer className="size-4" />, label: 'Equipos', href: '/dashboard/precios/equipos' },
  insumos: { icon: <Tags className="size-4" />, label: 'Insumos', href: '/dashboard/precios/insumos' },
  otros: { icon: <MoreHorizontal className="size-4" />, label: 'Otros', href: '/dashboard/precios/otros' },
};

export function SidebarCatalogs() {
  const pathname = usePathname();
  const firestore = useFirestore();
  const { isUserLoading } = useUser();
  const { openItems, setOpenItems } = useAccordion();

  const productsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'products'));
  }, [firestore]);

  const { data: userProducts, isLoading: isDataLoading } = useCollection(productsQuery);

  const userCatalogs = useMemo(() => {
    if (!userProducts) return [];
    const uniqueCatalogs = new Map(userProducts.map(item => [item.catalogName, { name: item.catalogName, id: item.catalogName }]));
    return Array.from(uniqueCatalogs.values());
  }, [userProducts]);
  
  const catalogGroups = useMemo(() => {
    const groups: CatalogGroups = { accesorios: [], equipos: [], insumos: [], otros: [] };
    if (!userCatalogs) return groups;

    (userCatalogs as Catalog[]).forEach(catalog => {
      const upperCaseCatalog = catalog.name.toUpperCase();
      if (upperCaseCatalog.startsWith('ACCESORIO')) {
        groups.accesorios.push(catalog);
      } else if (
          upperCaseCatalog.startsWith('IMPRESORA') || 
          upperCaseCatalog.startsWith('ESCANER') ||
          upperCaseCatalog.startsWith('COMPUTADORA')
      ) {
        groups.equipos.push(catalog);
      } else if ((upperCaseCatalog.includes('ETIQUETA') || upperCaseCatalog.includes('RIBBON') || upperCaseCatalog.includes('PULSERAS') || upperCaseCatalog.includes('POLIAMIDA') || upperCaseCatalog.includes('ROLLOS')) && !upperCaseCatalog.startsWith('APLICADORES')) {
        groups.insumos.push(catalog);
      } else {
        groups.otros.push(catalog);
      }
    });
    return groups;
  }, [userCatalogs]);
  
  const renderCatalogLinks = (catalogs: Catalog[]) => {
      if (catalogs.length === 0) {
          return <p className="text-xs text-muted-foreground p-2">No hay catálogos.</p>;
      }
      return catalogs.map(catalog => (
          <SidebarMenuItem key={catalog.id}>
              <Link href={`/dashboard/catalogo/${encodeURIComponent(catalog.id)}`}>
                  <SidebarMenuButton tooltip={`Ver ${catalog.name}`} variant="ghost" className="w-full justify-start" isActive={pathname.endsWith(encodeURIComponent(catalog.id))}>
                      <FileText className="h-4 w-4" />
                      {catalog.name}
                  </SidebarMenuButton>
              </Link>
          </SidebarMenuItem>
      ));
  };
  
  if (isUserLoading) {
      return (
          <div className="space-y-2 px-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
          </div>
      )
  }

  const handleValueChange = (value: string[]) => {
    setOpenItems(value);
  };

  return (
    <Accordion type="multiple" value={openItems} onValueChange={handleValueChange} className="w-full">
      {Object.entries(categoryConfig).map(([key, config]) => {
        const isActive = pathname === config.href;
        return (
          <AccordionItem value={key} key={key} className="border-none">
            <AccordionTrigger className={cn("hover:no-underline", { "bg-accent text-accent-foreground rounded-md": isActive })}>
                <Link href={config.href} className="flex items-center gap-2 flex-1">
                    {config.icon}
                    <span>{config.label}</span>
                </Link>
            </AccordionTrigger>
            <AccordionContent className="pl-4 space-y-1">{renderCatalogLinks(catalogGroups[key as keyof CatalogGroups])}</AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  );
}

    