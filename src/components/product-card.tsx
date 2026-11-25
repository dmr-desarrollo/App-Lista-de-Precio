import type { Product } from '@/lib/product-data';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ProductDetailDialog } from './product-detail-dialog';
import { PictureInPicture } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

// 1. AÑADIMOS UNA FUNCIÓN AUXILIAR PARA NORMALIZAR TEXTO
const normalizeText = (text: string | null | undefined): string => {
    if (!text) return '';
    return text
        .toLowerCase() // Pone todo en minúsculas
        .normalize('NFD') // Descompone los caracteres con tilde (ej: 'ó' se convierte en 'o' y '´')
        .replace(/[\u0300-\u036f]/g, ''); // Elimina los acentos (diacríticos)
};

// 2. HACEMOS QUE getProductProperty USE LA NUEVA FUNCIÓN
const getProductProperty = (product: Product, key: string): any => {
    if (!product || !key) return null;
    const normalizedKey = normalizeText(key); // Normaliza la clave que buscamos
    for (const propKey in product) {
        // Normaliza la clave del producto antes de comparar
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

const isUrl = (value: string | null | undefined): boolean => {
    if (!value) return false;
    try {
        new URL(value);
        return true;
    } catch (_) {
        return false;
    }
}

interface ProductCardProps {
    product: Product;
    catalogName: string;
    onCompareToggle: (productId: string) => void;
    isComparing: boolean;
}

export function ProductCard({ product, catalogName, onCompareToggle, isComparing }: ProductCardProps) {
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

    const title = getTitle() || 'Sin Título';
    const productId = getProductProperty(product, 'id') || getProductProperty(product, 'SKU') || getProductProperty(product, 'P/N') || title;
    const brandValue = getProductProperty(product, 'Marca');
    const logoUrl = brandValue && isUrl(brandValue) ? brandValue : null;
    const brandText = brandValue && !isUrl(brandValue) ? brandValue.substring(brandValue.lastIndexOf('/') + 1) : (logoUrl ? getBrandNameFromUrl(logoUrl) : null);
    const imageUrl = getProductProperty(product, 'imageUrl');
    const codDMR = getProductProperty(product, 'Cod. DMR') || 'No disponible';

    return (
        <Card className="flex h-full flex-col justify-between overflow-hidden transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1">
            <div>
                {(logoUrl || brandText) && (
                    <div className="flex h-14 items-center justify-start border-b bg-card p-4">
                        {logoUrl ? (
                            <Image
                                src={logoUrl}
                                alt={`Logo de ${brandText || 'marca'}`}
                                width={80}
                                height={30}
                                className="object-contain h-[30px] w-auto"
                            />
                        ) : (
                            <span className="font-semibold text-muted-foreground">{brandText}</span>
                        )}
                    </div>
                )}
                <div className="relative w-full h-48 flex items-center justify-center bg-muted/20 p-4">
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt={`Imagen de ${title}`}
                            width={180}
                            height={180}
                            className="object-contain h-full w-auto"
                            priority
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted/50">
                            <PictureInPicture className="h-16 w-16 text-muted-foreground/50" />
                        </div>
                    )}
                </div>
                <CardHeader>
                    <CardTitle className="text-base font-semibold text-primary break-words">{title}</CardTitle>
                    <CardDescription>
                        Cod. DMR: {codDMR}
                    </CardDescription>
                </CardHeader>
            </div>
            <CardFooter>
                <div className="flex flex-wrap gap-4 items-center justify-between w-full">
                    <ProductDetailDialog product={product} />
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id={`compare-${productId}`}
                            checked={isComparing}
                            onCheckedChange={() => onCompareToggle(productId)}
                            aria-label={`Comparar ${title}`}
                        />
                        <Label htmlFor={`compare-${productId}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Comparar
                        </Label>
                    </div>
                </div>
            </CardFooter>
        </Card>
    );
}
