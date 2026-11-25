
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { List } from 'lucide-react';
import { useAccordion } from '@/context/accordion-context';
import { useEffect } from 'react';

export default function PreciosPage() {
  const { setOpenItems } = useAccordion();
  
  // Limpia el estado del acordeón al entrar a esta página
  useEffect(() => {
    setOpenItems([]);
  }, [setOpenItems]);

  return (
    <div className="py-20 text-center">
        <Alert className="max-w-lg mx-auto">
           <List className="h-4 w-4" />
           <AlertTitle>Selecciona un catálogo</AlertTitle>
           <AlertDescription>
                Por favor, selecciona uno de los catálogos del menú de la izquierda para ver los productos.
                <br />
                Si no tienes ninguno, puedes importar un archivo CSV.
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
