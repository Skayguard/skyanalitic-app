
'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Camera, VideoOff, Zap, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeUapMedia } from '@/ai/flows/analyze-uap-media';
import { useAnalyzedEvents } from '@/contexts/AnalyzedEventsContext';
import Image from 'next/image';

export function CameraFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const { addAnalyzedEvent } = useAnalyzedEvents();

  useEffect(() => {
    async function setupCamera() {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setIsCameraActive(true);
            setError(null);
          }
        } catch (err) {
          console.error("Erro ao acessar câmera:", err);
          setError("Não foi possível acessar a câmera. Verifique as permissões.");
          setIsCameraActive(false);
        }
      } else {
        setError("Acesso à câmera não suportado por este navegador.");
        setIsCameraActive(false);
      }
    }
    setupCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCaptureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) {
      toast({ title: "Falha na Captura", description: "Câmera não ativa ou pronta.", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      toast({ title: "Falha na Captura", description: "Não foi possível obter o contexto do canvas.", variant: "destructive" });
      setIsAnalyzing(false);
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const mediaDataUri = canvas.toDataURL('image/jpeg'); // Or 'image/png'

    try {
      const analysisResult = await analyzeUapMedia({ mediaDataUri });
      const newEvent = {
        id: new Date().toISOString() + Math.random().toString(36).substring(2,9),
        timestamp: new Date().toISOString(),
        thumbnailUrl: mediaDataUri, // Using captured frame as thumbnail
        mediaName: `Captura da Câmera - ${new Date().toLocaleString('pt-BR')}`,
        analysis: analysisResult,
      };
      addAnalyzedEvent(newEvent);
      toast({
        title: "Análise Concluída",
        description: `Probabilidade de UAP: ${(analysisResult.probabilityOfGenuineUapEvent * 100).toFixed(1)}%`,
      });
    } catch (err) {
      console.error("Falha na análise IA:", err);
      toast({
        title: "Falha na Análise",
        description: err instanceof Error ? err.message : "Ocorreu um erro desconhecido durante a análise IA.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-6 w-6 text-primary" />
          Feed da Câmera ao Vivo
        </CardTitle>
        <CardDescription>
          Monitoramento em tempo real. Clique em "Capturar Quadro & Analisar" para processar o quadro atual da câmera.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="aspect-video bg-muted rounded-md overflow-hidden mb-4 relative border border-border">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {!isCameraActive && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-2" />
              <p className="text-muted-foreground">Inicializando câmera...</p>
            </div>
          )}
          {error && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 p-4 text-center">
              <VideoOff className="h-12 w-12 text-destructive mb-2" />
              <p className="text-destructive-foreground">{error}</p>
            </div>
          )}
           {isCameraActive && !error && (
            <div className="absolute bottom-2 right-2 opacity-80">
               <div className="bg-destructive text-destructive-foreground px-2 py-1 text-xs rounded-full flex items-center gap-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  GRAV
                </div>
            </div>
           )}
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <Button 
          onClick={handleCaptureAndAnalyze} 
          disabled={!isCameraActive || isAnalyzing}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          aria-label="Capturar Quadro e Analisar"
        >
          {isAnalyzing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Zap className="mr-2 h-4 w-4" />
          )}
          {isAnalyzing ? 'Analisando...' : 'Capturar Quadro & Analisar'}
        </Button>
      </CardContent>
    </Card>
  );
}
