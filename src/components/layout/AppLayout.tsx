
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

const publicPaths = ['/login', '/register', '/verify-email'];

// Simplified SVG logo based on the provided image
const SkyanalyticLogo = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="h-7 w-7 text-primary"
  >
    <path
      d="M20 40C20 34.4772 24.4772 30 30 30H70C75.5228 30 80 34.4772 80 40V42C80 47.5228 75.5228 52 70 52H30C24.4772 52 20 47.5228 20 42V40Z"
      stroke="currentColor"
      strokeWidth="5"
    />
    <path
      d="M35 30C35 24.4772 39.4772 20 45 20H55C60.5228 20 65 24.4772 65 30"
      stroke="currentColor"
      strokeWidth="5"
    />
    <path
      d="M50 52C50 52 45 60 50 70C55 80 70 75 70 75"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect
      x="55"
      y="70"
      width="30"
      height="20"
      rx="3"
      stroke="currentColor"
      strokeWidth="5"
    />
    <circle cx="78" cy="80" r="3" fill="currentColor" />
    <path
      d="M55 78H45C42.2386 78 40 75.7614 40 73V70"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
    />
  </svg>
);


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

  if (publicPaths.includes(pathname) && !isLoading) {
      return <>{children}</>;
  }
  
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
            <SkyanalyticLogo />
            <span className="font-headline">Skyanalytic</span>
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
