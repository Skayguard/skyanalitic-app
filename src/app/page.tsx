
import { FileUploadForm } from '@/components/analysis/FileUploadForm';
import { CameraFeed } from '@/components/dashboard/CameraFeed';
import { CapturedEventsList } from '@/components/dashboard/CapturedEventsList';

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 md:p-6">
      <div className="lg:col-span-2 space-y-8">
        <CameraFeed />
        <FileUploadForm />
      </div>
      <div className="lg:col-span-1">
        <CapturedEventsList />
      </div>
    </div>
  );
}
