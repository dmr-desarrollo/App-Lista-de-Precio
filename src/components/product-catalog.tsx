"use client";

import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileSearch, DatabaseZap, Info, X as ClearIcon, Filter, ArrowLeft } from 'lucide-react';
import { ProductCard } from './product-card';
import { type Product } from '@/lib/product-data';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { query, where, collection } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComparisonTray } from './comparison-tray';
import { ComparisonDialog } from './comparison-dialog';
import { useRouter } from 'next/navigation';

interface ProductCatalogProps {
    catalogName: string;
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


export function ProductCatalog({ catalogName }: ProductCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedResolution, setSelectedResolution] = useState('');
  const [selectedPrintType, setSelectedPrintType] = useState('');
  const [selectedInterface, setSelectedInterface] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');
  const [selectedMaterialOrSustrato, setSelectedMaterialOrSustrato] = useState('');
  const [selectedBuje, setSelectedBuje] = useState('');
  const [selectedSalida, setSelectedSalida] = useState('');
  const [selectedBandas, setSelectedBandas] = useState('');
  const [selectedAncho, setSelectedAncho] = useState('');
  const [selectedLargo, setSelectedLargo] = useState('');
  // --- AÑADIR NUEVOS ESTADOS PARA ROLLOS ---
  const [selectedPapel, setSelectedPapel] = useState('');
  const [selectedDiametro, setSelectedDiametro] = useState('');

  const [comparisonList, setComparisonList] = useState<string[]>([]);
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false);
  
  const firestore = useFirestore();
  const router = useRouter();

  const productsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'products'),
      where('catalogName', '==', catalogName)
    );
  }, [firestore, catalogName]);

  const { data: allProducts, isLoading, error } = useCollection<Product>(productsQuery);
  
  const isLabelOrRibbonCatalog = useMemo(() => {
    if (!catalogName) return false;
    const upperCatalogName = catalogName.toUpperCase();
    return upperCatalogName.includes('RIBBON') || upperCatalogName.includes('ETIQUETA') || upperCatalogName.includes('POLIAMIDA');
  }, [catalogName]);

  // --- AÑADIR DETECCIÓN PARA EL NUEVO CATÁLOGO ---
  const isRollosCatalog = useMemo(() => {
    if (!catalogName) return false;
    return catalogName.toUpperCase().includes('ROLLOS');
  }, [catalogName]);

  
  const { 
    filteredProducts, 
    availableBrands, 
    availableResolutions, 
    availablePrintTypes, 
    availableInterfaces, 
    availableTipos, 
    availableMaterialOrSustrato, 
    availableBujes, 
    availableSalidas, 
    availableBandas, 
    availableAnchos, 
    availableLargos, 
    availablePapeles, 
    availableDiametros 
  } = useMemo(() => {
    if (!allProducts) {
        return { filteredProducts: [], availableBrands: [], availableResolutions: [], availablePrintTypes: [], availableInterfaces: [], availableTipos: [], availableMaterialOrSustrato: [], availableBujes: [], availableSalidas: [], availableBandas: [], availableAnchos: [], availableLargos: [], availablePapeles: [], availableDiametros: [] };
    }

    const getUniqueValues = (products: Product[], key: string, processor?: (value: any) => string) => {
        const values = new Set<string>();
        products.forEach(p => {
            const rawValue = getProductProperty(p, key);
            const processedValue = processor ? processor(rawValue) : rawValue;
            if (processedValue !== undefined && processedValue !== null && String(processedValue).trim() !== '') {
                values.add(String(processedValue));
            }
        });
        const unique = Array.from(values);
        return unique.sort((a, b) => !isNaN(Number(a)) && !isNaN(Number(b)) ? Number(a) - Number(b) : a.localeCompare(b));
    };

    let baseProducts = allProducts;
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        baseProducts = allProducts.filter(product => {
            const searchableProperties = ['Descripcion', 'SKU', 'P/N', 'Cod. DMR', 'Marca', 'Modelo', 'Tipo', 'Sustrato', 'Buje', 'Salida', 'Ancho', 'Largo', 'Material', 'Papel', 'Diametro'];
            return searchableProperties.some(key => {
                let value = getProductProperty(product, key) || '';
                if (key.toLowerCase() === 'marca') value = getBrandNameFromUrl(value);
                return String(value).toLowerCase().includes(term);
            });
        });
    }

    const campoMaterial = isLabelOrRibbonCatalog && catalogName.toUpperCase().includes('POLIAMIDA') ? 'Material' : 'Sustrato';

    const applyFilters = (products: Product[], filtersToApply: Record<string, string>) => {
        let filtered = [...products];
        if (filtersToApply.brand) filtered = filtered.filter(p => getBrandNameFromUrl(getProductProperty(p, 'Marca')) === filtersToApply.brand);
        if (filtersToApply.resolution) filtered = filtered.filter(p => String(getProductProperty(p, 'Resolucion')) === filtersToApply.resolution);
        if (filtersToApply.printType) filtered = filtered.filter(p => String(getProductProperty(p, 'Tipo de Impresión')) === filtersToApply.printType);
        if (filtersToApply.interface) filtered = filtered.filter(p => String(getProductProperty(p, 'Interfaz')) === filtersToApply.interface);
        if (filtersToApply.tipo) filtered = filtered.filter(p => String(getProductProperty(p, 'Tipo')) === filtersToApply.tipo);
        if (filtersToApply.materialOrSustrato) filtered = filtered.filter(p => String(getProductProperty(p, campoMaterial)) === filtersToApply.materialOrSustrato);
        if (filtersToApply.buje) filtered = filtered.filter(p => String(getProductProperty(p, 'Buje')) === filtersToApply.buje);
        if (filtersToApply.salida) filtered = filtered.filter(p => String(getProductProperty(p, 'Salida')) === filtersToApply.salida);
        if (filtersToApply.bandas) filtered = filtered.filter(p => String(getProductProperty(p, 'bandas')) === filtersToApply.bandas);
        if (filtersToApply.ancho) filtered = filtered.filter(p => String(getProductProperty(p, 'Ancho')) === filtersToApply.ancho);
        if (filtersToApply.largo) filtered = filtered.filter(p => String(getProductProperty(p, 'Largo')) === filtersToApply.largo);
        // --- AÑADIR LÓGICA DE FILTRO PARA ROLLOS ---
        if (filtersToApply.papel) filtered = filtered.filter(p => String(getProductProperty(p, 'Papel')) === filtersToApply.papel);
        if (filtersToApply.diametro) filtered = filtered.filter(p => String(getProductProperty(p, 'Diametro')) === filtersToApply.diametro);
        return filtered;
    };

    const activeFilters = {
        brand: selectedBrand, resolution: selectedResolution, printType: selectedPrintType, interface: selectedInterface,
        tipo: selectedTipo, materialOrSustrato: selectedMaterialOrSustrato, buje: selectedBuje, salida: selectedSalida,
        bandas: selectedBandas, ancho: selectedAncho, largo: selectedLargo,
        // --- AÑADIR FILTROS ACTIVOS PARA ROLLOS ---
        papel: selectedPapel, diametro: selectedDiametro
    };
    
    const productsAfterFilters = applyFilters(baseProducts, activeFilters as Record<string, string>);

    const getAvailableOptionsFor = (filterKey: keyof typeof activeFilters) => {
        const filtersWithoutCurrent = { ...activeFilters, [filterKey]: '' };
        const temporarilyFiltered = applyFilters(baseProducts, filtersWithoutCurrent as Record<string, string>);
        
        const propertyMap: { [key: string]: string } = {
            brand: 'Marca', resolution: 'Resolucion', printType: 'Tipo de Impresión', interface: 'Interfaz',
            tipo: 'Tipo', materialOrSustrato: campoMaterial, buje: 'Buje', salida: 'Salida', bandas: 'bandas',
            ancho: 'Ancho', largo: 'Largo',
            // --- AÑADIR MAPA DE PROPIEDADES PARA ROLLOS ---
            papel: 'Papel', diametro: 'Diametro'
        };
        
        const processor = filterKey === 'brand' ? getBrandNameFromUrl : undefined;
        return getUniqueValues(temporarilyFiltered, propertyMap[filterKey], processor);
    };

    return {
        filteredProducts: productsAfterFilters,
        availableBrands: getAvailableOptionsFor('brand'),
        availableResolutions: getAvailableOptionsFor('resolution'),
        availablePrintTypes: getAvailableOptionsFor('printType'),
        availableInterfaces: getAvailableOptionsFor('interface'),
        availableTipos: getAvailableOptionsFor('tipo'),
        availableMaterialOrSustrato: getAvailableOptionsFor('materialOrSustrato'),
        availableBujes: getAvailableOptionsFor('buje'),
        availableSalidas: getAvailableOptionsFor('salida'),
        availableBandas: getAvailableOptionsFor('bandas'),
        availableAnchos: getAvailableOptionsFor('ancho'),
        availableLargos: getAvailableOptionsFor('largo'),
        // --- OBTENER OPCIONES DISPONIBLES PARA ROLLOS ---
        availablePapeles: getAvailableOptionsFor('papel'),
        availableDiametros: getAvailableOptionsFor('diametro'),
    };

  }, [
    allProducts, searchTerm, selectedBrand, selectedResolution, selectedPrintType, 
    selectedInterface, selectedTipo, selectedMaterialOrSustrato, selectedBuje, selectedSalida, 
    selectedBandas, selectedAncho, selectedLargo, selectedPapel, 
    selectedDiametro, catalogName, isLabelOrRibbonCatalog
  ]);


  const clearFilters = () => {
    setSearchTerm('');
    setSelectedBrand('');
    setSelectedResolution('');
    setSelectedPrintType('');
    setSelectedInterface('');
    setSelectedTipo('');
    setSelectedMaterialOrSustrato('');
    setSelectedBuje('');
    setSelectedSalida('');
    setSelectedBandas('');
    setSelectedAncho('');
    setSelectedLargo('');
    // --- LIMPIAR FILTROS DE ROLLOS ---
    setSelectedPapel('');
    setSelectedDiametro('');
  };

  const handleToggleCompare = useCallback((productId: string) => {
    setComparisonList(prevList =>
      prevList.includes(productId)
        ? prevList.filter(id => id !== productId)
        : [...prevList, productId]
    );
  }, []);
  
  const renderContent = () => {
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <DatabaseZap className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-lg text-muted-foreground">Cargando productos desde la nube...</p>
            </div>
        );
    }
    
    if (error) {
       return (
           <div className="py-20 text-center">
               <Alert className="max-w-lg mx-auto" variant="destructive">
                   <Info className="h-4 w-4" />
                   <AlertTitle>Error al Cargar el Catálogo</AlertTitle>
                   <AlertDescription>
                       {error.message || "Ocurrió un error inesperado."}
                       <br />
                       Intenta importar un archivo para crear un nuevo catálogo.
                   </AlertDescription>
                   <div className="mt-4">
                       <Button asChild>
                           <Link href="/dashboard/importar">Ir a Importar Datos</Link>
                       </Button>
                   </div>
               </Alert>
           </div>
       );
    }


    if (!allProducts || allProducts.length === 0) {
      return (
           <div className="py-20 text-center">
               <Alert className="max-w-lg mx-auto">
                   <Info className="h-4 w-4" />
                   <AlertTitle>No hay productos en este catálogo</AlertTitle>
                   <AlertDescription>
                       No se encontraron datos para '{catalogName}'. Puede que el catálogo esté vacío.
                       <br />
                       Intenta importar un archivo CSV con productos para este catálogo.
                   </AlertDescription>
                   <div className="mt-4">
                       <Button asChild>
                           <Link href="/dashboard/importar">Ir a Importar Datos</Link>
                       </Button>
                   </div>
               </Alert>
           </div>
       );
    }

    const activeFilterCount = [
        selectedBrand, selectedResolution, selectedPrintType, selectedInterface, 
        searchTerm, selectedTipo, selectedMaterialOrSustrato, selectedBuje, selectedSalida, 
        selectedBandas, selectedAncho, selectedLargo,
        selectedPapel, selectedDiametro // Añadir al conteo
    ].filter(Boolean).length;
    const campoMaterialLabel = catalogName.toUpperCase().includes('POLIAMIDA') ? "Material" : "Sustrato";


    return (
      <>
        <div className="flex justify-end">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Atrás
            </Button>
        </div>
        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filtros y Búsqueda
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="relative">
                     <Input
                         type="search"
                         placeholder="Buscar por Marca, Modelo, Descripción, Referencia (SKU), o Cod. DMR..."
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="w-full text-base rounded-lg p-3 pr-10"
                     />
                      {searchTerm && (
                         <Button 
                             variant="ghost" 
                             size="icon" 
                             className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                             onClick={() => setSearchTerm('')}
                         >
                             <ClearIcon className="h-4 w-4" />
                         </Button>
                     )}
                 </div>

                <div className="flex flex-wrap gap-4">
                    {availableBrands.length > 1 && !isLabelOrRibbonCatalog && !isRollosCatalog && (
                        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                            <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue placeholder="Filtrar por marca" /></SelectTrigger>
                            <SelectContent>{availableBrands.map(brandName => (<SelectItem key={brandName} value={brandName}>{brandName}</SelectItem>))}</SelectContent>
                        </Select>
                    )}
                    
                    {availableResolutions.length > 1 && (
                        <Select value={selectedResolution} onValueChange={setSelectedResolution}>
                            <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue placeholder="Filtrar por resolución" /></SelectTrigger>
                            <SelectContent>{availableResolutions.map(res => (<SelectItem key={res} value={res}>{res}</SelectItem>))}</SelectContent>
                        </Select>
                    )}

                    {availablePrintTypes.length > 1 && (
                        <Select value={selectedPrintType} onValueChange={setSelectedPrintType}>
                            <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue placeholder="Filtrar por tipo de impresión" /></SelectTrigger>
                            <SelectContent>{availablePrintTypes.map(pt => (<SelectItem key={pt} value={pt}>{pt}</SelectItem>))}</SelectContent>
                        </Select>
                    )}

                     {availableInterfaces.length > 1 && (
                         <Select value={selectedInterface} onValueChange={setSelectedInterface}>
                             <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue placeholder="Filtrar por interfaz" /></SelectTrigger>
                             <SelectContent>{availableInterfaces.map(i => (<SelectItem key={i} value={i}>{i}</SelectItem>))}</SelectContent>
                         </Select>
                     )}
                    
                    {isLabelOrRibbonCatalog && availableMaterialOrSustrato.length > 1 && (
                        <Select value={selectedMaterialOrSustrato} onValueChange={setSelectedMaterialOrSustrato}>
                            <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue placeholder={`Filtrar por ${campoMaterialLabel}`} /></SelectTrigger>
                            <SelectContent>{availableMaterialOrSustrato.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
                        </Select>
                    )}

                    {/* --- INICIO: NUEVOS FILTROS PARA ROLLOS --- */}
                    {isRollosCatalog && availablePapeles.length > 1 && (
                        <Select value={selectedPapel} onValueChange={setSelectedPapel}>
                            <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue placeholder="Filtrar por Papel" /></SelectTrigger>
                            <SelectContent>{availablePapeles.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
                        </Select>
                    )}
                    {isRollosCatalog && availableDiametros.length > 1 && (
                        <Select value={selectedDiametro} onValueChange={setSelectedDiametro}>
                            <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue placeholder="Filtrar por Diámetro (mm)" /></SelectTrigger>
                            <SelectContent>{availableDiametros.map(d => (<SelectItem key={d} value={d}>{`${d} mm`}</SelectItem>))}</SelectContent>
                        </Select>
                    )}
                    {/* --- FIN: NUEVOS FILTROS PARA ROLLOS --- */}


                    {/* --- Modificar condición de filtros existentes --- */}
                    {(isLabelOrRibbonCatalog || isRollosCatalog) && availableAnchos.length > 1 && (
                        <Select value={selectedAncho} onValueChange={setSelectedAncho}>
                            <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue placeholder="Filtrar por ancho (mm)" /></SelectTrigger>
                            <SelectContent>{availableAnchos.map(a => (<SelectItem key={a} value={a}>{`${a} mm`}</SelectItem>))}</SelectContent>
                        </Select>
                    )}
                    
                    {(isLabelOrRibbonCatalog || isRollosCatalog) && availableLargos.length > 1 && (
                        <Select value={selectedLargo} onValueChange={setSelectedLargo}>
                            <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue placeholder="Filtrar por largo (mm)" /></SelectTrigger>
                            <SelectContent>{availableLargos.map(l => (<SelectItem key={l} value={l}>{`${l} mm`}</SelectItem>))}</SelectContent>
                        </Select>
                    )}

                    {(isLabelOrRibbonCatalog || isRollosCatalog) && availableTipos.length > 1 && (
                        <Select value={selectedTipo} onValueChange={setSelectedTipo}>
                            <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue placeholder="Filtrar por tipo" /></SelectTrigger>
                            <SelectContent>{availableTipos.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
                        </Select>
                    )}

                    {(isLabelOrRibbonCatalog || isRollosCatalog) && availableBujes.length > 1 && (
                        <Select value={selectedBuje} onValueChange={setSelectedBuje}>
                            <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue placeholder="Filtrar por buje (mm)" /></SelectTrigger>
                            <SelectContent>{availableBujes.map(b => (<SelectItem key={b} value={b}>{`${b} mm`}</SelectItem>))}</SelectContent>
                        </Select>
                    )}

                    {isLabelOrRibbonCatalog && availableSalidas.length > 1 && (
                         <Select value={selectedSalida} onValueChange={setSelectedSalida}>
                             <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue placeholder="Filtrar por salida" /></SelectTrigger>
                             <SelectContent>{availableSalidas.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
                         </Select>
                    )}
                    
                    {isLabelOrRibbonCatalog && availableBandas.length > 1 && (
                         <Select value={selectedBandas} onValueChange={setSelectedBandas}>
                             <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue placeholder="Filtrar por bandas" /></SelectTrigger>
                             <SelectContent>{availableBandas.map(b => (<SelectItem key={b} value={b}>{b}</SelectItem>))}</SelectContent>
                         </Select>
                    )}
                </div>
                 {activeFilterCount > 0 && (
                    <div className="flex justify-between items-center mt-4">
                        <span className="text-sm text-muted-foreground">{filteredProducts.length} resultado(s)</span>
                        <Button variant="ghost" onClick={clearFilters}>
                            <ClearIcon className="mr-2 h-4 w-4"/>
                            Limpiar {activeFilterCount} filtro(s)
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
        
        {filteredProducts.length > 0 ? (
           <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
           {filteredProducts.map((product) => {
             const productId = getProductProperty(product, 'id') || getProductProperty(product, 'SKU') || getProductProperty(product, 'P/N') || getProductProperty(product, 'Modelo') || Math.random();
             return (
               <ProductCard 
                 key={productId} 
                 product={product}
                 catalogName={catalogName}
                 onCompareToggle={() => handleToggleCompare(productId)}
                 isComparing={comparisonList.includes(productId)}
               />
             )})}
         </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-20 text-center">
            <FileSearch className="h-16 w-16 text-muted-foreground" />
            <h2 className="mt-6 text-xl font-semibold">No se encontraron productos</h2>
            <p className="mt-2 text-muted-foreground">
                Ningún producto coincide con los filtros y la búsqueda actual.
            </p>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {renderContent()}

      <ComparisonTray
        products={allProducts?.filter(p => {
          const productId = getProductProperty(p, 'id') || getProductProperty(p, 'SKU') || getProductProperty(p, 'P/N') || getProductProperty(p, 'Modelo') || Math.random();
          return comparisonList.includes(productId);
        }) || []}
        onClear={() => setComparisonList([])}
        onCompare={() => setIsCompareDialogOpen(true)}
        onRemove={(id) => handleToggleCompare(id)}
      />
      
      <ComparisonDialog
        products={allProducts?.filter(p => {
          const productId = getProductProperty(p, 'id') || getProductProperty(p, 'SKU') || getProductProperty(p, 'P/N') || getProductProperty(p, 'Modelo') || Math.random();
          return comparisonList.includes(productId);
        }) || []}
        open={isCompareDialogOpen}
        onOpenChange={setIsCompareDialogOpen}
      />

    </div>
  );
}
