
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
import { Loader2, Combine } from 'lucide-react';

const publicPaths = ['/login', '/register', '/verify-email'];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user && !publicPaths.includes(pathname)) {
      router.push('/login');
    }
    if (!isLoading && user && (pathname === '/login' || pathname === '/register')) {
      router.push('/');
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading && !publicPaths.includes(pathname)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (publicPaths.includes(pathname) && !isLoading) {
    return <>{children}</>;
  }

  if (publicPaths.includes(pathname)) {
     return <>{children}</>;
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
            <Combine className="h-7 w-7 text-primary" />
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
