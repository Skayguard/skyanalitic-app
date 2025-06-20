
import type { Metadata } from 'next';
import './globals.css';
import { AppLayout } from '@/components/layout/AppLayout';
import { Toaster } from '@/components/ui/toaster';
import { AnalyzedEventsProvider } from '@/contexts/AnalyzedEventsContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'SkyAnalytics - Análise Avançada de UAP',
  description: 'Plataforma avançada de análise e rastreamento de UAP.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <SettingsProvider>
            <AnalyzedEventsProvider> 
              <AppLayout>{children}</AppLayout>
              <Toaster />
            </AnalyzedEventsProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
