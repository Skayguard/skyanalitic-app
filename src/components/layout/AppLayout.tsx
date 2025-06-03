
'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { SidebarNav } from './SidebarNav';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Binary } from 'lucide-react';

const publicPaths = ['/login', '/register', '/verify-email'];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user && !publicPaths.includes(pathname)) {
      router.push('/login');
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading && !publicPaths.includes(pathname)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Se for uma rota pública e o usuário não estiver carregando (ou seja, já sabemos o estado), não renderiza o layout principal.
  // A própria página pública (login, register) cuidará do seu layout.
  if (publicPaths.includes(pathname) && !isLoading) {
      return <>{children}</>;
  }
  
  // Se o usuário não estiver logado e tentar acessar uma rota não pública, o useEffect acima já deve ter redirecionado.
  // Este é um fallback ou para o caso de o redirecionamento ainda não ter ocorrido.
  if (!user && !publicPaths.includes(pathname) && !isLoading) {
     return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Redirecionando para login...</p>
      </div>
    );
  }


  return (
    <SidebarProvider defaultOpen>
      <Sidebar className="border-sidebar-border">
        <SidebarHeader>
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors">
            <Binary className="h-7 w-7 text-primary" />
            <span className="font-headline">Skywatch</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <SidebarTrigger className="sm:hidden" />
          <div className="flex-1">
            {/* Can add breadcrumbs or page title here */}
          </div>
          {/* User Profile / Auth button for larger screens can be added here */}
        </header>
        <main className="flex-1 flex-col p-4 sm:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
