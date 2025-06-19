
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
  
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

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
      title: "Configurações Salvas",
      description: "Suas preferências foram atualizadas.",
    });
  };

  if (isLoadingSettings) {
    return (
      <Card className="w-full max-w-lg mx-auto shadow-xl border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <SettingsIcon className="h-6 w-6 text-primary" />
            Configurações de Detecção
          </CardTitle>
          <CardDescription>Ajuste parâmetros para captura e análise de mídia.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Carregando configurações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground">
          <SettingsIcon className="h-6 w-6 text-primary" />
          Configurações de Detecção
        </CardTitle>
        <CardDescription>
          Ajuste parâmetros para captura e análise de mídia.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <div className="flex items-center justify-between space-x-2 mb-2">
              <Label htmlFor="auto-motion-detection" className="text-base font-medium flex items-center gap-2 text-foreground">
                <Zap className="h-5 w-5 text-primary" />
                Ativar Detecção Automática de Movimento
              </Label>
              <Switch
                id="auto-motion-detection"
                checked={localSettings.enableAutoMotionDetection}
                onCheckedChange={handleSwitchChange('enableAutoMotionDetection')}
                aria-label="Ativar Detecção Automática de Movimento"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Quando ativo, o sistema tentará detectar movimento no feed da câmera e acionar capturas automaticamente.
            </p>
          </div>

          <div className="border-t border-border pt-6">
             <p className="text-sm text-muted-foreground mb-4">Os controles abaixo influenciarão a detecção automática de movimento. Ajuste-os para resultados ótimos.</p>
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor="motion-sensitivity" className="text-base font-medium text-foreground">Sensibilidade ao Movimento</Label>
                <span className="text-sm font-semibold text-accent">{localSettings.motionSensitivity}%</span>
              </div>
              <Slider
                id="motion-sensitivity"
                min={0} 
                max={100}
                step={1}
                value={[localSettings.motionSensitivity]}
                onValueChange={handleSliderChange('motionSensitivity')}
                aria-label="Sensibilidade ao Movimento"
                className="[&>span:first-child>span]:bg-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">Valores mais altos significam maior sensibilidade (detecta movimentos menores).</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="min-brightness" className="text-base font-medium text-foreground">Brilho Mínimo do Pixel</Label>
              <span className="text-sm font-semibold text-accent">{localSettings.minBrightness}%</span>
            </div>
            <Slider
              id="min-brightness"
              min={0}
              max={100}
              step={1}
              value={[localSettings.minBrightness]}
              onValueChange={handleSliderChange('minBrightness')}
              aria-label="Brilho Mínimo do Pixel"
              className="[&>span:first-child>span]:bg-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">Pixels mais escuros que este limiar serão ignorados na detecção de movimento.</p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="min-object-size" className="text-base font-medium text-foreground">"Tamanho" Mínimo do Movimento</Label>
              <span className="text-sm font-semibold text-accent">{localSettings.minObjectSize} (pontos)</span>
            </div>
            <Slider
              id="min-object-size"
              min={1}
              max={100}
              step={1}
              value={[localSettings.minObjectSize]}
              onValueChange={handleSliderChange('minObjectSize')}
              aria-label="Tamanho Mínimo do Objeto para Detecção"
              className="[&>span:first-child>span]:bg-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">Um valor abstrato; representa a quantidade de pixels alterados para acionar uma detecção.</p>
          </div>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            <Save className="mr-2 h-4 w-4" />
            Salvar Configurações
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
