
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Camera, Zap, Loader2, SwitchCamera, AlertTriangle, Waves, Videotape } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeUapMedia, type AnalyzeUapMediaOutput } from '@/ai/flows/analyze-uap-media';
import { useAnalyzedEvents } from '@/contexts/AnalyzedEventsContext';
import { useSettings } from '@/contexts/SettingsContext';
import { AnalysisType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function CameraFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); 
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null); 
  
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

  const autoDetectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFrameDataRef = useRef<ImageData | null>(null);
  const [isAutoDetectingActive, setIsAutoDetectingActive] = useState<boolean>(false);
  const captureCooldownRef = useRef<boolean>(false);
  const [isCaptureCooldownActive, setIsCaptureCooldownActive] = useState(false);
  const [boundingBox, setBoundingBox] = useState<BoundingBox | null>(null);
  const lastBoundingBoxTimeRef = useRef<number>(0);


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
    setBoundingBox(null); 
  }, []);
  
  const initializeCamera = useCallback(async () => {
    stopCurrentStreamAndRecorder();
    stopAutoDetectionLogic();
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

      const constraints: MediaStreamConstraints = { video: { width: { ideal: 1280 }, height: { ideal: 720 } } };
      if (videoDevices.length > 0) {
         (constraints.video as MediaTrackConstraints).facingMode = currentFacingMode;
      }
      
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn(`Falha ao obter câmera com facingMode: ${currentFacingMode}. Tentando fallback.`, err);
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } }); 
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
            setIsCameraActive(true);
            setError(null); 
            if (overlayCanvasRef.current && videoRef.current) { 
                overlayCanvasRef.current.width = videoRef.current.videoWidth;
                overlayCanvasRef.current.height = videoRef.current.videoHeight;
            }
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

  const extractFrameAndDownload = async (videoElement: HTMLVideoElement, time: number, fileName: string, canvasElement: HTMLCanvasElement) => {
    return new Promise<void>((resolve, reject) => {
      const onSeekedOrLoaded = () => {
        videoElement.removeEventListener('seeked', onSeekedOrLoaded);
        videoElement.removeEventListener('loadeddata', onSeekedOrLoaded); 

        const context = canvasElement.getContext('2d');
        if (context) {
          canvasElement.width = videoElement.videoWidth;
          canvasElement.height = videoElement.videoHeight;
          context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
          canvasElement.toBlob((blob) => {
            if (blob) { triggerDownload(blob, fileName); resolve(); }
            else { reject(new Error("Falha ao criar blob do frame.")); }
          }, 'image/png');
        } else { reject(new Error("Falha ao obter contexto do canvas para extração.")); }
      };

      videoElement.addEventListener('seeked', onSeekedOrLoaded);
      videoElement.addEventListener('loadeddata', onSeekedOrLoaded);

      if (videoElement.readyState >= videoElement.HAVE_METADATA) { 
        videoElement.currentTime = time;
        if (videoElement.currentTime === time) { 
            if(videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) { 
                onSeekedOrLoaded();
            }
        }
      } 
      videoElement.onerror = () => reject(new Error("Erro no elemento de vídeo durante extração de frame."));
    });
  };

  const generateAndDownloadArtifacts = async (videoBlob: Blob, analysisData: AnalyzeUapMediaOutput, baseFileName: string, originalCaptureTimestamp: string, eventId: string) => {
    if (!canvasRef.current) { 
      toast({ title: "Erro nos Artefatos", description: "Referência do canvas de análise não encontrada.", variant: "destructive" });
      return;
    }
    const canvasForArtifacts = canvasRef.current;
    const tempVideoEl = document.createElement('video');
    tempVideoEl.crossOrigin = "anonymous"; 
    tempVideoEl.src = URL.createObjectURL(videoBlob);
    tempVideoEl.muted = true; tempVideoEl.preload = 'metadata';

    await new Promise<void>((resolve, reject) => {
        tempVideoEl.onloadedmetadata = () => {
            tempVideoEl.play().then(() => {
                tempVideoEl.pause();
                resolve();
            }).catch(e => {
                console.warn("Play-pause para 'seekability' falhou (ignorável em alguns sistemas):", e);
                resolve(); 
            });
        };
        tempVideoEl.onerror = (e) => {
            console.error("Erro ao carregar vídeo temporário para artefatos:", e, tempVideoEl.error);
            reject(new Error(`Falha ao carregar vídeo gravado para artefatos. Código: ${tempVideoEl.error?.code}`));
        };
        tempVideoEl.load(); 
    });
    
    try {
      await extractFrameAndDownload(tempVideoEl, 0.1, `${baseFileName}_foto.png`, canvasForArtifacts);
      toast({ title: "Foto Extraída", description: "1 foto foi baixada.", duration: 3000 });
    } catch (e) {
      toast({ title: "Erro Extração Foto", description: (e as Error).message, variant: "destructive" });
    } finally { URL.revokeObjectURL(tempVideoEl.src); }
    const technicalData = `SkyAnalytics - Relatório Técnico\nID: ${eventId}\nMídia: ${baseFileName}\nTimestamp: ${new Date(originalCaptureTimestamp).toLocaleString('pt-BR', { timeZone: 'UTC' })} UTC\nResolução: ${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}\nNavegador: ${navigator.userAgent}\nCâmera: ${currentFacingMode}\n\nConf App:\n  AutoDetecção: ${settings.enableAutoMotionDetection}\n  Sensibilidade: ${settings.motionSensitivity}%\n  Brilho Mín.: ${settings.minBrightness}%\n  Tam. Obj. Mín.: ${settings.minObjectSize}\n\nAnálise IA:\n  Prob UAP: ${(analysisData.probabilityOfGenuineUapEvent * 100).toFixed(1)}%\n  Anomalia: ${analysisData.anomalyGrade}\n  Resumo: ${analysisData.summary}\n  Detalhes IA: ${analysisData.technicalDetails}\n  DB Comp: ${analysisData.databaseComparisons}`;
    const txtBlob = new Blob([technicalData.trim()], { type: 'text/plain' });
    triggerDownload(txtBlob, `${baseFileName}_dados.txt`);
    toast({ title: "Dados Técnicos Gerados", description: "Arquivo TXT baixado.", duration: 3000 });
  };

  const handleCaptureAndAnalyze = useCallback(async (triggeredBy: 'manual' | 'auto' = 'manual') => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive || !mediaRecorderRef.current || isProcessingCapture) {
      if (triggeredBy === 'manual') {
        toast({ title: "Falha na Captura", description: "Câmera/MediaRecorder não prontos ou processando.", variant: "destructive" });
      }
      return;
    }

    setIsProcessingCapture(true);
    setBoundingBox(null); 
    const video = videoRef.current; const analysisCanvas = canvasRef.current;
    analysisCanvas.width = video.videoWidth; analysisCanvas.height = video.videoHeight;
    const context = analysisCanvas.getContext('2d');
    if (!context) {
      toast({ title: "Falha na Captura", description: "Contexto do canvas de análise indisponível.", variant: "destructive" });
      setIsProcessingCapture(false); return;
    }
    context.drawImage(video, 0, 0, analysisCanvas.width, analysisCanvas.height);
    const initialFrameDataUri = analysisCanvas.toDataURL('image/jpeg');
    const captureTimestamp = new Date().toISOString();
    const eventId = captureTimestamp + Math.random().toString(36).substring(2, 9);
    const mediaName = `Captura_SkyAnalytics_${new Date(captureTimestamp).toLocaleString('pt-BR').replace(/[\/\:]/g, '-').replace(/\s/g, '_')}`;

    recordedChunksRef.current = [];
    mediaRecorderRef.current.start();
    toast({ title: "Gravação Iniciada", description: "Gravando vídeo de 5 segundos...", duration: 3000, icon: <Videotape className="h-5 w-5 text-primary"/> });

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
      if (settings.enableAutoMotionDetection) {
        captureCooldownRef.current = true;
        setIsCaptureCooldownActive(true);
        setTimeout(() => { 
            captureCooldownRef.current = false; 
            setIsCaptureCooldownActive(false);
        }, 30000); 
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
      setIsProcessingCapture(false); 
    }
  }, [isCameraActive, isProcessingCapture, mediaRecorderRef, canvasRef, videoRef, toast, addAnalyzedEvent, settings.enableAutoMotionDetection, settings.motionSensitivity, settings.minBrightness, settings.minObjectSize, currentFacingMode]);

  const processFrameForMotion = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive || isProcessingCapture || captureCooldownRef.current || isLoadingSettings || !settings.enableAutoMotionDetection) {
      if (!settings.enableAutoMotionDetection) setBoundingBox(null); 
      return;
    }

    const video = videoRef.current;
    const detectionCanvas = canvasRef.current; 
    const detectionCtx = detectionCanvas.getContext('2d', { willReadFrequently: true });
    if (!detectionCtx) return;

    const scaleFactor = 4; 
    detectionCanvas.width = video.videoWidth / scaleFactor;
    detectionCanvas.height = video.videoHeight / scaleFactor;
    detectionCtx.drawImage(video, 0, 0, detectionCanvas.width, detectionCanvas.height);
    
    const currentFrame = detectionCtx.getImageData(0, 0, detectionCanvas.width, detectionCanvas.height);
    
    let minX = detectionCanvas.width, minY = detectionCanvas.height, maxX = 0, maxY = 0;
    let changedPixels = 0;

    if (lastFrameDataRef.current) {
      const data = currentFrame.data;
      const lastData = lastFrameDataRef.current.data;
      const sensitivityThreshold = (100 - settings.motionSensitivity) / 100 * 70 + 5; 
      const brightnessThreshold = settings.minBrightness / 100 * 255;
      const pixelStep = 4; 

      for (let y = 0; y < detectionCanvas.height; y += pixelStep) {
        for (let x = 0; x < detectionCanvas.width; x += pixelStep) {
          const i = (y * detectionCanvas.width + x) * 4;
          const r = data[i]; const g = data[i+1]; const b = data[i+2];
          const currentBrightness = (r + g + b) / 3;
          
          if (currentBrightness < brightnessThreshold) continue; 

          const lr = lastData[i]; const lg = lastData[i+1]; const lb = lastData[i+2];
          const lastBrightness = (lr + lg + lb) / 3;
          
          if (Math.abs(currentBrightness - lastBrightness) > sensitivityThreshold) {
            changedPixels++;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }
      const minChangedPixelsToTrigger = Math.max(5, settings.minObjectSize * (detectionCanvas.width / 250)); 
      
      if (changedPixels > minChangedPixelsToTrigger && maxX > minX) {
        console.log(`Movimento detectado! Pixels alterados: ${changedPixels}`);
        const finalX = minX * scaleFactor;
        const finalY = minY * scaleFactor;
        const finalWidth = (maxX - minX) * scaleFactor;
        const finalHeight = (maxY - minY) * scaleFactor;
        
        setBoundingBox({ x: finalX, y: finalY, width: finalWidth, height: finalHeight });
        lastBoundingBoxTimeRef.current = Date.now();
        handleCaptureAndAnalyze('auto');
      } else {
        if (Date.now() - lastBoundingBoxTimeRef.current > 1000) {
          setBoundingBox(null);
        }
      }
    }
    lastFrameDataRef.current = currentFrame;
  }, [isCameraActive, isProcessingCapture, isLoadingSettings, settings, handleCaptureAndAnalyze]);

  useEffect(() => { 
    if (!overlayCanvasRef.current || !videoRef.current || !isCameraActive) {
        const overlayCtx = overlayCanvasRef.current?.getContext('2d');
        overlayCtx?.clearRect(0, 0, overlayCanvasRef.current?.width || 0, overlayCanvasRef.current?.height || 0);
        return;
    }

    const overlayCtx = overlayCanvasRef.current.getContext('2d');
    if (!overlayCtx) return;

    if (overlayCanvasRef.current.width !== videoRef.current.videoWidth || overlayCanvasRef.current.height !== videoRef.current.videoHeight) {
        overlayCanvasRef.current.width = videoRef.current.videoWidth;
        overlayCanvasRef.current.height = videoRef.current.videoHeight;
    }
    
    overlayCtx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);

    if (boundingBox) {
      overlayCtx.strokeStyle = 'hsl(var(--primary))'; 
      overlayCtx.lineWidth = 3;
      overlayCtx.strokeRect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
    }
  }, [boundingBox, isCameraActive]);


  const startAutoDetectionLogic = useCallback(() => {
    if (isLoadingSettings || !isCameraActive || !settings.enableAutoMotionDetection || isProcessingCapture || autoDetectionIntervalRef.current) {
      return;
    }
    
    if (!videoRef.current || !canvasRef.current) return;

    setIsAutoDetectingActive(true);
    lastFrameDataRef.current = null; 
    autoDetectionIntervalRef.current = setInterval(processFrameForMotion, 500); 
    console.log("Detecção automática de movimento iniciada.");

  }, [isLoadingSettings, isCameraActive, settings.enableAutoMotionDetection, isProcessingCapture, processFrameForMotion]);

  useEffect(() => {
    if (!isLoadingSettings && isCameraActive && settings.enableAutoMotionDetection && !isProcessingCapture) {
      startAutoDetectionLogic();
    } else {
      stopAutoDetectionLogic();
    }
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
          <canvas ref={overlayCanvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
          
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
            
            {videoDeviceCount > 1 ? (
                 <Button 
                    onClick={handleSwitchCamera} 
                    variant="outline"
                    disabled={isSwitchingCamera || isProcessingCapture || isLoadingSettings || !isCameraActive}
                    aria-label="Alternar câmera"
                    title="Alternar Câmera"
                 >
                    {isSwitchingCamera ? <Loader2 className="h-5 w-5 animate-spin" /> : <SwitchCamera className="h-5 w-5" />}
                    <span className="ml-2 hidden sm:inline">Alternar Câmera</span>
                 </Button>
            ) : <div /> }
        </div>
        
        {isProcessingCapture && (
          <div className="mt-2 text-center text-sm text-muted-foreground">
            <p>Realizando análise IA e preparando arquivos para download...</p>
            <p>Isso pode levar alguns segundos.</p>
          </div>
        )}

        {!isLoadingSettings && settings.enableAutoMotionDetection && (
          <div className={cn("mt-3 text-sm flex items-center justify-center p-2 rounded-md border", 
            isAutoDetectingActive && !isCaptureCooldownActive ? "bg-green-500/10 border-green-500/30 text-green-300" : 
            isCaptureCooldownActive ? "bg-amber-500/10 border-amber-500/30 text-amber-300" :
            "bg-muted/50 border-border text-muted-foreground"
          )}>
            <Waves className="mr-2 h-4 w-4" />
            {isAutoDetectingActive && !isCaptureCooldownActive ? 'Detecção automática ATIVA' : 
             isCaptureCooldownActive ? 'Detecção em Cooldown...' : 
             'Detecção automática INATIVA'}
          </div>
        )}
         {!isLoadingSettings && !settings.enableAutoMotionDetection && (
            <p className="mt-3 text-xs text-center text-muted-foreground">
                Para ativar a detecção automática de movimento, vá para <Link href="/settings" className="underline hover:text-primary">Configurações</Link>.
            </p>
        )}
      </CardContent>
    </Card>
  );
}
