
import { CameraFeed } from '@/components/dashboard/CameraFeed';
import { CapturedEventsList } from '@/components/dashboard/CapturedEventsList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Wifi } from 'lucide-react';

export default function DashboardPage() {
  // Placeholder status. In a real app, this would come from a service.
  const monitoringStatus = "Active"; 
  const lastDetection = new Date().toLocaleTimeString();

  return (
    <div className="container mx-auto py-2">
      <h1 className="text-3xl font-bold mb-8 text-foreground font-headline">Skywatch Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CameraFeed />
        </div>
        
        <div className="space-y-6">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-6 w-6 text-primary" />
                System Status
              </CardTitle>
              <CardDescription>Current operational status of the system.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Monitoring:</span>
                <span className={`font-semibold ${monitoringStatus === "Active" ? "text-green-400" : "text-destructive"}`}>
                  {monitoringStatus}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Motion Detection:</span>
                <span className="font-semibold text-green-400">Enabled</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Simulated Detection:</span>
                <span className="font-semibold text-accent">{lastDetection}</span>
              </div>
               <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">AI Analysis Service:</span>
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
