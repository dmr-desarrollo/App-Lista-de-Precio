
'use client';

import { useState, useEffect } from 'react';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { updateProfile, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import { useSearchParams } from 'next/navigation';
import { Separator } from '@/components/ui/separator';

export default function ProfilePage() {
  const { user: currentUser, isUserLoading: isCurrentUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [isEditingSelf, setIsEditingSelf] = useState(true);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const uid = searchParams.get('uid');

  useEffect(() => {
    const fetchUserData = async () => {
      if (isCurrentUserLoading) return;

      let userToEdit, isSelf;
      if (uid && uid !== currentUser?.uid) {
        if (!firestore) return;
        // Editing another user
        const userDoc = await getDoc(doc(firestore, 'users', uid));
        if (userDoc.exists()) {
          userToEdit = userDoc.data();
          isSelf = false;
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Usuario no encontrado.' });
          setIsPageLoading(false);
          return;
        }
      } else {
        // Editing self
        userToEdit = currentUser;
        isSelf = true;
      }
      
      if (userToEdit) {
        setTargetUser(userToEdit);
        setDisplayName(userToEdit.displayName || '');
        setEmail(userToEdit.email || '');
        setIsEditingSelf(isSelf);
      }
      setIsPageLoading(false);
    };

    fetchUserData();

  }, [uid, currentUser, isCurrentUserLoading, firestore, toast]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo encontrar la información del usuario.' });
      return;
    }
    
    if (!isEditingSelf && currentUser?.role !== 'admin') {
      toast({ variant: 'destructive', title: 'Permiso denegado', description: 'No tienes permisos para editar a otros usuarios.' });
      return;
    }

    setIsLoading(true);

    try {
      const userRef = doc(firestore, 'users', targetUser.uid);
      updateDocumentNonBlocking(userRef, { displayName });

      if (isEditingSelf && auth?.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
      }

      toast({
        title: '¡Perfil Actualizado!',
        description: 'El nombre de usuario ha sido actualizado correctamente.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al actualizar',
        description: error.message || 'No se pudo actualizar el perfil.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingSelf || !auth?.currentUser) return;
    
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Error', description: 'Las nuevas contraseñas no coinciden.' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Error', description: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    setIsPasswordLoading(true);
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      
      // Re-authenticate the user to confirm their identity
      await reauthenticateWithCredential(user, credential);
      
      // If re-authentication is successful, update the password
      await updatePassword(user, newPassword);

      toast({
        title: '¡Contraseña Cambiada!',
        description: 'Tu contraseña ha sido actualizada exitosamente.',
      });
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

    } catch (error: any) {
      let description = 'Ocurrió un error inesperado.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = 'La contraseña actual es incorrecta.';
      }
      toast({
        variant: 'destructive',
        title: 'Error al cambiar la contraseña',
        description,
      });
    } finally {
      setIsPasswordLoading(false);
    }
  };
  
  if (isPageLoading) {
      return (
          <Card>
              <CardHeader>
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <Skeleton className="h-10 w-32" />
                </div>
              </CardContent>
          </Card>
      )
  }
  
  if (!targetUser) {
      return <p>No se pudo cargar el perfil del usuario.</p>;
  }


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditingSelf ? 'Mi Perfil' : `Editando a ${targetUser.displayName}`}</CardTitle>
          <CardDescription>Administra la información de la cuenta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4 md:max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nombre de Usuario</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre de usuario"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input id="email" value={email} disabled />
              <p className="text-sm text-muted-foreground">
                El correo electrónico no se puede cambiar.
              </p>
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      {isEditingSelf && (
        <Card>
            <CardHeader>
                <CardTitle>Cambiar Contraseña</CardTitle>
                <CardDescription>
                    Asegúrate de usar una contraseña segura que no estés usando en otro lugar.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4 md:max-w-lg">
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">Contraseña Actual</Label>
                        <Input
                            id="currentPassword"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            disabled={isPasswordLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">Nueva Contraseña</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            disabled={isPasswordLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={isPasswordLoading}
                        />
                    </div>
                    <Button type="submit" disabled={isPasswordLoading}>
                        {isPasswordLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                        Cambiar Contraseña
                    </Button>
                </form>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
