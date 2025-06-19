
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarSeparator } from '@/components/ui/sidebar';
import { LayoutDashboard, Settings, LogIn, UserPlus, LogOut, GitCommitHorizontal, Search } from 'lucide-react'; // Adicionado Search
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '../ui/button';

const baseNavItems = [
  { href: '/', label: 'Painel Principal', icon: LayoutDashboard, requiresAuth: true }, // Alterado de /upload para /
  { href: '/trail-analysis', label: 'Análise de Rastro', icon: GitCommitHorizontal, requiresAuth: true },
  { href: '/settings', label: 'Configurações', icon: Settings, requiresAuth: true },
];

const authNavItems = [
  { href: '/login', label: 'Login', icon: LogIn, requiresAuth: false },
  { href: '/register', label: 'Registrar', icon: UserPlus, requiresAuth: false },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user, signOut, isLoading } = useAuth();

  const isActive = (href: string) => {
    if (href === '/') {
      // Para o Painel Principal, considerar ativo se for a raiz OU a página de detalhes da análise
      return pathname === '/' || pathname.startsWith('/analysis');
    }
    return pathname === href || pathname.startsWith(href);
  };

  const navItemsToDisplay = user ? baseNavItems : authNavItems;

  return (
    <>
      <SidebarMenu className="flex-1">
        {navItemsToDisplay.filter(item => user ? item.requiresAuth : !item.requiresAuth).map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.href)}
                className={cn(
                  isActive(item.href)
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
                tooltip={item.label}
              >
                <a> 
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
                disabled={isLoading}
                aria-label="Sair"
              >
                <LogOut className="mr-2 h-5 w-5" />
                <span className="font-medium">Sair</span>
              </Button>
          </SidebarFooter>
        </>
      )}
    </>
  );
}
