
import { TrailAnalysisForm } from '@/components/trail-analysis/TrailAnalysisForm';

export default function TrailAnalysisPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-foreground font-headline">Object Trail Analysis</h1>
      <TrailAnalysisForm />
    </div>
  );
}
