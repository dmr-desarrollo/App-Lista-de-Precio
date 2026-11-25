"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Trash2, List } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

type Catalog = {
  id: string;
  name: string;
};

export default function ManageCatalogsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const { data: userCatalogs, isLoading } = useCollection('products', {
    buildQuery: (ref) => query(ref, where('uid', '==', user?.uid || '')),
  });

  const uniqueCatalogs = userCatalogs
    ? [...new Map(userCatalogs.map(item => [item['catalogName'], { name: item.catalogName, id: item.catalogName }])).values()]
    : [];

  const handleDeleteCatalog = async (catalogName: string) => {
    if (!firestore || !user) return;

    try {
      const q = query(collection(firestore, 'products'), where('catalogName', '==', catalogName), where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Catálogo no encontrado",
          description: `No se encontraron productos para el catálogo '${catalogName}'.`,
        });
        return;
      }
      
      const batch = writeBatch(firestore);
      const deletedDocsInfo = querySnapshot.docs.map(doc => ({ path: doc.ref.path, data: doc.data() }));

      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();

      toast({
        title: "Catálogo eliminado",
        description: `El catálogo '${catalogName}' y todos sus productos han sido eliminados.`,
      });

    } catch (e: any) {
      // Create and emit a contextual error for permission issues
      if (e.code === 'permission-denied') {
        const contextualError = new FirestorePermissionError({
          operation: 'delete',
          path: `products (batch for catalog: ${catalogName})`, // Path is generalized for batch op
        });
        errorEmitter.emit('permission-error', contextualError);
      } else {
        // Fallback for other errors
        toast({
          variant: "destructive",
          title: "Error al eliminar",
          description: e.message || `No se pudo eliminar el catálogo '${catalogName}'.`
        });
      }
    }
  };

  const renderSkeleton = () => (
    <div className="space-y-3">
      {[...Array(2)].map((_, i) => (
        <li key={i} className="flex items-center justify-between rounded-lg border p-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-9 w-9" />
        </li>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestionar Catálogos</CardTitle>
        <CardDescription>Aquí puedes ver y eliminar los catálogos de productos que has importado.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? renderSkeleton() : uniqueCatalogs.length > 0 ? (
          <ul className="space-y-3">
            {uniqueCatalogs.map(catalog => (
              <li key={catalog.id} className="flex items-center justify-between rounded-lg border p-4">
                <span className="font-medium">{catalog.name}</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon">
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar {catalog.name}</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente el catálogo
                        <strong className="mx-1">{catalog.name}</strong>
                        y todos sus productos asociados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteCatalog(catalog.name)}>
                        Sí, eliminar catálogo
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-12 text-center">
            <List className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No hay catálogos para gestionar</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Importa un archivo CSV para crear tu primer catálogo de productos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
