// src/components/comparison-dialog.tsx

import { useMemo, useState, useEffect } from 'react';
import type { Product } from '@/lib/product-data';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { UserProfile, UserRole } from '@/lib/user-profile';

type ProductType = 'equipo' | 'insumo' | 'etiqueta';

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

const getBrandNameFromUrl = (url: string): string => {
    if (!url || typeof url !== 'string') {
        return '';
    }
    try {
        const decodedUrl = decodeURIComponent(url);
        const urlWithoutParams = decodedUrl.split('?')[0];
        const fileName = urlWithoutParams.substring(urlWithoutParams.lastIndexOf('/') + 1);
        const brandName = fileName.substring(0, fileName.lastIndexOf('.'));
        return brandName;
    } catch (error) {
        console.error('Error al extraer el nombre de la marca:', error);
        return '';
    }
};

const parsePrice = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  
  const stringValue = String(value);
  
  const withoutDots = stringValue.replace(/\./g, '');
  const withDotDecimal = withoutDots.replace(',', '.');
  const number = parseFloat(withDotDecimal);
  
  return isNaN(number) ? null : number;
};

const formatPrice = (value: any): string => {
  const number = parsePrice(value);

  if (number !== null) {
    const roundedNumber = Math.round(number);
    const formattedNumber = new Intl.NumberFormat('de-DE').format(roundedNumber);
    return `U$S ${formattedNumber}`;
  }

  return 'N/A';
};


const ALL_TECHNICAL_ATTRIBUTES: { key: string; label: string }[] = [
    // --- Campos Comunes ---
    { key: 'Marca', label: 'Marca' },
    { key: 'P/N', label: 'P/N' },
    { key: 'Cod. DMR', label: 'Cod. DMR' },
    
    // --- Campos de Impresoras ---
    { key: 'Modelo', label: 'Modelo' },
    { key: 'Serie', label: 'Serie' },
    { key: 'Tipo de Impresión', label: 'Tipo de Impresión' },
    { key: 'Resolución', label: 'Resolución' },
    { key: 'Velocidad', label: 'Velocidad' },
    { key: 'Interfaz', label: 'Interfaz' },
    { key: 'Volumen de impresión', label: 'Volumen de Impresión' },

    // --- Campos de Accesorios ---
    { key: 'Modelos', label: 'Modelos Compatibles' },
];

const PRICE_ATTRIBUTES: { id: string; label: string; keys: string[], role_keys: string[], type: ProductType }[] = [
    // Precios Insumos (Ribbons, Rollos, etc)
    { id: 'cf1', label: 'CF - Unitario', keys: ['Unitario (CF1)', 'Unitario (Cf1)'], role_keys: ['CF'], type: 'insumo' },
    { id: 'cf2', label: 'CF - Caja', keys: ['Caja (CF2)'], role_keys: ['CF'], type: 'insumo' },
    { id: 'rv1', label: 'RV - Unitario', keys: ['Unitario (RV1)'], role_keys: ['RV'], type: 'insumo' },
    { id: 'rv2', label: 'RV - Caja', keys: ['Caja (RV2)'], role_keys: ['RV'], type: 'insumo' },
    { id: 'dt1', label: 'DT - Unitario', keys: ['Unitario (DT1)', 'Unitario (Dt1)'], role_keys: ['DT'], type: 'insumo' },
    { id: 'dt2', label: 'DT - Caja', keys: ['Caja (DT2)', 'Caja (Dt2)'], role_keys: ['DT'], type: 'insumo' },
    { id: 'dt3', label: 'DT - Prog.', keys: ['Prog. (DT3)'], role_keys: ['DT'], type: 'insumo' },

    // Precios de Etiquetas por volumen
    { id: 'et_cf1', label: 'CF - 1 caja', keys: ['1 caja'], role_keys: ['CF'], type: 'etiqueta' },
    { id: 'et_cf2', label: 'CF - De 2 a 3 cajas', keys: ['de 2 a 3 cajas'], role_keys: ['CF'], type: 'etiqueta' },
    { id: 'et_cf3', label: 'CF - 4 a 8 cajas', keys: ['4 a 8 cajas'], role_keys: ['CF'], type: 'etiqueta' },
    { id: 'et_cf4', label: 'CF - 9 o más cajas', keys: ['9 o más cajas'], role_keys: ['CF'], type: 'etiqueta' },
    { id: 'et_rv', label: 'RV - Precio Revendedor', keys: ['Revendedor'], role_keys: ['RV'], type: 'etiqueta' },
    { id: 'et_dt', label: 'DT - Precio Distribuidor', keys: ['Distribuidor'], role_keys: ['DT'], type: 'etiqueta' },

    
    // Precios Equipos
    { id: 'eq_cf1', label: 'CF - Unitario', keys: ['Unitario (CF1)'], role_keys: ['CF'], type: 'equipo' },
    { id: 'eq_cf2', label: 'CF - (4-7 und.)', keys: ['4 a 7 unid. (CF2)'], role_keys: ['CF'], type: 'equipo' },
    { id: 'eq_cf3', label: 'CF - (+8 und.)', keys: ['+ 8 unid. (CF3)'], role_keys: ['CF'], type: 'equipo' },
    { id: 'eq_rv1', label: 'RV - (1-9 und.)', keys: ['1 a 9 unid. (RV1)'], role_keys: ['RV'], type: 'equipo' },
    { id: 'eq_rv2', label: 'RV - (+10 und.)', keys: ['+ 10 unid. (RV2)'], role_keys: ['RV'], type: 'equipo' },
    { id: 'eq_dt1', label: 'DT - (1-9 und.)', keys: ['1 a 9 unid. (DT1)'], role_keys: ['DT'], type: 'equipo' },
    { id: 'eq_dt2', label: 'DT - (+10 und.)', keys: ['+ 10 unid. (DT2)'], role_keys: ['DT'], type: 'equipo' },
];


const IMPORTANT_DIFFERENCE_KEYS = [
  'Tipo de Impresión',
  'Resolución',
  'Velocidad',
  'Interfaz',
  'Volumen de impresión'
];

interface ComparisonDialogProps {
  products: Product[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getProductType = (products: Product[]): ProductType => {
  if (!products || products.length === 0) return 'equipo'; // Default

  const firstProductCatalog = getProductProperty(products[0], 'catalogName') || '';
  if (firstProductCatalog.toUpperCase().includes('ETIQUETA')) {
    return 'etiqueta';
  }

  const isAnyInsumo = products.some(p => {
    for (const key in p) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('caja') || lowerKey.includes('prog.')) {
        return true;
      }
    }
    return false;
  });
  return isAnyInsumo ? 'insumo' : 'equipo';
};


export function ComparisonDialog({ products, open, onOpenChange }: ComparisonDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const userRoles = useMemo(() => userProfile?.roles || ['USUARIO'], [userProfile]);
  
  const productType = useMemo(() => getProductType(products), [products]);

  const availablePriceAttributes = useMemo(() => {
      const rolePriceMapping: { [key in UserRole]?: string[] } = {
          'ADMINISTRADOR': ['CF', 'RV', 'DT'],
          'VENDEDOR_DMR': ['CF', 'RV', 'DT'],
          'CLIENTE_FINAL': ['CF'],
          'REVENDEDOR': ['RV'],
          'DISTRIBUIDOR': ['DT'],
          'USUARIO': [],
      };

      const allowedRoleKeys = new Set<string>();
      userRoles.forEach(role => {
          (rolePriceMapping[role] || []).forEach(key => allowedRoleKeys.add(key));
      });
      
      // Special rule for Ribbons
      if (getProductProperty(products[0], 'catalogName')?.toUpperCase().includes('RIBBON') && userRoles.includes('REVENDEDOR')) {
        allowedRoleKeys.add('DT');
      }

      return PRICE_ATTRIBUTES.filter(attr => 
          attr.type === productType &&
          attr.role_keys.some(key => allowedRoleKeys.has(key))
      );
  }, [userRoles, productType, products]);


  const [selectedPriceKey, setSelectedPriceKey] = useState<string>('');

  useEffect(() => {
    if (availablePriceAttributes.length > 0 && !availablePriceAttributes.some(attr => attr.id === selectedPriceKey)) {
      setSelectedPriceKey(availablePriceAttributes[0].id);
    } else if (availablePriceAttributes.length === 0) {
      setSelectedPriceKey('');
    }
  }, [availablePriceAttributes, selectedPriceKey]);
  
  const priceStats = useMemo(() => {
    const stats: { [key: string]: { min: number; max: number } } = {};
    
    availablePriceAttributes.forEach(attr => {
        const prices = products
            .flatMap(p => attr.keys.map(key => parsePrice(getProductProperty(p, key))))
            .filter((p): p is number => p !== null && p > 0);

        if (prices.length > 1) {
            stats[attr.id] = {
                min: Math.min(...prices),
                max: Math.max(...prices),
            };
        }
    });
    
    return stats;
  }, [products, availablePriceAttributes]);

  const relevantTechnicalAttributes = useMemo(() => {
    return ALL_TECHNICAL_ATTRIBUTES.filter(attr => {
      return products.some(p => {
        const value = getProductProperty(p, attr.key);
        return value !== undefined && value !== null && String(value).trim() !== '';
      });
    });
  }, [products]);

  const getAttributeValue = (product: Product, attrKey: string): string => {
      let value = getProductProperty(product, attrKey);
      if (attrKey.toLowerCase() === 'marca') {
          value = getBrandNameFromUrl(value || '');
      }
      return String(value || 'N/A').trim();
  };

  const hasPrices = availablePriceAttributes.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] md:w-full">
        <DialogHeader>
          <DialogTitle>Comparativa de Productos</DialogTitle>
          <DialogDescription>
            Aquí puedes ver las características de los productos seleccionados lado a lado.
          </DialogDescription>
        </DialogHeader>

        {hasPrices && (
          <div className="flex items-center gap-2 py-4">
              <Label htmlFor="price-select" className="font-bold shrink-0 text-xs sm:text-sm">Comparar Precios:</Label>
              <Select value={selectedPriceKey} onValueChange={setSelectedPriceKey}>
                  <SelectTrigger id="price-select" className="w-full md:w-[280px]">
                      <SelectValue placeholder="Elegir lista de precios..." />
                  </SelectTrigger>
                  <SelectContent>
                      {availablePriceAttributes.map(attr => (
                          <SelectItem key={attr.id} value={attr.id}>{attr.label}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          </div>
        )}

        <ScrollArea className="overflow-auto max-h-[60vh] -mx-6 sm:mx-0">
          <Table className="text-xs md:text-sm table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold min-w-[120px] md:min-w-[200px] sticky left-0 bg-background z-10 px-2 sm:px-4 break-words">Característica</TableHead>
                {products.map(p => {
                  const productId = getProductProperty(p, 'id') || getProductProperty(p, 'SKU') || getProductProperty(p, 'P/N') || getProductProperty(p, 'Modelo') || Math.random().toString();
                  return <TableHead key={productId} className="font-bold text-center px-2 sm:px-4 break-words">{getProductProperty(p, 'Descripcion') || getProductProperty(p, 'Modelo')}</TableHead>;
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {relevantTechnicalAttributes.map(({ key, label }) => {
                const values = products.map(p => getAttributeValue(p, key));
                const allSame = values.every(v => v === values[0]);
                const shouldHighlight = IMPORTANT_DIFFERENCE_KEYS.includes(key) && !allSame;
                const rowClassName = shouldHighlight ? 'bg-highlight' : '';

                return (
                    <TableRow key={key} className={rowClassName}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10 group-data-[highlight=true]:bg-highlight px-2 sm:px-4 break-words">{label}</TableCell>
                    {products.map((p, index) => {
                        const productId = getProductProperty(p, 'id') || getProductProperty(p, 'SKU') || getProductProperty(p, 'P/N') || getProductProperty(p, 'Modelo') || Math.random().toString();
                        return <TableCell key={productId} className="text-center px-2 sm:px-4 break-words">{values[index]}</TableCell>;
                    })}
                    </TableRow>
                );
              })}
              
              {hasPrices && (() => {
                const selectedPriceAttr = availablePriceAttributes.find(attr => attr.id === selectedPriceKey);
                if (!selectedPriceAttr) return null;
                
                return (
                  <TableRow key={selectedPriceAttr.id}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10 px-2 sm:px-4 break-words">{selectedPriceAttr.label}</TableCell>
                    {products.map(p => {
                      const productId = getProductProperty(p, 'id') || getProductProperty(p, 'SKU') || getProductProperty(p, 'P/N') || getProductProperty(p, 'Modelo') || Math.random().toString();
                      const stats = priceStats[selectedPriceAttr.id];
                      const priceValue = selectedPriceAttr.keys.map(key => getProductProperty(p, key)).find(v => v);
                      const numericValue = parsePrice(priceValue);
                      let className = 'text-center px-2 sm:px-4';

                      if (stats && numericValue !== null) {
                        if (numericValue === stats.min) {
                          className = cn(className, 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-300 font-bold');
                        } else if (numericValue === stats.max) {
                          className = cn(className, 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-300');
                        }
                      }
                      
                      return <TableCell key={productId} className={className}>{formatPrice(priceValue)}</TableCell>;
                    })}
                  </TableRow>
                );
              })()}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
