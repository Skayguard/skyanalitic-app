
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Camera, VideoOff, Zap, Loader2, SwitchCamera, AlertTriangle, Waves } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeUapMedia, type AnalyzeUapMediaOutput } from '@/ai/flows/analyze-uap-media';
import { useAnalyzedEvents } from '@/contexts/AnalyzedEventsContext';
import { useSettings } from '@/contexts/SettingsContext';
import { AnalysisType } from '@/lib/types';
import { cn } from '@/lib/utils';

export function CameraFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingCapture, setIsProcessingCapture] = useState(false);
  const { toast } = useToast();
  const { addAnalyzedEvent } = useAnalyzedEvents();
  const { settings, isLoading: isLoadingSettings } = useSettings();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const analysisResultForArtifacts = useRef<AnalyzeUapMediaOutput | null>(null);

  const [currentFacingMode, setCurrentFacingMode] = useState<'environment' | 'user'>('environment');
  const [videoDeviceCount, setVideoDeviceCount] = useState(0);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  // Motion Detection State
  const autoDetectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFrameDataRef = useRef<ImageData | null>(null);
  const [isAutoDetectingActive, setIsAutoDetectingActive] = useState<boolean>(false);
  const captureCooldownRef = useRef<boolean>(false);
  const [isCaptureCooldownActive, setIsCaptureCooldownActive] = useState(false); // For UI updates

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

  const stopCurrentStreamAndRecorder = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    recordedChunksRef.current = [];
    setIsCameraActive(false);
  }, []);

  const stopAutoDetectionLogic = useCallback(() => {
    if (autoDetectionIntervalRef.current) {
      clearInterval(autoDetectionIntervalRef.current);
      autoDetectionIntervalRef.current = null;
    }
    setIsAutoDetectingActive(false);
    lastFrameDataRef.current = null;
  }, []);
  
  const initializeCamera = useCallback(async () => {
    stopCurrentStreamAndRecorder();
    stopAutoDetectionLogic(); // Stop detection when re-initializing camera
    setError(null);
    setIsSwitchingCamera(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Acesso à câmera não suportado por este navegador.");
      setVideoDeviceCount(0);
      setIsSwitchingCamera(false);
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setVideoDeviceCount(videoDevices.length);

      if (videoDevices.length === 0) {
        setError("Nenhuma câmera encontrada.");
        setIsSwitchingCamera(false);
        return;
      }

      const constraints: MediaStreamConstraints = { video: {} };
      if (videoDevices.length > 0) {
         (constraints.video as MediaTrackConstraints).facingMode = currentFacingMode;
      }
      
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true }); 
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
            setIsCameraActive(true);
            setError(null); 
        };
        
        const mimeTypes = ['video/webm; codecs=vp9', 'video/webm; codecs=vp8', 'video/webm', 'video/mp4'];
        let chosenMimeType: string | undefined;
        for (const mimeType of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mimeType)) {
            chosenMimeType = mimeType;
            break;
          }
        }

        if (chosenMimeType) {
          mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: chosenMimeType });
          mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) recordedChunksRef.current.push(event.data);
          };
        } else {
          toast({ title: "Gravação de Vídeo", description: "Formato de vídeo para gravação não suportado.", variant: "destructive" });
          mediaRecorderRef.current = null;
        }
      }
    } catch (err) {
      let errorMessage = "Não foi possível acessar a câmera. Verifique as permissões.";
      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") errorMessage = "Permissão para câmera negada.";
        else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") errorMessage = `Nenhuma câmera encontrada para o modo '${currentFacingMode}'.`;
        else if (err.name === "NotReadableError" || err.name === "TrackStartError" || err.name === "OverconstrainedError") errorMessage = "Câmera em uso ou não suporta configurações.";
        else errorMessage = `Erro ao acessar câmera: ${err.message}`;
      }
      setError(errorMessage);
      setIsCameraActive(false); 
    } finally {
        setIsSwitchingCamera(false);
    }
  }, [currentFacingMode, toast, stopCurrentStreamAndRecorder, stopAutoDetectionLogic]);

  useEffect(() => {
    initializeCamera();
    return () => {
      stopCurrentStreamAndRecorder();
      stopAutoDetectionLogic();
    };
  }, [initializeCamera]); 

  const handleSwitchCamera = () => {
    if (videoDeviceCount < 2 && !isSwitchingCamera) { 
      toast({ title: "Troca de Câmera", description: "Nenhuma outra câmera disponível." });
      return;
    }
    if (isSwitchingCamera) return; 
    setCurrentFacingMode(prevMode => prevMode === 'environment' ? 'user' : 'environment');
  };

  const extractFrameAndDownload = async (videoElement: HTMLVideoElement, time: number, fileName: string, canvas: HTMLCanvasElement) => {
    return new Promise<void>((resolve, reject) => {
      const onSeeked = () => {
        videoElement.removeEventListener('seeked', onSeeked);
        const context = canvas.getContext('2d');
        if (context) {
          canvas.width = videoElement.videoWidth;
          canvas.height = videoElement.videoHeight;
          context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) { triggerDownload(blob, fileName); resolve(); }
            else { reject(new Error("Falha ao criar blob.")); }
          }, 'image/png');
        } else { reject(new Error("Falha ao obter contexto.")); }
      };
      videoElement.addEventListener('seeked', onSeeked);
      if (videoElement.readyState >= 2) videoElement.currentTime = time;
      else { videoElement.oncanplay = () => { videoElement.currentTime = time; videoElement.oncanplay = null; }}
    });
  };

  const generateAndDownloadArtifacts = async (videoBlob: Blob, analysisData: AnalyzeUapMediaOutput, baseFileName: string, originalCaptureTimestamp: string, eventId: string) => {
    if (!canvasRef.current) {
      toast({ title: "Erro nos Artefatos", description: "Referência do canvas não encontrada.", variant: "destructive" });
      return;
    }
    const canvas = canvasRef.current;
    const tempVideoEl = document.createElement('video');
    tempVideoEl.src = URL.createObjectURL(videoBlob);
    tempVideoEl.muted = true; tempVideoEl.preload = 'auto';
    await new Promise<void>((resolve, reject) => {
      tempVideoEl.onloadedmetadata = () => { tempVideoEl.play().then(() => { tempVideoEl.pause(); resolve(); }).catch(reject); };
      tempVideoEl.onerror = () => reject(new Error("Falha ao carregar vídeo gravado.")); tempVideoEl.load();
    });
    try {
      await extractFrameAndDownload(tempVideoEl, 0.1, `${baseFileName}_foto.png`, canvas);
      toast({ title: "Foto Extraída", description: "1 foto foi baixada.", duration: 3000 });
    } catch (e) {
      toast({ title: "Erro Extração Foto", description: (e as Error).message, variant: "destructive" });
    } finally { URL.revokeObjectURL(tempVideoEl.src); }
    const technicalData = `Skyanalytic - Relatório Técnico\nID: ${eventId}\nMídia: ${baseFileName}\nTimestamp: ${new Date(originalCaptureTimestamp).toLocaleString('pt-BR', { timeZone: 'UTC' })} UTC\nResolução: ${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}\nNavegador: ${navigator.userAgent}\nCâmera: ${currentFacingMode}\n\nConf App:\n  AutoDetecção: ${settings.enableAutoMotionDetection}\n  Sensibilidade: ${settings.motionSensitivity}%\n  Brilho Mín.: ${settings.minBrightness}%\n  Tam. Obj. Mín.: ${settings.minObjectSize}\n\nAnálise IA:\n  Prob UAP: ${(analysisData.probabilityOfGenuineUapEvent * 100).toFixed(1)}%\n  Anomalia: ${analysisData.anomalyGrade}\n  Resumo: ${analysisData.summary}\n  Detalhes IA: ${analysisData.technicalDetails}\n  DB Comp: ${analysisData.databaseComparisons}`;
    const txtBlob = new Blob([technicalData.trim()], { type: 'text/plain' });
    triggerDownload(txtBlob, `${baseFileName}_dados.txt`);
    toast({ title: "Dados Técnicos Gerados", description: "Arquivo TXT baixado.", duration: 3000 });
  };

  const handleCaptureAndAnalyze = useCallback(async (triggeredBy: 'manual' | 'auto' = 'manual') => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive || !mediaRecorderRef.current || isProcessingCapture) {
      if (triggeredBy === 'manual') { // Only toast for manual triggers if prerequisites fail
        toast({ title: "Falha na Captura", description: "Câmera/MediaRecorder não prontos ou processando.", variant: "destructive" });
      }
      return;
    }

    setIsProcessingCapture(true);
    const video = videoRef.current; const canvas = canvasRef.current;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      toast({ title: "Falha na Captura", description: "Contexto do canvas indisponível.", variant: "destructive" });
      setIsProcessingCapture(false); return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const initialFrameDataUri = canvas.toDataURL('image/jpeg');
    const captureTimestamp = new Date().toISOString();
    const eventId = captureTimestamp + Math.random().toString(36).substring(2, 9);
    const mediaName = `Captura_Skyanalytic_${new Date(captureTimestamp).toLocaleString('pt-BR').replace(/[\/\:]/g, '-').replace(/\s/g, '_')}`;

    recordedChunksRef.current = [];
    mediaRecorderRef.current.start();
    toast({ title: "Gravação Iniciada", description: "Gravando vídeo de 5 segundos...", duration: 3000 });

    mediaRecorderRef.current.onstop = async () => {
      toast({ title: "Gravação Concluída", description: "Processando vídeo...", duration: 2000 });
      const videoBlob = new Blob(recordedChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'video/webm' });
      if (videoBlob.size > 0) triggerDownload(videoBlob, `${mediaName}_video_5s.mp4`);
      else toast({ title: "Gravação Falhou", description: "Nenhum dado de vídeo gravado.", variant: "destructive"});
      if (analysisResultForArtifacts.current) {
        await generateAndDownloadArtifacts(videoBlob, analysisResultForArtifacts.current, mediaName, captureTimestamp, eventId);
      } else {
        toast({ title: "Geração de Artefatos", description: "Análise IA incompleta, artefatos podem faltar dados.", variant: "default" });
      }
      setIsProcessingCapture(false);
      analysisResultForArtifacts.current = null;
      if (settings.enableAutoMotionDetection) { // Set cooldown after auto-capture
        captureCooldownRef.current = true;
        setIsCaptureCooldownActive(true);
        setTimeout(() => { 
            captureCooldownRef.current = false; 
            setIsCaptureCooldownActive(false);
        }, 30000); // 30s cooldown
      }
    };

    setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") mediaRecorderRef.current.stop();
    }, 5000);

    analysisResultForArtifacts.current = null;
    try {
      const result = await analyzeUapMedia({ mediaDataUri: initialFrameDataUri });
      analysisResultForArtifacts.current = result;
      addAnalyzedEvent({ id: eventId, timestamp: captureTimestamp, thumbnailUrl: initialFrameDataUri, mediaName: mediaName, analysis: result, analysisType: AnalysisType.UAP });
      toast({ title: "Análise IA Concluída", description: `Probabilidade UAP: ${(result.probabilityOfGenuineUapEvent * 100).toFixed(1)}%` });
    } catch (err) {
      analysisResultForArtifacts.current = null;
      toast({ title: "Falha Análise IA", description: err instanceof Error ? err.message : "Erro desconhecido.", variant: "destructive" });
      setIsProcessingCapture(false); // Ensure processing flag is reset on error too
    }
  }, [isCameraActive, isProcessingCapture, mediaRecorderRef, canvasRef, videoRef, toast, addAnalyzedEvent, settings.enableAutoMotionDetection]);

  const processFrameForMotion = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive || isProcessingCapture || captureCooldownRef.current || isLoadingSettings || !settings.enableAutoMotionDetection) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth / 4; // Process smaller image for performance
    canvas.height = video.videoHeight / 4;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const currentFrame = context.getImageData(0, 0, canvas.width, canvas.height);
    
    if (lastFrameDataRef.current) {
      let changedPixels = 0;
      const data = currentFrame.data;
      const lastData = lastFrameDataRef.current.data;
      const sensitivityThreshold = (100 - settings.motionSensitivity) / 100 * 50; // Smaller value = more sensitive
      const brightnessThreshold = settings.minBrightness / 100 * 255;
      const pixelStep = 5; // Analyze every 5th pixel

      for (let y = 0; y < canvas.height; y += pixelStep) {
        for (let x = 0; x < canvas.width; x += pixelStep) {
          const i = (y * canvas.width + x) * 4;
          const currentBrightness = (data[i] + data[i+1] + data[i+2]) / 3;
          
          if (currentBrightness < brightnessThreshold) continue; // Ignore dark pixels

          const lastBrightness = (lastData[i] + lastData[i+1] + lastData[i+2]) / 3;
          if (Math.abs(currentBrightness - lastBrightness) > sensitivityThreshold) {
            changedPixels++;
          }
        }
      }
      // Very rough proxy for minObjectSize. Higher minObjectSize = needs more changed pixels.
      const minChangedPixelsToTrigger = settings.minObjectSize * 2; 
      if (changedPixels > minChangedPixelsToTrigger) {
        console.log(`Movimento detectado! Pixels alterados: ${changedPixels}`);
        handleCaptureAndAnalyze('auto');
      }
    }
    lastFrameDataRef.current = currentFrame;
  }, [isCameraActive, isProcessingCapture, isLoadingSettings, settings, handleCaptureAndAnalyze]);

  const startAutoDetectionLogic = useCallback(() => {
    if (isLoadingSettings || !isCameraActive || !settings.enableAutoMotionDetection || isProcessingCapture || autoDetectionIntervalRef.current) {
      return;
    }
    
    if (!videoRef.current || !canvasRef.current) return;

    setIsAutoDetectingActive(true);
    lastFrameDataRef.current = null; // Reset last frame
    autoDetectionIntervalRef.current = setInterval(processFrameForMotion, 1000); // Process 1 frame per second
    console.log("Detecção automática iniciada.");

  }, [isLoadingSettings, isCameraActive, settings.enableAutoMotionDetection, isProcessingCapture, processFrameForMotion]);

  useEffect(() => {
    if (!isLoadingSettings && isCameraActive && settings.enableAutoMotionDetection && !isProcessingCapture) {
      startAutoDetectionLogic();
    } else {
      stopAutoDetectionLogic();
    }
    // Cleanup interval on unmount or when dependencies change causing detection to stop
    return () => {
      stopAutoDetectionLogic();
    };
  }, [isLoadingSettings, isCameraActive, settings.enableAutoMotionDetection, isProcessingCapture, startAutoDetectionLogic, stopAutoDetectionLogic]);


  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-6 w-6 text-primary" />
          Feed da Câmera ao Vivo
        </CardTitle>
        <CardDescription>
          Monitoramento em tempo real. A detecção automática pode ser ativada nas configurações.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="aspect-video bg-muted rounded-md overflow-hidden mb-4 relative border border-border">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {isSwitchingCamera && !error && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-2" />
                <p className="text-muted-foreground">Alternando câmera...</p>
            </div>
          )}
          {!isCameraActive && !error && !isSwitchingCamera && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-2" />
              <p className="text-muted-foreground">Inicializando câmera...</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 p-4 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mb-2" />
              <p className="text-destructive-foreground font-medium">Erro na Câmera</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              {videoDeviceCount > 1 && (
                <Button onClick={handleSwitchCamera} variant="outline" size="sm" className="mt-3">
                    <SwitchCamera className="mr-2 h-4 w-4" /> Tentar Outra Câmera
                </Button>
              )}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              onClick={() => handleCaptureAndAnalyze('manual')}
              disabled={!isCameraActive || isProcessingCapture || isSwitchingCamera || isLoadingSettings}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              aria-label="Capturar Quadro, Gravar Vídeo e Analisar Manualmente"
            >
              {isProcessingCapture ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              {isProcessingCapture ? 'Processando...' : 'Capturar Manual'}
            </Button>
            
            {videoDeviceCount > 1 && (
                 <Button 
                    onClick={handleSwitchCamera} 
                    variant="outline"
                    disabled={isSwitchingCamera || isProcessingCapture || isLoadingSettings}
                    aria-label="Alternar câmera"
                    title="Alternar Câmera"
                    className="w-full"
                 >
                    {isSwitchingCamera ? <Loader2 className="h-5 w-5 animate-spin" /> : <SwitchCamera className="h-5 w-5" />}
                    Alternar Câmera
                 </Button>
            )}
        </div>
        
        {isProcessingCapture && (
          <div className="mt-2 text-center text-sm text-muted-foreground">
            <p>Realizando análise IA e preparando arquivos para download...</p>
            <p>Isso pode levar alguns segundos.</p>
          </div>
        )}

        {!isLoadingSettings && settings.enableAutoMotionDetection && (
          <div className={cn("mt-3 text-sm flex items-center justify-center p-2 rounded-md border", 
            isAutoDetectingActive ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-muted/50 border-border text-muted-foreground"
          )}>
            <Waves className="mr-2 h-4 w-4" />
            {isAutoDetectingActive ? 'Detecção automática ATIVA' : 'Detecção automática INATIVA'}
            {isCaptureCooldownActive && <span className="ml-2 text-xs">(Resfriando...)</span>}
          </div>
        )}
         {!isLoadingSettings && !settings.enableAutoMotionDetection && (
            <p className="mt-3 text-xs text-center text-muted-foreground">
                Para ativar a detecção automática de movimento, vá para <a href="/settings" className="underline hover:text-primary">Configurações</a>.
            </p>
        )}
      </CardContent>
    </Card>
  );
}
