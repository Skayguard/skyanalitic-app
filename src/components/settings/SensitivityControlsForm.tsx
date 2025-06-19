
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Save, Settings as SettingsIcon, Loader2, Zap } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import type { AppSettings } from '@/lib/types';

export function SensitivityControlsForm() {
  const { settings, updateSettings, isLoading: isLoadingSettings } = useSettings();
  const { toast } = useToast();
  
  // Local state to manage form changes before saving
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  // Update local state when global settings change (e.g., on initial load)
  useEffect(() => {
    if (!isLoadingSettings) {
      setLocalSettings(settings);
    }
  }, [settings, isLoadingSettings]);

  const handleSliderChange = (field: keyof Omit<AppSettings, 'enableAutoMotionDetection'>) => (value: number[]) => {
    setLocalSettings(prev => ({ ...prev, [field]: value[0] }));
  };

  const handleSwitchChange = (field: keyof Pick<AppSettings, 'enableAutoMotionDetection'>) => (checked: boolean) => {
    setLocalSettings(prev => ({ ...prev, [field]: checked }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateSettings(localSettings);
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
  };

  if (isLoadingSettings) {
    return (
      <Card className="w-full max-w-lg mx-auto shadow-xl border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <SettingsIcon className="h-6 w-6 text-primary" />
            Detection Settings
          </CardTitle>
          <CardDescription>Adjust parameters for media capture and analysis.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground">
          <SettingsIcon className="h-6 w-6 text-primary" />
          Detection Settings
        </CardTitle>
        <CardDescription>
          Adjust parameters for media capture and analysis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Enable Auto Motion Detection Switch */}
          <div>
            <div className="flex items-center justify-between space-x-2 mb-2">
              <Label htmlFor="auto-motion-detection" className="text-base font-medium flex items-center gap-2 text-foreground">
                <Zap className="h-5 w-5 text-primary" />
                Enable Automatic Motion Detection
              </Label>
              <Switch
                id="auto-motion-detection"
                checked={localSettings.enableAutoMotionDetection}
                onCheckedChange={handleSwitchChange('enableAutoMotionDetection')}
                aria-label="Enable Automatic Motion Detection"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              When active, the system will attempt to detect motion in the camera feed and trigger captures automatically.
            </p>
          </div>

          {/* Motion Sensitivity Slider */}
          <div className="border-t border-border pt-6">
             <p className="text-sm text-muted-foreground mb-4">The controls below will influence automatic motion detection. Fine-tune them for optimal results.</p>
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor="motion-sensitivity" className="text-base font-medium text-foreground">Motion Sensitivity</Label>
                <span className="text-sm font-semibold text-accent">{localSettings.motionSensitivity}%</span>
              </div>
              <Slider
                id="motion-sensitivity"
                min={0} // More sensitive (detects smaller changes)
                max={100} // Less sensitive
                step={1}
                value={[localSettings.motionSensitivity]}
                onValueChange={handleSliderChange('motionSensitivity')}
                aria-label="Motion Sensitivity"
                className="[&>span:first-child>span]:bg-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">Higher values mean greater sensitivity (detects smaller movements).</p>
            </div>
          </div>

          {/* Minimum Brightness Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="min-brightness" className="text-base font-medium text-foreground">Minimum Pixel Brightness</Label>
              <span className="text-sm font-semibold text-accent">{localSettings.minBrightness}%</span>
            </div>
            <Slider
              id="min-brightness"
              min={0}
              max={100}
              step={1}
              value={[localSettings.minBrightness]}
              onValueChange={handleSliderChange('minBrightness')}
              aria-label="Minimum Pixel Brightness"
              className="[&>span:first-child>span]:bg-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">Pixels darker than this threshold will be ignored in motion detection.</p>
          </div>

          {/* Minimum Object Size Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="min-object-size" className="text-base font-medium text-foreground">Minimum Motion "Size"</Label>
              <span className="text-sm font-semibold text-accent">{localSettings.minObjectSize} (points)</span>
            </div>
            <Slider
              id="min-object-size"
              min={1} // Smaller "object"
              max={100} // Larger "object"
              step={1}
              value={[localSettings.minObjectSize]}
              onValueChange={handleSliderChange('minObjectSize')}
              aria-label="Minimum Object Size for Detection"
              className="[&>span:first-child>span]:bg-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">An abstract value; represents amount of changed pixels to trigger a detection.</p>
          </div>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
