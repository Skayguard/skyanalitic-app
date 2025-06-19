
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarSeparator } from '@/components/ui/sidebar';
import { LayoutDashboard, UploadCloud, Settings, LogIn, UserPlus, LogOut, GitCommitHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '../ui/button';

// Navigation items for authenticated users
const baseNavItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, requiresAuth: true },
  { href: '/trail-analysis', label: 'Trail Analysis', icon: GitCommitHorizontal, requiresAuth: true },
  { href: '/settings', label: 'Settings', icon: Settings, requiresAuth: true },
];

// Navigation items for unauthenticated users (public pages)
const authNavItems = [
  { href: '/login', label: 'Login', icon: LogIn, requiresAuth: false },
  { href: '/register', label: 'Register', icon: UserPlus, requiresAuth: false },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user, signOut, isLoading } = useAuth();

  const isActive = (href: string) => {
    // Exact match for root, startsWith for others to cover sub-routes like /analysis/[id]
    if (href === '/') {
      return pathname === '/' || pathname.startsWith('/analysis'); 
    }
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  };

  const navItemsToDisplay = user ? baseNavItems : authNavItems;

  return (
    <>
      <SidebarMenu className="flex-1">
        {navItemsToDisplay.filter(item => user ? item.requiresAuth : !item.requiresAuth).map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild // Important for Link to work correctly with styled button
                isActive={isActive(item.href)} // Determine if the item is active
                className={cn(
                  isActive(item.href)
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground' // Active state styles
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground' // Default state styles
                )}
                tooltip={item.label} // Tooltip for collapsed sidebar
              >
                <a> {/* The actual anchor tag for navigation */}
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      {user && (
        <>
          <SidebarSeparator />
          <SidebarFooter className="p-2">
             <Button
                variant="ghost"
                className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={signOut}
                disabled={isLoading} // Disable button while auth state is loading
                aria-label="Sign out"
              >
                <LogOut className="mr-2 h-5 w-5" />
                <span className="font-medium">Sign Out</span>
              </Button>
          </SidebarFooter>
        </>
      )}
    </>
  );
}
