
import { SensitivityControlsForm } from '@/components/settings/SensitivityControlsForm';

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-foreground font-headline">Configurações da Aplicação</h1>
      <SensitivityControlsForm />
    </div>
  );
}
