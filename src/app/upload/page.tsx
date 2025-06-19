
import { FileUploadForm } from '@/components/analysis/FileUploadForm';

// Esta página agora serve como o painel principal após o login
export default function DashboardPage() {
  return (
    <div className="container mx-auto py-2">
      <h1 className="text-3xl font-bold mb-8 text-foreground font-headline">Painel de Análise SkyAnalytics</h1>
      <p className="text-muted-foreground mb-6">
        Bem-vindo ao seu painel SkyAnalytics. Aqui você pode enviar novas evidências para análise ou revisar eventos passados.
      </p>
      <FileUploadForm />
      {/* Futuramente, aqui poderiam entrar outros componentes do painel, como CameraFeed e CapturedEventsList,
          ou um resumo geral. Por enquanto, FileUploadForm é o conteúdo principal. */}
    </div>
  );
}
