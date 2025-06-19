
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarSeparator } from '@/components/ui/sidebar';
import { LayoutDashboard, UploadCloud, Settings, LogIn, UserPlus, LogOut, GitCommitHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '../ui/button';

const baseNavItems = [
  { href: '/upload', label: 'Dashboard IA', icon: LayoutDashboard, requiresAuth: true }, // Renomeado para Dashboard IA e rota principal
  { href: '/upload', label: 'Enviar Evidência', icon: UploadCloud, requiresAuth: true },
  { href: '/trail-analysis', label: 'Análise de Rastro', icon: GitCommitHorizontal, requiresAuth: true },
  { href: '/settings', label: 'Configurações', icon: Settings, requiresAuth: true },
];

const authNavItems = [
  { href: '/login', label: 'Entrar', icon: LogIn, requiresAuth: false },
  { href: '/register', label: 'Registrar', icon: UserPlus, requiresAuth: false },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user, signOut, isLoading } = useAuth();

  const isActive = (href: string) => {
    // Tratar o link '/upload' como ativo se for a página inicial do painel (ou se for a própria página /upload)
    if (href === '/upload') {
      return pathname === '/' || pathname === '/upload' || pathname.startsWith('/analysis');
    }
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  };

  const navItemsToDisplay = user ? baseNavItems : authNavItems;

  return (
    <>
      <SidebarMenu className="flex-1">
        {navItemsToDisplay.filter(item => user ? item.requiresAuth : !item.requiresAuth).map((item) => {
           // Se o item é 'Dashboard IA', o href real será '/upload' ou '/' dependendo se já estamos lá.
           // No entanto, para a lógica de navegação, o link é sempre para '/upload' (ou o que for o painel principal).
           // A lógica `isActive` cuidará de destacar corretamente.
           // A landing page '/' é gerenciada pelo AppLayout para ter um header diferente.
           // No contexto do sidebar, um link para "Painel" geralmente leva para a tela principal *após* o login.
           const effectiveHref = item.label === 'Dashboard IA' ? '/upload' : item.href;

          return (
            <SidebarMenuItem key={item.href}>
              <Link href={effectiveHref} passHref legacyBehavior>
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
          );
        })}
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
                aria-label="Sair da conta"
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
