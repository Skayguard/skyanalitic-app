
import { FileUploadForm } from '@/components/analysis/FileUploadForm';

export default function UploadPage() {
  return (
    <div className="container mx-auto py-2">
      <h1 className="text-3xl font-bold mb-8 text-foreground font-headline">Upload Manual de Evidência</h1>
      <FileUploadForm />
    </div>
  );
}
