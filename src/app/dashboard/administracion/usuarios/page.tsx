

'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, doc, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, Edit, Shield, ToggleLeft, ToggleRight, Loader2, User, Mail, ShieldCheck, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { UserProfile, UserRole } from '@/lib/user-profile';

type UserStatus = 'activo' | 'inactivo';


const roleLabels: Record<UserRole | string, string> = {
    ADMINISTRADOR: 'Admin',
    VENDEDOR_DMR: 'Vendedor DMR',
    USUARIO: 'Usuario',
    CLIENTE_FINAL: 'Cliente Final',
    CF: 'Cliente Final',
    REVENDEDOR: 'Revendedor',
    RV: 'Revendedor',
    DISTRIBUIDOR: 'Distribuidor',
    DT: 'Distribuidor',
};

const statusLabels: Record<UserStatus, string> = {
    activo: 'Activo',
    inactivo: 'Inactivo'
};

export default function UsersAdminPage() {
  const firestore = useFirestore();
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const isPageLoading = isAuthLoading || isProfileLoading;
  const isAdmin = !isPageLoading && Array.isArray(userProfile?.roles) && userProfile.roles.includes('ADMINISTRADOR');

  const usersCollectionRef = useMemoFirebase(() => {
    if (!firestore || !isAdmin) return null;
    return query(collection(firestore, 'users'));
  }, [firestore, isAdmin]);

  const { data: users, isLoading: isCollectionLoading, error } = useCollection<UserProfile>(usersCollectionRef);

  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  
  const handleRoleToggle = (userToUpdate: UserProfile, roleToToggle: UserRole) => {
    if (!firestore || !authUser) return;

    if (userToUpdate.uid === authUser.uid) {
        toast({
            variant: "destructive",
            title: "Acción no permitida",
            description: "No puedes cambiar tus propios roles.",
        });
        return;
    }

    const currentRoles = new Set(userToUpdate.roles || []);

    if (currentRoles.has(roleToToggle)) {
      currentRoles.delete(roleToToggle);
    } else {
      currentRoles.add(roleToToggle);
    }

    let updatedRoles = Array.from(currentRoles);

    if (updatedRoles.length === 0) {
      updatedRoles = ['USUARIO'];
    }

    const userRef = doc(firestore, 'users', userToUpdate.uid);
    updateDocumentNonBlocking(userRef, { roles: updatedRoles });

    toast({
      title: "Roles actualizados",
      description: `Se han actualizado los roles para ${userToUpdate.displayName}.`,
    });
  };

  const handleUpdateUserStatus = (uid: string, status: UserStatus) => {
    if (!firestore || !uid) return;

    if (authUser?.uid === uid) {
        toast({
            variant: 'destructive',
            title: 'Acción no permitida',
            description: 'No puedes desactivar tu propia cuenta.',
        });
        return;
    }
    
    const userRef = doc(firestore, 'users', uid);
    updateDocumentNonBlocking(userRef, { status });
    
    toast({
      title: 'Usuario actualizado',
      description: `El estado del usuario ha sido cambiado a ${statusLabels[status]}.`,
    });
  };

  const handleDeleteUser = () => {
    if (!firestore || !userToDelete) return;

    if (authUser?.uid === userToDelete.uid) {
        toast({
            variant: 'destructive',
            title: 'Acción no permitida',
            description: 'No puedes eliminar tu propia cuenta.',
        });
        setUserToDelete(null);
        return;
    }

    const userRef = doc(firestore, 'users', userToDelete.uid);
    deleteDocumentNonBlocking(userRef);
    toast({
        title: 'Usuario Eliminado',
        description: `El usuario ${userToDelete.displayName} ha sido eliminado permanentemente.`,
    });
    setUserToDelete(null);
  };
  
  const getUniqueRoleLabels = (roles: UserRole[] | undefined): string[] => {
    if (!roles || roles.length === 0) {
      return [roleLabels['USUARIO']];
    }
    // Step 1: Create a Set from the original roles to remove direct duplicates (e.g., ['DT', 'DT'])
    const uniqueRoles = new Set(roles);

    // Step 2: Map the unique roles to their display labels.
    const translatedLabels = Array.from(uniqueRoles).map(role => roleLabels[role] || role);

    // Step 3: Create a Set from the translated labels to handle duplicates from translation (e.g., 'DISTRIBUIDOR' and 'DT' both become 'Distribuidor')
    const uniqueLabels = new Set(translatedLabels);

    // Step 4: Convert the Set back to an array to be rendered.
    return Array.from(uniqueLabels);
  };


  const renderLoading = (count = 3) => (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-32" />
                   <Skeleton className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderLoadingTable = (rows = 3) => (
    <TableBody>
      {[...Array(rows)].map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
          <TableCell><Skeleton className="h-5 w-48" /></TableCell>
          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-8 w-8" /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  );

  if (isPageLoading) {
      return (
          <Card>
              <CardHeader>
                  <CardTitle>Gestión de Usuarios</CardTitle>
                  <CardDescription>
                    Verificando permisos y cargando usuarios...
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="rounded-md border hidden md:block">
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Nombre</TableHead>
                                  <TableHead>Email</TableHead>
                                  <TableHead>Roles</TableHead>
                                  <TableHead>Estado</TableHead>
                                  <TableHead><span className="sr-only">Acciones</span></TableHead>
                              </TableRow>
                          </TableHeader>
                          {renderLoadingTable()}
                      </Table>
                  </div>
                  <div className="md:hidden">
                    {renderLoading()}
                  </div>
              </CardContent>
          </Card>
      )
  }

  if (!isAdmin) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Acceso Denegado</CardTitle>
                <CardDescription>
                    No tienes permisos para administrar usuarios.
                </CardDescription>
            </CardHeader>
        </Card>
    )
  }


  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Usuarios</CardTitle>
        <CardDescription>
          Aquí puedes ver y administrar los roles, estados y acciones de los usuarios.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Vista de Tabla para Escritorio */}
        <div className="rounded-md border hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead><span className="sr-only">Acciones</span></TableHead>
              </TableRow>
            </TableHeader>
            {isCollectionLoading ? (
              renderLoadingTable(users?.length || 3)
            ) : (
              <TableBody>
                {users && users.length > 0 ? (
                  users.map((user) => {
                    const uniqueRoles = getUniqueRoleLabels(user.roles);
                    return (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">{user.displayName || 'Sin nombre'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                           {uniqueRoles.map(label => (
                            <Badge key={label} variant={label === 'Admin' ? 'destructive' : 'secondary'}>
                              {label}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={(user.status || 'activo') === 'activo' ? 'default' : 'outline'}>
                            {statusLabels[user.status as UserStatus || 'activo']}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0" disabled={authUser?.uid === user.uid}>
                                    <span className="sr-only">Abrir menú</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/perfil?uid=${user.uid}`)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Editar Perfil</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        <Shield className="mr-2 h-4 w-4" />
                                        <span>Cambiar Roles</span>
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        {Object.keys(roleLabels).filter(roleKey => !['CF', 'RV', 'DT'].includes(roleKey)).map(roleKey => {
                                            const role = roleKey as UserRole;
                                            const isChecked = (user.roles || []).includes(role);

                                            return (
                                                <DropdownMenuCheckboxItem
                                                    key={role}
                                                    checked={isChecked}
                                                    onSelect={(e) => {
                                                        e.preventDefault(); 
                                                        handleRoleToggle(user, role);
                                                    }}
                                                >
                                                    {roleLabels[role]}
                                                </DropdownMenuCheckboxItem>
                                            );
                                        })}
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        {(user.status || 'activo') === 'activo' ? <ToggleLeft className="mr-2 h-4 w-4" /> : <ToggleRight className="mr-2 h-4 w-4" />}
                                        <span>Cambiar Estado</span>
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        <DropdownMenuItem onClick={() => handleUpdateUserStatus(user.uid, 'activo')}>Activo</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleUpdateUserStatus(user.uid, 'inactivo')}>Inactivo</DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => setUserToDelete(user)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Eliminar</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                   )})
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No se encontraron usuarios.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            )}
          </Table>
        </div>
        
        {/* Vista de Tarjetas para Móvil */}
        <div className="grid gap-4 md:hidden">
            {isCollectionLoading ? renderLoading(users?.length || 3) : (
                users && users.length > 0 ? (
                    users.map(user => {
                        const userStatus = user.status || 'activo';
                        const uniqueRoles = getUniqueRoleLabels(user.roles);
                        return (
                            <Card key={user.uid}>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 space-y-1 pr-4">
                                           <p className="font-bold text-lg">{user.displayName || 'Sin nombre'}</p>
                                           <p className="text-sm text-muted-foreground">{user.email}</p>
                                        </div>
                                         <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0" disabled={authUser?.uid === user.uid}>
                                                    <span className="sr-only">Abrir menú</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => router.push(`/dashboard/perfil?uid=${user.uid}`)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    <span>Editar Perfil</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>
                                                        <Shield className="mr-2 h-4 w-4" />
                                                        <span>Cambiar Roles</span>
                                                    </DropdownMenuSubTrigger>
                                                     <DropdownMenuSubContent>
                                                        {Object.keys(roleLabels).filter(roleKey => !['CF', 'RV', 'DT'].includes(roleKey)).map(roleKey => {
                                                            const role = roleKey as UserRole;
                                                            const isChecked = (user.roles || []).includes(role);

                                                            return (
                                                                <DropdownMenuCheckboxItem
                                                                    key={role}
                                                                    checked={isChecked}
                                                                    onSelect={(e) => {
                                                                        e.preventDefault(); 
                                                                        handleRoleToggle(user, role);
                                                                    }}
                                                                >
                                                                    {roleLabels[role]}
                                                                </DropdownMenuCheckboxItem>
                                                            );
                                                        })}
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuSub>
                                                <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>
                                                        {userStatus === 'activo' ? <ToggleLeft className="mr-2 h-4 w-4" /> : <ToggleRight className="mr-2 h-4 w-4" />}
                                                        <span>Cambiar Estado</span>
                                                    </DropdownMenuSubTrigger>
                                                    <DropdownMenuSubContent>
                                                        <DropdownMenuItem onClick={() => handleUpdateUserStatus(user.uid, 'activo')}>Activo</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleUpdateUserStatus(user.uid, 'inactivo')}>Inactivo</DropdownMenuItem>
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuSub>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive" onClick={() => setUserToDelete(user)}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>Eliminar</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <div className="mt-4 flex flex-col items-start gap-2 text-sm">
                                        <div className="flex items-center gap-1">
                                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                                            <div className="flex flex-wrap gap-1">
                                            {uniqueRoles.map(label => (
                                                <Badge key={label} variant={label === 'Admin' ? 'destructive' : 'secondary'}>
                                                   {label}
                                                </Badge>
                                            ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Activity className="h-4 w-4 text-muted-foreground" />
                                            <Badge variant={userStatus === 'activo' ? 'default' : 'outline'}>{statusLabels[userStatus]}</Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })
                ) : (
                    <div className="col-span-full h-24 text-center flex items-center justify-center">
                        No se encontraron usuarios.
                    </div>
                )
            )}
        </div>
         {error && <p className="text-red-500 mt-4">Error: {error.message}</p>}
      </CardContent>
    </Card>
    
    <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás absolutely seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario
                    <strong className="mx-1">{userToDelete?.displayName}</strong>
                    y todos sus datos.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">
                    Sí, eliminar usuario
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
