
import type { Product } from '@/lib/product-data';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import React, { useState, useMemo } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { FileText, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile, UserRole } from '@/lib/user-profile';


interface ProductDetailDialogProps {
  product: Product;
}

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


const isPriceOrAvailabilityKey = (key: string): boolean => {
  const lowerKey = key.toLowerCase().trim();
  
  const isCajaEtiquetaPrice = /^\d+\s(o más )?cajas?/i.test(lowerKey) || 
                              /^de \d+ a \d+ cajas/i.test(lowerKey) ||
                              /^\d+\sa\s\d+\scajas/i.test(lowerKey);     

  const isCajaRolloPrice = /\(\d+\s+cajas?\)$/i.test(lowerKey);

  const isPoliamidaPrice = lowerKey.startsWith('hasta');

  return (
    isPoliamidaPrice ||
    lowerKey.startsWith('de ') ||
    lowerKey.includes('precio') ||
    lowerKey.includes('lista') ||
    lowerKey.includes('unitario') ||
    isCajaEtiquetaPrice ||
    isCajaRolloPrice ||
    lowerKey.includes('prog.') ||
    lowerKey.includes('disponibilidad') ||
    lowerKey.includes('stock') ||
    lowerKey === 'revendedor' ||
    lowerKey === 'distribuidor' ||
    /\((cf|rv|dt)\d*\)/i.test(lowerKey)
  );
};

const isTechnicalDetailKey = (key: string): boolean => {
  const lowerKey = key.toLowerCase();
  const identifierKeys = ['id', 'catalogname', 'uid', 'createdat', 'descripcion', 'modelo', 'serie', 'sku', 'p/n', 'cod. dmr', 'marca', 'imageurl', 'pdfurl', 'logourl', ''];
  if (lowerKey === 'rollos/caja' || lowerKey === 'unid. x caja') {
      return true;
  }
  return !isPriceOrAvailabilityKey(key) && !identifierKeys.includes(lowerKey);
};

const formatValue = (key: string, value: any) => {
    const lowerKey = key.toLowerCase();
    const stringValue = String(value);

    if (lowerKey.includes('disponibilidad')) {
        const lowerValue = stringValue.toLowerCase();
        let variant: 'default' | 'secondary' | 'destructive' = 'destructive';
        if (lowerValue.includes('en stock') || lowerValue.includes('disponible')) {
            variant = 'default';
        } else if (lowerValue.includes('limitado') || lowerValue.includes('pocas unidades')) {
            variant = 'secondary';
        }
        return <Badge variant={variant}>{stringValue}</Badge>;
    }
    
    if (isPriceOrAvailabilityKey(key) && !lowerKey.includes('disponibilidad') && !lowerKey.includes('stock')) {
      const numericString = stringValue.replace(/U\$S\s*/, '');
      const cleanValue = numericString.replace(',', '.');
      const parsedPrice = parseFloat(cleanValue);

      if (!isNaN(parsedPrice) && parsedPrice > 0) {
        return `U$S ${parsedPrice.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      return 'N/A';
    }


    return stringValue;
}

const sortPriceKeys = (keys: string[]): string[] => {
    const getOrder = (key: string): number => {
        const lowerKey = key.toLowerCase();
        
        // DT1 LISTA 3 for ROllos should be last
        if (lowerKey.includes('dt1') && lowerKey.includes('lista 3')) return 99;
        
        if (lowerKey.includes('cf')) return 1;
        
        // Specific order for other insumos like etiquetas
        if (lowerKey.startsWith('1 caja')) return 10;
        if (lowerKey.startsWith('de 2 a 3')) return 11;
        if (lowerKey.startsWith('4 a 8')) return 12;
        if (lowerKey.startsWith('9 o más')) return 13;
        
        if (lowerKey.includes('rv')) return 20;
        if (lowerKey === 'revendedor') return 21;
        
        if (lowerKey.includes('dt')) return 30;
        if (lowerKey === 'distribuidor') return 31;
        
        // Poliamida
        if (lowerKey.startsWith('hasta')) return 40;

        return 90; // Default for others
    };

    return keys.sort((a, b) => {
        const orderA = getOrder(a);
        const orderB = getOrder(b);
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        // Fallback to sort by number inside the key if order is the same (e.g. CF1, CF2, CF3)
        const numA = a.match(/\d+/);
        const numB = b.match(/\d+/);
        if (numA && numB) {
            return parseInt(numA[0], 10) - parseInt(numB[0], 10);
        }
        return a.localeCompare(b); // Alphabetical fallback
    });
};

const formatTechnicalKey = (key: string): string => {
    const lowerKey = key.toLowerCase();
    
    // Mapeos específicos para normalizar las claves
    if (lowerKey.includes('descripcion')) return 'Descripción';
    if (lowerKey === 'etiquetas/rollo' || lowerKey === 'etiquetas/rol') return 'Etiquetas por Rollo';
    if (lowerKey === 'unid. x caja') return 'Unidades por Caja';
    if (lowerKey === 'cod. dmr') return 'Cod. DMR';
    if (lowerKey === 'p/n') return 'P/N';
    if (lowerKey === 'rollos/caja') return 'Rollos por Caja';
    if (lowerKey === 'buje largo') return 'Buje largo';
    
    // Capitalizar la primera letra para el resto
    return key.charAt(0).toUpperCase() + key.slice(1);
};


const RIBBONS_ORDER = ['Tipo', 'Sustrato', 'Cod. DMR', 'P/N', 'DESCRIPCION', 'Ancho', 'Largo', 'Buje', 'Buje largo', 'Color', 'Salida', 'Unid. x caja'];
const ETIQUETAS_ORDER = ['Cod. DMR', 'Descripción', 'Buje', 'sustrato', 'Ancho', 'Largo', 'etiquetas/rol', 'bandas', 'rollos/caja'];
const ROLLOS_ORDER = ['Cod. DMR', 'P/N', 'Marca', 'Papel', 'Tipo', 'Ancho', 'Diametro', 'Buje', 'Largo', 'Unid. x caja'];


export function ProductDetailDialog({ product }: ProductDetailDialogProps) {
  const [open, setOpen] = useState(false);
  
  const catalogName = getProductProperty(product, 'catalogName') || '';

  const getTitle = () => {
    const upperCatalogName = catalogName.toUpperCase();
    
    if (upperCatalogName.includes('ACCESORIO')) {
      return getProductProperty(product, 'Descripcion') || getProductProperty(product, 'Tipo Accesorio');
    }
    if (upperCatalogName.includes('APLICADORES')) {
        return getProductProperty(product, 'Modelo');
    }
    if (upperCatalogName.includes('ROLLOS')) {
      return getProductProperty(product, 'Papel');
    }
    if (upperCatalogName.includes('POLIAMIDA')) {
      return getProductProperty(product, 'Material');
    }
     if (upperCatalogName.includes('RIBBON')) {
      return getProductProperty(product, 'Descripcion');
    }
     if (upperCatalogName.includes('ETIQUETA')) {
      return getProductProperty(product, 'Descripcion');
    }
    
    return getProductProperty(product, 'Modelo') || 
           getProductProperty(product, 'Serie') || 
           getProductProperty(product, 'Sustrato') || 
           getProductProperty(product, 'Tipo') || 
           getProductProperty(product, 'Descripcion');
  };
  
  const productName = getTitle() || 'Sin Título';
  const sku = getProductProperty(product, 'SKU') || getProductProperty(product, 'P/N') || getProductProperty(product, 'Cod. DMR') || 'N/A';
  
  const { user } = useUser();
  const firestore = useFirestore();
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const userRoles = useMemo(() => userProfile?.roles || ['USUARIO'], [userProfile]);

  const { priceKeys, techDetailKeys, priceGroups } = useMemo(() => {
    const allKeys = Object.keys(product);
    let techDetailKeys = allKeys.filter(isTechnicalDetailKey);
    
    const isRibbonCatalog = catalogName.toUpperCase().includes('RIBBON');
    const isEtiquetaCatalog = catalogName.toUpperCase().includes('ETIQUETA');
    const isRollosCatalog = catalogName.toUpperCase().includes('ROLLOS');


    let orderArray: string[] | null = null;
    if (isRibbonCatalog) {
        orderArray = RIBBONS_ORDER;
    } else if (isEtiquetaCatalog) {
        orderArray = ETIQUETAS_ORDER;
    } else if (isRollosCatalog) {
        orderArray = ROLLOS_ORDER;
    }

    if (orderArray) {
        const orderMap = orderArray.reduce((acc, key, index) => {
            acc[normalizeText(key)] = index;
            return acc;
        }, {} as Record<string, number>);

        techDetailKeys.sort((a, b) => {
            const indexA = orderMap[normalizeText(a)];
            const indexB = orderMap[normalizeText(b)];
            if (indexA !== undefined && indexB !== undefined) {
                return indexA - indexB;
            }
            if (indexA !== undefined) return -1;
            if (indexB !== undefined) return 1;
            return a.localeCompare(b);
        });
    }

    const validPriceKeys = allKeys.filter(key => {
        const value = getProductProperty(product, key);
        return isPriceOrAvailabilityKey(key) && value !== undefined && String(value).trim() !== '';
    });

    const groups: { [key: string]: string[] } = {};
    const availabilityKeys: string[] = [];

    const isEtiquetaPriceByVolume = (key: string) => {
        const lowerKey = key.toLowerCase();
        return (
            lowerKey.startsWith('1 caja') ||
            lowerKey.startsWith('de 2 a 3') ||
            lowerKey.startsWith('4 a 8') ||
            lowerKey.startsWith('9 o más')
        );
    };

    validPriceKeys.forEach(key => {
        const keyLower = key.toLowerCase().trim();
        
        if (keyLower.includes('disponibilidad') || keyLower.includes('stock')) {
            availabilityKeys.push(key);
            return;
        }

        const groupMatch = keyLower.match(/(cf|dt|rv)/i);
        if (groupMatch) {
            const groupPrefix = groupMatch[1].toUpperCase();
            if (!groups[groupPrefix]) {
                groups[groupPrefix] = [];
            }
            groups[groupPrefix].push(key);
        } else if (isEtiquetaPriceByVolume(key)) {
            // Explicitly assign volume prices for labels to the CF group
            if (!groups['CF']) {
                groups['CF'] = [];
            }
            groups['CF'].push(key);
        } else if (isPriceOrAvailabilityKey(key)) {
            // For prices like 'Revendedor', 'Distribuidor' in other catalogs
            const genericGroup = 'GENERAL';
             if (!groups[genericGroup]) {
                groups[genericGroup] = [];
            }
            groups[genericGroup].push(key);
        }
    });

    const groupMapping: { [key: string]: string } = {
        'CF': 'Cliente Final',
        'RV': 'Revendedor',
        'DT': 'Distribuidor',
        'GENERAL': 'Precios de Insumos',
    };
    
    const roleToPriceGroupMapping: { [key in UserRole]?: string[] } = {
        'ADMINISTRADOR': ['CF', 'RV', 'DT', 'GENERAL'],
        'VENDEDOR_DMR': ['CF', 'RV', 'DT', 'GENERAL'],
        'CLIENTE_FINAL': ['CF'],
        'REVENDEDOR': ['RV'],
        'DISTRIBUIDOR': ['DT'],
        'USUARIO': [],
    };

    const allowedGroupKeys = new Set<string>();
    userRoles.forEach(role => {
        const groupsForRole = roleToPriceGroupMapping[role];
        if (groupsForRole) {
            groupsForRole.forEach(groupKey => allowedGroupKeys.add(groupKey));
        }
    });
    
    // Specific logic for Ribbons: Revendedor sees Distribuidor prices
    if (catalogName.toUpperCase().includes('RIBBON') && userRoles.includes('REVENDEDOR')) {
      allowedGroupKeys.add('DT');
    }
    
    const priceGroups: { [key: string]: { name: string; keys: string[] } } = {};
    
    const sortedGroupNames = Object.keys(groups)
      .filter(groupKey => allowedGroupKeys.has(groupKey))
      .sort((a, b) => {
        const order = { 'CF': 1, 'GENERAL': 1, 'RV': 2, 'DT': 3 };
        return (order[a as keyof typeof order] || 99) - (order[b as keyof typeof order] || 99);
      });

    sortedGroupNames.forEach(groupKey => {
        const groupNameKey = groupKey as keyof typeof groupMapping;
        const fullGroupName = groupMapping[groupNameKey] || groupKey;

        const keysForGroup = groups[groupKey];
        
        let finalKeys;
        if(groupKey === 'GENERAL') {
             const roleBasedKeys = new Set(['revendedor', 'distribuidor']);
             const allowedLabelKeys = new Set<string>();
             if (userRoles.includes('REVENDEDOR') || userRoles.includes('ADMINISTRADOR') || userRoles.includes('VENDEDOR_DMR')) {
                 allowedLabelKeys.add('revendedor');
             }
             if (userRoles.includes('DISTRIBUIDOR') || userRoles.includes('ADMINISTRADOR') || userRoles.includes('VENDEDOR_DMR')) {
                 allowedLabelKeys.add('distribuidor');
             }

             const quantityKeys = keysForGroup.filter(k => !roleBasedKeys.has(k.toLowerCase()));
             const filteredRoleKeys = keysForGroup.filter(k => allowedLabelKeys.has(k.toLowerCase()));

             finalKeys = [...quantityKeys, ...filteredRoleKeys];
        } else {
            finalKeys = keysForGroup;
        }

        if (finalKeys.length > 0) {
            if (!priceGroups[fullGroupName]) {
                priceGroups[fullGroupName] = { name: fullGroupName, keys: [] };
            }
            priceGroups[fullGroupName].keys.push(...finalKeys);
        }
    });
    
    for (const groupName in priceGroups) {
        priceGroups[groupName].keys = sortPriceKeys(priceGroups[groupName].keys);
    }

    if (availabilityKeys.length > 0) {
        priceGroups['Disponibilidad'] = {
          name: 'Disponibilidad',
          keys: availabilityKeys
        };
    }

    return { priceKeys: validPriceKeys, techDetailKeys, priceGroups };
  }, [product, userRoles, catalogName]);

  const pdfUrl = getProductProperty(product, 'pdfUrl');
  const hasPdf = pdfUrl && pdfUrl.trim() !== '';
  const validTechDetailKeys = techDetailKeys.filter(key => getProductProperty(product, key) && String(getProductProperty(product, key)).trim() !== '');
  
  const hasPrices = Object.values(priceGroups).some(group => group.name !== 'Disponibilidad' && group.keys.length > 0);
  
  const canViewProg = userRoles.includes('ADMINISTRADOR') || userRoles.includes('VENDEDOR_DMR');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Info className="mr-2 h-4 w-4" />
          Ver Detalles
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-primary break-words">{productName}</DialogTitle>
          <p className="text-sm font-semibold break-words">{productName}</p>
          <p className="text-xs text-muted-foreground">SKU: {sku}</p>
        </DialogHeader>
        <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Info. Técnica</TabsTrigger>
            <TabsTrigger value="prices" disabled={!hasPrices}>Precios</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="flex-1 overflow-y-auto">
             <div className="py-4 space-y-6">
                {hasPdf && (
                    <Button asChild className="w-full">
                        <a href={pdfUrl!} target="_blank" rel="noopener noreferrer">
                            <FileText className="mr-2 h-4 w-4" />
                            Ver Ficha Técnica (PDF)
                        </a>
                    </Button>
                )}
                {validTechDetailKeys.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Característica</TableHead>
                            <TableHead>Valor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {validTechDetailKeys.map((key) => (
                                <TableRow key={key}>
                                <TableCell className="font-medium">{formatTechnicalKey(key)}</TableCell>
                                <TableCell className="break-words">{String(getProductProperty(product, key))}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                !hasPdf && (
                    <div className="text-center text-muted-foreground py-8">
                        No hay información técnica disponible para este producto.
                    </div>
                )
                )}
            </div>
          </TabsContent>
          <TabsContent value="prices" className="flex-1 overflow-y-auto">
             <div className="py-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(priceGroups).map((group) => (
                    group.keys.length > 0 && (
                      <React.Fragment key={group.name}>
                        <TableRow>
                          <TableCell colSpan={2} className="bg-muted font-semibold text-muted-foreground">
                            {group.name}
                          </TableCell>
                        </TableRow>
                        {group.keys.map(key => {
                            const value = getProductProperty(product, key);
                            const lowerKey = key.toLowerCase();
                            
                            // Condition to hide 'Prog.' price
                            if (lowerKey.includes('prog.') && !canViewProg) {
                                return null;
                            }
                            
                            let displayKey = key.replace(/\s\((CF|DT|RV)\d*\)/i, '').trim();

                            return (
                              <TableRow key={key}>
                                <TableCell className="font-medium">{displayKey}</TableCell>
                                <TableCell className="text-right">{formatValue(key, value)}</TableCell>
                              </TableRow>
                            );
                        })}
                      </React.Fragment>
                    )
                  ))}
                  {!hasPrices && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-4">
                        {userRoles.includes('USUARIO') ? 'Contacta a un vendedor para ver los precios.' : 'No se encontraron precios para este producto.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
