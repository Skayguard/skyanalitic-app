
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch'; // Importar Switch
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

  const handleSliderChange = (field: keyof Omit<AppSettings, 'enableSimulatedAutoCapture'>) => (value: number[]) => {
    setLocalSettings(prev => ({ ...prev, [field]: value[0] }));
  };

  const handleSwitchChange = (field: keyof Pick<AppSettings, 'enableSimulatedAutoCapture'>) => (checked: boolean) => {
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
      <Card className="w-full max-w-lg mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-primary" />
            Configurações de Detecção
          </CardTitle>
          <CardDescription>Ajuste os parâmetros para captura e análise de mídia.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Carregando configurações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" />
          Configurações de Detecção
        </CardTitle>
        <CardDescription>
          Ajuste os parâmetros para captura e análise de mídia.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <div className="flex items-center justify-between space-x-2 mb-2">
              <Label htmlFor="simulated-auto-capture" className="text-base font-medium flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Ativar Captura Automática (Simulada)
              </Label>
              <Switch
                id="simulated-auto-capture"
                checked={localSettings.enableSimulatedAutoCapture}
                onCheckedChange={handleSwitchChange('enableSimulatedAutoCapture')}
                aria-label="Ativar Captura Automática Simulada"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Quando ativo, um botão para simular detecção aparecerá no feed da câmera. A detecção de movimento real ainda não está implementada.
            </p>
          </div>

          <div className="border-t border-border pt-6">
             <p className="text-sm text-muted-foreground mb-4">Os controles abaixo são para uma futura implementação de detecção de movimento real e atualmente não afetam a simulação.</p>
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor="motion-sensitivity" className="text-base font-medium">Sensibilidade ao Movimento</Label>
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
              <p className="text-xs text-muted-foreground mt-1">Valores mais altos significam maior sensibilidade ao movimento.</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="min-brightness" className="text-base font-medium">Brilho Mínimo para Captura</Label>
              <span className="text-sm font-semibold text-accent">{localSettings.minBrightness}%</span>
            </div>
            <Slider
              id="min-brightness"
              min={0}
              max={100}
              step={1}
              value={[localSettings.minBrightness]}
              onValueChange={handleSliderChange('minBrightness')}
              aria-label="Brilho Mínimo"
              className="[&>span:first-child>span]:bg-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">Objetos mais brilhantes que este limite podem acionar a captura.</p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="min-object-size" className="text-base font-medium">Tamanho Mínimo de Objeto Detectado</Label>
              <span className="text-sm font-semibold text-accent">{localSettings.minObjectSize} (unidades)</span>
            </div>
            <Slider
              id="min-object-size"
              min={1}
              max={100} 
              step={1}
              value={[localSettings.minObjectSize]}
              onValueChange={handleSliderChange('minObjectSize')}
              aria-label="Tamanho Mínimo do Objeto"
              className="[&>span:first-child>span]:bg-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">Define o menor tamanho de um objeto a ser considerado significativo.</p>
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
