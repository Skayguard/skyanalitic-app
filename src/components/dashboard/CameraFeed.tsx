
'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Camera, VideoOff, Zap, Loader2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeUapMedia, type AnalyzeUapMediaOutput } from '@/ai/flows/analyze-uap-media';
import { useAnalyzedEvents } from '@/contexts/AnalyzedEventsContext';
import { useSettings } from '@/contexts/SettingsContext'; // Import useSettings

export function CameraFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingCapture, setIsProcessingCapture] = useState(false);
  const { toast } = useToast();
  const { addAnalyzedEvent } = useAnalyzedEvents();
  const { settings } = useSettings(); // Get settings

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    async function setupCamera() {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setIsCameraActive(true);
            setError(null);

            // Setup MediaRecorder
            const options = { mimeType: 'video/webm; codecs=vp9' }; // vp9 for better quality/compression if available
            try {
               mediaRecorderRef.current = new MediaRecorder(stream, options);
            } catch (e1) {
              console.warn("VP9 codec for webm not supported, trying vp8");
              try {
                const options2 = { mimeType: 'video/webm; codecs=vp8' };
                mediaRecorderRef.current = new MediaRecorder(stream, options2);
              } catch (e2) {
                 console.warn("VP8 codec for webm not supported, trying default");
                 try {
                    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
                 } catch (e3) {
                    console.error("WebM not supported, video recording might fail or have issues.", e3);
                    toast({title: "Gravação de Vídeo", description: "Formato WebM não suportado, gravação pode falhar.", variant: "destructive"});
                    mediaRecorderRef.current = null; // Explicitly nullify if no suitable recorder found
                 }
              }
            }
            

            if (mediaRecorderRef.current) {
              mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                  recordedChunksRef.current.push(event.data);
                }
              };
            }

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
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [toast]);

  const extractFrameAndDownload = (videoElement: HTMLVideoElement, time: number, fileName: string, canvas: HTMLCanvasElement) => {
    return new Promise<void>((resolve, reject) => {
      const onSeeked = () => {
        videoElement.removeEventListener('seeked', onSeeked);
        const context = canvas.getContext('2d');
        if (context) {
          canvas.width = videoElement.videoWidth;
          canvas.height = videoElement.videoHeight;
          context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              triggerDownload(blob, fileName);
              resolve();
            } else {
              reject(new Error("Falha ao criar blob da imagem do canvas."));
            }
          }, 'image/png');
        } else {
          reject(new Error("Falha ao obter contexto 2D do canvas."));
        }
      };
      videoElement.addEventListener('seeked', onSeeked);
      videoElement.currentTime = time;
    });
  };
  
  const generateAndDownloadArtifacts = async (
    videoBlob: Blob,
    analysisData: AnalyzeUapMediaOutput,
    baseFileName: string,
    originalCaptureTimestamp: string,
    eventId: string
  ) => {
    if (!canvasRef.current) {
      toast({ title: "Erro nos Artefatos", description: "Referência do canvas não encontrada.", variant: "destructive" });
      return;
    }
    const canvas = canvasRef.current;
  
    // 1. Download 2 PNGs from video
    const tempVideoEl = document.createElement('video');
    tempVideoEl.src = URL.createObjectURL(videoBlob);
    tempVideoEl.muted = true;
  
    await new Promise<void>((resolve, reject) => {
      tempVideoEl.onloadedmetadata = () => resolve();
      tempVideoEl.onerror = () => reject(new Error("Falha ao carregar metadados do vídeo gravado."));
      tempVideoEl.load(); // Start loading the video
    });
  
    try {
      await tempVideoEl.play(); // Play to ensure frames can be captured
      await extractFrameAndDownload(tempVideoEl, 1, `${baseFileName}_foto_1s.png`, canvas); // Frame at 1s
      await extractFrameAndDownload(tempVideoEl, 5, `${baseFileName}_foto_5s.png`, canvas); // Frame at 5s
      tempVideoEl.pause();
      toast({ title: "Fotos Extraídas", description: "2 fotos foram baixadas do vídeo.", duration: 3000 });
    } catch (e) {
      console.error("Erro ao extrair frames:", e);
      toast({ title: "Erro na Extração de Fotos", description: (e as Error).message, variant: "destructive" });
    } finally {
      URL.revokeObjectURL(tempVideoEl.src); // Clean up object URL
    }
  
    // 2. Generate and download TXT file
    const technicalData = `
Skyguard Analytic - Relatório Técnico de Captura
-------------------------------------------------
ID do Evento: ${eventId}
Nome da Mídia: ${baseFileName}
Timestamp da Captura Original: ${new Date(originalCaptureTimestamp).toLocaleString('pt-BR', { timeZone: 'UTC' })} UTC
Resolução da Captura: ${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}
Navegador (User Agent): ${navigator.userAgent}

Configurações da Aplicação no Momento da Captura:
  Sensibilidade ao Movimento: ${settings.motionSensitivity}%
  Brilho Mínimo para Captura: ${settings.minBrightness}%
  Tamanho Mínimo de Objeto: ${settings.minObjectSize} unidades

Resultado da Análise IA:
-------------------------
Probabilidade de UAP Genuíno: ${(analysisData.probabilityOfGenuineUapEvent * 100).toFixed(1)}%
Grau de Anomalia: ${analysisData.anomalyGrade}
Resumo da Análise: ${analysisData.summary}
Detalhes Técnicos da Mídia (IA): ${analysisData.technicalDetails}
Comparações com Banco de Dados (IA): ${analysisData.databaseComparisons}
`;
    const txtBlob = new Blob([technicalData.trim()], { type: 'text/plain' });
    triggerDownload(txtBlob, `${baseFileName}_dados_tecnicos.txt`);
    toast({ title: "Dados Técnicos Gerados", description: "Arquivo TXT com detalhes foi baixado.", duration: 3000 });
  };


  const handleCaptureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) {
      toast({ title: "Falha na Captura", description: "Câmera não ativa ou pronta.", variant: "destructive" });
      return;
    }

    setIsProcessingCapture(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    if (!context) {
      toast({ title: "Falha na Captura", description: "Não foi possível obter o contexto do canvas.", variant: "destructive" });
      setIsProcessingCapture(false);
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const initialFrameDataUri = canvas.toDataURL('image/jpeg');
    const captureTimestamp = new Date().toISOString();
    const eventId = captureTimestamp + Math.random().toString(36).substring(2,9);
    const mediaName = `Captura_Skyguard_${new Date(captureTimestamp).toLocaleString('pt-BR').replace(/[\/:]/g, '-').replace(/\s/g, '_')}`;


    // Start 10-second video recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "inactive") {
      recordedChunksRef.current = []; // Clear previous chunks
      mediaRecorderRef.current.start();
      toast({ title: "Gravação Iniciada", description: "Gravando vídeo de 10 segundos...", duration: 3000 });

      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, 10000); // Stop recording after 10 seconds
    } else {
      toast({ title: "Gravação de Vídeo", description: "Gravador de mídia não está pronto ou já está gravando.", variant: "destructive" });
    }

    // AI Analysis (happens in parallel with recording being finalized)
    let analysisResult: AnalyzeUapMediaOutput | null = null;
    try {
      analysisResult = await analyzeUapMedia({ mediaDataUri: initialFrameDataUri });
      const newEvent = {
        id: eventId,
        timestamp: captureTimestamp,
        thumbnailUrl: initialFrameDataUri,
        mediaName: mediaName,
        analysis: analysisResult,
      };
      addAnalyzedEvent(newEvent);
      toast({
        title: "Análise IA Concluída",
        description: `Probabilidade de UAP: ${(analysisResult.probabilityOfGenuineUapEvent * 100).toFixed(1)}%`,
      });
    } catch (err) {
      console.error("Falha na análise IA:", err);
      toast({
        title: "Falha na Análise IA",
        description: err instanceof Error ? err.message : "Ocorreu um erro desconhecido durante a análise IA.",
        variant: "destructive",
      });
      // Even if AI fails, we might still have the video if recording was started.
      // The onstop handler will proceed, but analysisResult will be null.
    }

    // The rest of artifact generation (video download, frame extraction, TXT)
    // will be handled by the onstop event of the MediaRecorder.
    if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = async () => {
          toast({ title: "Gravação Concluída", description: "Processando vídeo gravado...", duration: 2000 });
          const videoBlob = new Blob(recordedChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'video/webm' });
          triggerDownload(videoBlob, `${mediaName}_video_10s.mp4`); // Changed to mp4 for better compatibility, though it's webm
    
          if (analysisResult) { // Only generate artifacts if AI analysis was successful and we have data
            await generateAndDownloadArtifacts(videoBlob, analysisResult, mediaName, captureTimestamp, eventId);
          } else {
            toast({ title: "Geração de Artefatos Ignorada", description: "Análise IA falhou, não foi possível gerar fotos e TXT detalhado.", variant: "default" });
          }
          setIsProcessingCapture(false); // End processing here
        };
    } else {
        // If media recorder was never set up, we can't record. End processing.
        setIsProcessingCapture(false);
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
          Monitoramento em tempo real. Clique abaixo para capturar um quadro para análise IA,
          gravar um vídeo de 10s, extrair 2 fotos e gerar um relatório técnico (todos para download).
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
          disabled={!isCameraActive || isProcessingCapture}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          aria-label="Capturar Quadro, Gravar Vídeo e Analisar"
        >
          {isProcessingCapture ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Zap className="mr-2 h-4 w-4" />
          )}
          {isProcessingCapture ? 'Processando Captura...' : 'Capturar, Gravar & Analisar'}
        </Button>
        {isProcessingCapture && (
            <div className="mt-2 text-center text-sm text-muted-foreground">
                <p>Realizando análise IA e preparando arquivos para download (vídeo, fotos, TXT)...</p>
                <p>Isso pode levar alguns segundos.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}

    