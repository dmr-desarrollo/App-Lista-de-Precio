
"use client";

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UploadCloud, ServerCrash, FileCheck2, Users, AlertTriangle, Package, RefreshCw } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import Papa from 'papaparse';

type DataType = 'clientes' | 'equipos' | 'accesorios' | 'problemas' | 'desconocido';

export default function ImportarPage() {
  const [csvContent, setCsvContent] = useState('');
  const [catalogName, setCatalogName] = useState('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataType, setDataType] = useState<DataType>('desconocido');
  
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const resetState = () => {
    setCsvContent('');
    setCatalogName('');
    setParsedData([]);
    setHeaders([]);
    setDataType('desconocido');
    setError(null);
    setIsProcessing(false);
    setIsUploading(false);
  };

  const detectDataType = (headers: string[]): DataType => {
    const lowerCaseHeaders = headers.map(h => h.toLowerCase().trim());
    const headerSet = new Set(lowerCaseHeaders);

    // Detección de catálogos de productos/equipos
    const productColumns = ['marca', 'modelo', 'modelos', 'sku', 'p/n', 'cod. dmr', 'referencia', 'código', 'papel', 'tipo', 'precio', 'sustrato', 'buje', 'bandas', 'ancho', 'largo'];
    const hasPriceList = lowerCaseHeaders.some(h => h.startsWith('lista') || h.includes('(cf') || h.includes('(rv') || h.includes('(dt') || h.includes('caja') || h.startsWith('de ') || h.startsWith('revendedor') || h.startsWith('distribuidor'));
    let productColumnCount = 0;
    productColumns.forEach(col => {
      if (headerSet.has(col) || lowerCaseHeaders.some(h => h.includes(col))) productColumnCount++;
    });

    if ((productColumnCount >= 1 && hasPriceList) || productColumnCount >= 3) {
      return 'equipos'; // Se clasifica como 'equipos' para permitir la carga
    }

    // Detección de catálogos de accesorios
    const accessoryColumns = ['tipo accesorio', 'accesorio', 'descripcion', 'marca'];
    let accessoryColumnCount = 0;
    accessoryColumns.forEach(col => {
      if (headerSet.has(col)) accessoryColumnCount++;
    });
    
    if (accessoryColumnCount >= 2 && hasPriceList) {
      return 'accesorios';
    }

    // Detección de otros tipos
    if (headerSet.has('nombre cliente') || headerSet.has('email')) {
      return 'clientes';
    }
    
    if (headerSet.has('descripcion') || headerSet.has('problema') || headerSet.has('descripción')) {
      return 'problemas';
    }
    
    return 'desconocido';
  };
  
  const processCsvContent = useCallback((content: string) => {
    if (!content.trim()) {
      toast({
        variant: "destructive",
        title: "No hay datos que procesar",
        description: "El contenido del CSV está vacío.",
      });
      return;
    }

    setIsProcessing(true);
    setError(null);
    setParsedData([]);
    setHeaders([]);
    setDataType('desconocido');
    
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
          const trimmedHeader = header.trim();
          const lowerHeader = trimmedHeader.toLowerCase();

          // Mapeos específicos para evitar conflictos
          if (lowerHeader.includes('ancho') && !lowerHeader.includes('buje')) return 'Ancho';
          if (lowerHeader.includes('largo') && !lowerHeader.includes('buje')) return 'Largo';
          if (lowerHeader === 'buje') return 'Buje'; // Exact match for 'Buje'
          if (lowerHeader === 'buje largo') return 'Buje largo'; // Exact match for 'Buje largo'
          
          if (lowerHeader === 'material') return 'Material';
          if (lowerHeader === 'cod. dmr' || lowerHeader === 'cod.dmr') return 'Cod. DMR';
          if (lowerHeader === 'rollos/caja' || lowerHeader === 'unid. x caja') return 'Unid. x caja';

          // Capitalizar primera letra para otros casos si no hay mapeo
          return trimmedHeader.charAt(0).toUpperCase() + trimmedHeader.slice(1);
      },
      complete: (results) => {
        const nonEmptyData = (results.data as any[]).filter(row => 
            Object.values(row).some(val => val !== null && String(val).trim() !== '')
        );

        if (nonEmptyData.length === 0 || !results.meta.fields) {
            setError("No se encontraron datos válidos en el archivo. Revisa que el CSV no esté vacío y tenga un formato correcto.");
            setParsedData([]);
            setHeaders([]);
        } else {
            const detectedHeaders = results.meta.fields.filter(h => h.trim() !== ''); // Filtra cabeceras vacías
            const detectedType = detectDataType(detectedHeaders);
            setDataType(detectedType);
            setHeaders(detectedHeaders);
            setParsedData(nonEmptyData);
            toast({
                title: "¡Archivo procesado!",
                description: `Se detectó un archivo de ${detectedType}. Se encontraron ${nonEmptyData.length} filas.`,
            });
        }
        setIsProcessing(false);
      },
      error: (err: any) => {
        const errorMessage = `Error al procesar el CSV: ${err.message}`;
        setError(errorMessage);
        toast({
            variant: "destructive",
            title: "Error de formato en el CSV",
            description: err.message,
        });
        setIsProcessing(false);
      }
    });
  }, [toast]);
  
const handleUploadData = async () => {
    const isCatalogType = dataType === 'equipos' || dataType === 'accesorios';
    if (!isCatalogType || !catalogName.trim() || parsedData.length === 0 || !firestore || !user) {
        if(!isCatalogType) toast({ variant: "destructive", title: "Tipo de dato incorrecto", description: "Solo se pueden crear catálogos a partir de archivos de 'equipos' o 'accesorios'." });
        if(!catalogName.trim()) toast({ variant: "destructive", title: "Falta el nombre del catálogo", description: "Por favor, dale un nombre a tu catálogo." });
        if(parsedData.length === 0) toast({ variant: "destructive", title: "No hay datos para subir", description: "No hay datos procesados para crear el catálogo." });
        if(!firestore || !user) toast({ variant: "destructive", title: "Error de autenticación", description: "Debes iniciar sesión para guardar un catálogo." });
        return;
    }

    setIsUploading(true);
    try {
        const productsCollectionRef = collection(firestore, 'products');
        const batch = writeBatch(firestore);

        // 1. Find and delete existing products for this catalog and user
        const q = query(productsCollectionRef, where('catalogName', '==', catalogName.trim()), where('uid', '==', user.uid));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        // 2. Add new products from the CSV
        parsedData.forEach(productData => {
            const newProductRef = doc(productsCollectionRef);
            
            const cleanedProductData: { [key: string]: any } = {};
            for (const key in productData) {
                if (key.trim() !== '') {
                    cleanedProductData[key] = productData[key];
                }
            }

            const dataToStore = {
                ...cleanedProductData,
                catalogName: catalogName.trim(),
                uid: user.uid,
                createdAt: serverTimestamp(),
            };
            
            batch.set(newProductRef, dataToStore);
        });

        // 3. Commit the batch operation (deletes and adds)
        await batch.commit(); 
        
        toast({
            title: "¡Éxito! Catálogo actualizado.",
            description: `Se han guardado ${parsedData.length} productos del catálogo '${catalogName}' en la nube.`,
        });

        router.push(`/dashboard/catalogo/${encodeURIComponent(catalogName.trim())}`); 

    } catch (e: any) {
        console.error("Error al guardar en Firestore:", e);
        toast({
            variant: "destructive",
            title: "Error al guardar en la nube",
            description: e.message || "No se pudieron guardar los datos.",
        });
    } finally {
        setIsUploading(false);
    }
};


  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(isEntering);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
      handleDragEvents(e, false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
          const file = files[0];
          if (file.type === 'text/csv' || file.name.endsWith('.csv') || file.type === 'application/vnd.ms-excel') {
            // Reset state and set new catalog name
            resetState();
            setCatalogName(file.name.replace(/\.(csv|xls|xlsx)$/i, ''));
            
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
              const content = loadEvent.target?.result as string;
              setCsvContent(content);
              processCsvContent(content);
            };
            reader.readAsText(file, 'UTF-8');
          } else {
            toast({
              variant: "destructive",
              title: "Archivo no válido",
              description: "Por favor, suelta un archivo .csv.",
            });
          }
      }
  };

  const renderPreview = () => {
    if (parsedData.length === 0) return null;

    let icon = <AlertTriangle className="h-4 w-4" />;
    let title = "Tipo de Datos: Desconocido";
    let description = "No se pudo determinar el tipo de datos. Por favor, revisa las columnas del archivo.";
    let variant: "default" | "destructive" = "destructive";
    const isCatalogType = dataType === 'equipos' || dataType === 'accesorios';

    if (dataType === 'clientes') {
        icon = <Users className="h-4 w-4" />;
        title = "Tipo de Datos: Clientes";
        description = `Se encontraron ${parsedData.length} clientes. No se puede crear un catálogo con este tipo de datos.`;
    } else if (dataType === 'equipos') {
        icon = <FileCheck2 className="h-4 w-4" />;
        title = "Tipo de Datos: Equipos / Productos";
        description = `Se encontraron ${parsedData.length} productos. ¡Listo para crear un catálogo!`;
        variant = "default";
    } else if (dataType === 'accesorios') {
        icon = <Package className="h-4 w-4" />;
        title = "Tipo de Datos: Accesorios";
        description = `Se encontraron ${parsedData.length} accesorios. ¡Listo para crear un catálogo!`;
        variant = "default";
    } else if (dataType === 'problemas') {
        icon = <AlertTriangle className="h-4 w-4" />;
        title = "Tipo de Datos: Problemas";
        description = `Se encontraron ${parsedData.length} problemas. No se puede crear un catálogo con este tipo de datos.`;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Paso 2: Darle un nombre y confirmar</CardTitle>
                    <Button variant="outline" size="sm" onClick={resetState}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Importar Otro Archivo
                    </Button>
                </div>
                <Alert variant={variant}>
                    {icon}
                    <AlertTitle>{title}</AlertTitle>
                    <AlertDescription>{description}</AlertDescription>
                </Alert>
            </CardHeader>
            <CardContent>
                 <div className="space-y-2 mb-4">
                  <Label htmlFor="catalog-name">Nombre del Catálogo</Label>
                  <Input
                    id="catalog-name"
                    placeholder="Ej: Lista de Precios de Enero"
                    value={catalogName}
                    onChange={(e) => setCatalogName(e.target.value)}
                    disabled={isUploading}
                  />
                </div>
                <div className="max-h-96 overflow-auto rounded-md border">
                    <Table>
                        <TableHeader className="sticky top-0 bg-muted">
                            <TableRow>
                                {headers.map((h, i) => <TableHead key={`${h}-${i}`}>{h}</TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {parsedData.slice(0, 10).map((row, i) => (
                                <TableRow key={i}>
                                    {headers.map((h, j) => <TableCell key={`${h}-${j}`}>{String(row[h] ?? '')}</TableCell>)}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                {parsedData.length > 10 && <p className="text-sm text-muted-foreground mt-2">Mostrando las primeras 10 de {parsedData.length} filas.</p>}
                 <Button className="w-full mt-4" disabled={!isCatalogType || !catalogName || isProcessing || isUploading} onClick={handleUploadData}>
                    {isUploading ? 'Guardando en la nube...' : 'Crear y Guardar Catálogo en la Nube'}
                </Button>
            </CardContent>
        </Card>
    );
  };
  
  return (
    <div className="space-y-8">
       <Card>
        <CardHeader>
            <CardTitle>Paso 1: Seleccionar Archivo</CardTitle>
            <CardDescription>
                Arrastra y suelta un archivo .csv aquí, o pega el contenido para crear un nuevo catálogo de productos. Los datos se guardarán en tu cuenta.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <div 
                onDragOver={(e) => handleDragEvents(e, true)}
                onDragEnter={(e) => handleDragEvents(e, true)}
                onDragLeave={(e) => handleDragEvents(e, false)}
                onDrop={onDrop}
                className={cn(
                    "flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-12 text-center transition-colors",
                    { "bg-accent border-primary": isDragging }
                )}
                >
                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">
                    {isDragging ? 'Suelta el archivo para cargarlo' : 'Arrastra un archivo CSV aquí'}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">o pega el contenido a continuación</p>
            </div>
            <Textarea
                id="csv-input"
                placeholder="Pega aquí el contenido completo de tu archivo CSV..."
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                className="h-40 text-sm font-mono"
                disabled={isProcessing}
            />
            <Button 
                onClick={() => processCsvContent(csvContent)}
                disabled={isProcessing || !csvContent}
                className="w-full"
            >
                {isProcessing ? 'Procesando...' : 'Procesar Datos Pegados'}
            </Button>
        </CardContent>
       </Card>

        {error && (
            <Alert variant="destructive" className="max-w-full mx-auto">
                <ServerCrash className="h-4 w-4" />
                <AlertTitle>Error Procesando los Datos</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

      {renderPreview()}
    </div>
  );
}
