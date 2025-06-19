
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
import { Loader2, BarChartBig, Briefcase, Settings, LogIn, UserPlus, ChevronRight } from 'lucide-react';
import SkyAnalyticsLogo from './SkyAnalyticsLogo'; // Import the new logo
import { Button } from '@/components/ui/button';

const publicPaths = ['/login', '/register', '/verify-email'];
const appCorePaths = ['/upload', '/trail-analysis', '/settings', '/analysis']; // Example core app paths for SkyAnalytics

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // If not loading, no user, not a public path, and not the landing page, redirect to login
    if (!isLoading && !user && !publicPaths.includes(pathname) && pathname !== '/') {
      router.push('/login');
    }

    // If user is logged in and tries to access login/register, redirect them to an app page
    if (!isLoading && user && (pathname === '/login' || pathname === '/register')) {
      router.push('/upload'); // Default app page for logged-in user, e.g. UAP app's /upload
    }
  }, [user, isLoading, pathname, router]);

  // Initial loading state for non-public/non-landing pages
  if (isLoading && !publicPaths.includes(pathname) && pathname !== '/') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // If it's a public path (like /login, /register) and auth is not loading
  if (publicPaths.includes(pathname) && !isLoading) {
    // If user is already logged in and on login/register, they should have been redirected by useEffect.
    // This renders the public page (e.g. login form)
    return <>{children}</>;
  }


  // Landing Page Specific Layout (pathname === '/')
  if (pathname === '/') {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2" aria-label="SkyAnalytics Home">
              <SkyAnalyticsLogo className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold text-foreground">SkyAnalytics</span>
            </Link>
            <nav className="flex items-center gap-2 sm:gap-4">
              {user ? (
                <>
                  <Button variant="outline" asChild>
                     {/* This might point to a future SkyAnalytics dashboard */}
                    <Link href="/upload">Dashboard</Link>
                  </Button>
                  {/* Add a user profile/logout button here eventually */}
                </>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/login">Login</Link>
                  </Button>
                  <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link href="/register">Get Started</Link>
                  </Button>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main> {/* children is page.tsx */}
        <footer className="py-8 border-t bg-background">
          <div className="container mx-auto text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} SkyAnalytics. All rights reserved.
            <div className="mt-2 space-x-4">
              <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Authenticated App Layout (for paths other than '/', e.g., /upload, /settings)
  // Ensure user is authenticated for these paths (primary check already done by useEffect)
  if (!user && !isLoading) {
     // This case should ideally be handled by the useEffect redirection.
     // If it's reached, it's a fallback.
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
          {/* Optional: Breadcrumbs or dynamic page title can go here */}
        </header>
        <main className="flex-1 flex-col p-4 sm:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
