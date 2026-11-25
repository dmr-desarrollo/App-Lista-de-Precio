
'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Upload, Package, Printer, Tags, MoreHorizontal, ArrowRight } from 'lucide-react';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/user-profile';

export default function DashboardHomePage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  const isPageLoading = isAuthLoading || isProfileLoading;
  const isAdmin = !isPageLoading && Array.isArray(userProfile?.roles) && userProfile.roles.includes('ADMINISTRADOR');

  const categoryCards = [
    {
      title: 'Accesorios',
      description: 'Explora los catálogos de accesorios.',
      icon: <Package className="h-6 w-6" />,
      href: '/dashboard/precios/accesorios'
    },
    {
      title: 'Equipos',
      description: 'Explora los catálogos de equipos.',
      icon: <Printer className="h-6 w-6" />,
      href: '/dashboard/precios/equipos'
    },
    {
      title: 'Insumos',
      description: 'Explora los catálogos de insumos.',
      icon: <Tags className="h-6 w-6" />,
      href: '/dashboard/precios/insumos'
    },
    {
      title: 'Otros',
      description: 'Explora otros catálogos.',
      icon: <MoreHorizontal className="h-6 w-6" />,
      href: '/dashboard/precios/otros'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          ¡Bienvenido, {userProfile?.displayName || user?.displayName || 'Usuario'}!
        </h1>
        <p className="text-muted-foreground">
          Aquí tienes un resumen de las acciones rápidas que puedes realizar.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {categoryCards.map((card) => (
            <Card key={card.title} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {card.icon}
                  </div>
                  <div>
                    <CardTitle>{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex items-end">
                <Button asChild className="w-full">
                    <Link href={card.href}>
                        Explorar <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
              </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
}

    
