
'use client'; // Adicionar 'use client' para usar hooks

import React from 'react'; // Importar React
import { CameraFeed } from '@/components/dashboard/CameraFeed';
import { CapturedEventsList } from '@/components/dashboard/CapturedEventsList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Wifi, Loader2, Zap } from 'lucide-react'; // Adicionar Loader2 e Zap
import { useSettings } from '@/contexts/SettingsContext'; // Importar useSettings

export default function DashboardPage() {
  const { settings, isLoading: isLoadingSettings } = useSettings();
  const lastCameraCapture = new Date().toLocaleTimeString('pt-BR'); 

  // Atualizar status com base nas configurações
  const monitoringStatus = isLoadingSettings ? "Carregando..." : (settings.enableSimulatedAutoCapture ? "Ativo (Simulado)" : "Inativo");
  const simulatedDetectionStatus = isLoadingSettings ? "Carregando..." : (settings.enableSimulatedAutoCapture ? "Habilitado" : "Desabilitado");

  return (
    <div className="container mx-auto py-2">
      <h1 className="text-3xl font-bold mb-8 text-foreground font-headline">Painel Skyanalytic</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <CameraFeed />
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-6 w-6 text-primary" />
                Status do Sistema
              </CardTitle>
              <CardDescription>Status operacional atual do sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingSettings ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                  <span className="text-muted-foreground">Carregando status...</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Monitoramento (Automático):</span>
                    <span className={`font-semibold ${settings.enableSimulatedAutoCapture ? "text-green-400" : "text-muted-foreground"}`}>
                      {monitoringStatus}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Detecção de Movimento (Simulada):</span>
                    <span className={`font-semibold ${settings.enableSimulatedAutoCapture ? "text-green-400" : "text-muted-foreground"}`}>
                      {simulatedDetectionStatus}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Última Captura (Manual):</span>
                <span className="font-semibold text-accent">{lastCameraCapture}</span>
              </div>
               <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Serviço de Análise IA:</span>
                <span className="font-semibold text-green-400">Online</span>
              </div>
            </CardContent>
          </Card>

          <CapturedEventsList />
        </div>
      </div>
    </div>
  );
}
