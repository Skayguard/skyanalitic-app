
import { CameraFeed } from '@/components/dashboard/CameraFeed';
import { CapturedEventsList } from '@/components/dashboard/CapturedEventsList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Wifi } from 'lucide-react';

export default function DashboardPage() {
  // Placeholder status. In a real app, this would come from a service.
  const monitoringStatus = "Ativo"; 
  const lastCameraCapture = new Date().toLocaleTimeString('pt-BR'); 

  return (
    <div className="container mx-auto py-2">
      <h1 className="text-3xl font-bold mb-8 text-foreground font-headline">Painel Skyanalytic</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6"> {/* Alterado de lg:grid-cols-3 */}
        <div className="lg:col-span-3"> {/* Alterado de lg:col-span-2 */}
          <CameraFeed />
        </div>
        
        <div className="lg:col-span-2 space-y-6"> {/* Adicionado lg:col-span-2 */}
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-6 w-6 text-primary" />
                Status do Sistema
              </CardTitle>
              <CardDescription>Status operacional atual do sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Monitoramento:</span>
                <span className={`font-semibold ${monitoringStatus === "Ativo" ? "text-green-400" : "text-destructive"}`}>
                  {monitoringStatus}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Detecção de Movimento (Simulada):</span>
                <span className="font-semibold text-green-400">Habilitado</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Última Captura da Câmera:</span>
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
