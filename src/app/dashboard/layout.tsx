
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button';
import { LogOut, Upload, Home, Trash2, ShieldCheck, Users, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from '@/components/icons';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useEffect } from 'react';
import { useUser, useAuth, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { doc } from 'firebase/firestore';
import { SidebarCatalogs } from '@/components/sidebar-catalogs';
import { AccordionProvider } from '@/context/accordion-context';
import type { UserProfile } from '@/lib/user-profile';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const isPageLoading = isAuthLoading || isProfileLoading;
  const isAdmin = !isPageLoading && Array.isArray(userProfile?.roles) && userProfile.roles.includes('ADMINISTRADOR');

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (!firebaseUser && !isAuthLoading) {
            router.push('/login');
        }
    });

    return () => unsubscribe();
  }, [auth, isAuthLoading, router]);

  const handleLogout = async () => {
    if (auth) {
        await signOut(auth);
    }
    router.push('/login');
  };

  if (isPageLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Logo className="size-12 animate-pulse text-primary" />
                <p className="text-muted-foreground">Cargando panel...</p>
            </div>
        </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AccordionProvider>
    <SidebarProvider>
      <Sidebar>
        <SidebarContent className="flex flex-col bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] border-[hsl(var(--sidebar-border))]">
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-3">
              <Logo className="size-8 text-primary" />
              <h1 className="text-xl font-semibold">Panel de Control</h1>
            </div>
          </SidebarHeader>

          <SidebarMenu className="flex-1 px-4">
             <SidebarMenuItem>
                <Link href="/dashboard">
                    <SidebarMenuButton tooltip="Ir a Inicio" variant="ghost" className="w-full justify-start" isActive={pathname === '/dashboard'}>
                        <Home/>Inicio
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarCatalogs />
            
            {isAdmin && (
                <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-admin" className="border-none">
                  <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2"><ShieldCheck className="size-4" /><span>Administración</span></div>
                  </AccordionTrigger>
                  <AccordionContent className="pl-4 space-y-1">
                    <SidebarMenuItem>
                        <Link href="/dashboard/administracion/usuarios">
                            <SidebarMenuButton tooltip="Gestionar usuarios" variant="ghost" className="w-full justify-start" isActive={pathname === '/dashboard/administracion/usuarios'}>
                                <Users/>Usuarios
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <Link href="/dashboard/importar">
                            <SidebarMenuButton tooltip="Importar datos desde CSV" variant="ghost" className="w-full justify-start" isActive={pathname === '/dashboard/importar'}>
                                <Upload/>Importar Datos
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <Link href="/dashboard/administracion/catalogos">
                            <SidebarMenuButton tooltip="Gestionar catálogos" variant="ghost" className="w-full justify-start" isActive={pathname === '/dashboard/administracion/catalogos'}>
                                <Trash2/>Gestionar Catálogos
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </SidebarMenu>

          <SidebarFooter className="p-4">
          </SidebarFooter>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
            <SidebarTrigger className="md:hidden"/>
            <h1 className="flex-1 text-lg font-semibold md:text-xl">{decodeURIComponent(pathname.split('/').pop() || 'Panel de Control').replace(/%20/g, ' ').replace('dashboard', 'Inicio')}</h1>
            
            {user ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? ''} />
                                <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{userProfile?.displayName || user.displayName}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                            </p>
                        </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/dashboard/perfil">
                                <UserIcon className="mr-2 h-4 w-4" />
                                <span>Perfil</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Cerrar sesión</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <Skeleton className="h-10 w-10 rounded-full" />
            )}
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
        <footer className="border-t p-6">
            <div className="container text-center text-sm text-muted-foreground">
                <p>Software desarrollado por DMR - dmr.com.uy</p>
            </div>
        </footer>
      </SidebarInset>
    </SidebarProvider>
    </AccordionProvider>
  );
}
