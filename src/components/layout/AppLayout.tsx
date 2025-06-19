
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
import { Loader2 } from 'lucide-react';
import SkyAnalyticsLogo from './SkyAnalyticsLogo'; 
import { Button } from '@/components/ui/button';

const publicPaths = ['/login', '/register', '/verify-email'];
// const appCorePaths = ['/upload', '/trail-analysis', '/settings', '/analysis']; // Comentado, não usado ativamente

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user && !publicPaths.includes(pathname) && pathname !== '/') {
      router.push('/login');
    }

    if (!isLoading && user && (pathname === '/login' || pathname === '/register')) {
      router.push('/upload'); 
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading && !publicPaths.includes(pathname) && pathname !== '/') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (publicPaths.includes(pathname) && !isLoading) {
    return <>{children}</>;
  }

  if (pathname === '/') {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2" aria-label="SkyAnalytics Início">
              <SkyAnalyticsLogo className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold text-foreground">SkyAnalytics</span>
            </Link>
            <nav className="flex items-center gap-2 sm:gap-4">
              {user ? (
                <>
                  <Button variant="outline" asChild>
                    <Link href="/upload">Painel</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/login">Entrar</Link>
                  </Button>
                  <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link href="/register">Cadastre-se</Link>
                  </Button>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="py-8 border-t bg-background">
          <div className="container mx-auto text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} SkyAnalytics. Todos os direitos reservados.
            <div className="mt-2 space-x-4">
              <Link href="/privacy" className="hover:text-primary">Política de Privacidade</Link>
              <Link href="/terms" className="hover:text-primary">Termos de Serviço</Link>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  if (!user && !isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Redirecionando para login...</p>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar className="border-sidebar-border bg-sidebar text-sidebar-foreground">
        <SidebarHeader>
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors">
            <SkyAnalyticsLogo className="h-7 w-7 text-primary" />
            <span className="font-headline">SkyAnalytics</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <SidebarTrigger className="sm:hidden text-foreground" />
        </header>
        <main className="flex-1 flex-col p-4 sm:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
