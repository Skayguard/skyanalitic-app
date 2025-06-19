
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
import { Loader2, Combine } from 'lucide-react'; // Using Combine as a generic logo

const publicPaths = ['/login', '/register', '/verify-email'];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user && !publicPaths.includes(pathname)) {
      router.push('/login');
    }
    // Redirect authenticated users away from login/register
    if (!isLoading && user && (pathname === '/login' || pathname === '/register')) {
      router.push('/'); // Redirect to dashboard or main app page
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading && !publicPaths.includes(pathname)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // For public paths, render children directly without main app layout
  if (publicPaths.includes(pathname) && !isLoading) {
    return <>{children}</>;
  }

  // If still loading but it's a public path, or if not logged in and on a public path
  if (publicPaths.includes(pathname)) {
     return <>{children}</>;
  }


  // If user is not logged in and not on a public path (should be caught by useEffect, but as a fallback)
  if (!user && !isLoading) {
     return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Redirecting to login...</p>
      </div>
    );
  }


  return (
    <SidebarProvider defaultOpen>
      <Sidebar className="border-sidebar-border bg-sidebar text-sidebar-foreground">
        <SidebarHeader>
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors">
            <Combine className="h-7 w-7 text-primary" /> {/* Generic App Icon */}
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
          {/* Potentially add UserProfileButton or other header content here if needed */}
        </header>
        <main className="flex-1 flex-col p-4 sm:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
