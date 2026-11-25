
"use client";

import { useState } from "react";
import Link from "next/link"
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useAuth, useFirestore } from "@/firebase";
import { doc, serverTimestamp } from 'firebase/firestore';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icons, Logo } from "@/components/icons"
import { useToast } from "@/hooks/use-toast";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update Firebase Auth profile
      await updateProfile(user, { displayName: username });

      // Add user to Firestore collection
      const userRef = doc(firestore, 'users', user.uid);
      
      const isAdminEmail = user.email?.toLowerCase() === 'desarrollo@dmr.com.uy';
      
      const userProfile = {
        uid: user.uid,
        email: user.email,
        displayName: username,
        roles: isAdminEmail ? ['ADMINISTRADOR'] : ['USUARIO'],
        status: 'activo',
        createdAt: serverTimestamp(),
      };
      setDocumentNonBlocking(userRef, userProfile, { merge: true });

      toast({
        title: "Cuenta Creada",
        description: "Tu cuenta ha sido creada exitosamente. Serás redirigido.",
      });
      router.push("/dashboard");

    } catch (error: any) {
      let description = "Ocurrió un error inesperado. Por favor, inténtelo de nuevo.";
      if (error.code === 'auth/email-already-in-use') {
        description = "El correo electrónico ya está en uso por otra cuenta.";
      } else if (error.code === 'auth/weak-password') {
        description = "La contraseña es demasiado débil. Debe tener al menos 6 caracteres.";
      }
       toast({
        title: "Error al crear la cuenta",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
           <Logo className="mx-auto mb-4 size-12 text-primary" />
          <CardTitle className="text-2xl text-center">Crear una Cuenta</CardTitle>
          <CardDescription className="text-center">
            Ingrese sus datos para registrarse en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Nombre de Usuario</Label>
                <Input 
                  id="username" 
                  placeholder="juan.perez" 
                  required 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                   disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                 {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Crear Cuenta
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="underline">
              Iniciar Sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

    