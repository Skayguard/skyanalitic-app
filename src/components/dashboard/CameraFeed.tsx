
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Camera, VideoOff, Zap, Loader2, SwitchCamera, AlertTriangle, Waves } from 'lucide-react'; // Adicionado Waves
import { useToast } from '@/hooks/use-toast';
import { analyzeUapMedia, type AnalyzeUapMediaOutput } from '@/ai/flows/analyze-uap-media';
import { useAnalyzedEvents } from '@/contexts/AnalyzedEventsContext';
import { useSettings } from '@/contexts/SettingsContext';
import { AnalysisType } from '@/lib/types';

export function CameraFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingCapture, setIsProcessingCapture] = useState(false);
  const { toast } = useToast();
  const { addAnalyzedEvent } = useAnalyzedEvents();
  const { settings, isLoading: isLoadingSettings } = useSettings(); // Adicionado isLoadingSettings

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const analysisResultForArtifacts = useRef<AnalyzeUapMediaOutput | null>(null);


  const [currentFacingMode, setCurrentFacingMode] = useState<'environment' | 'user'>('environment');
  const [videoDeviceCount, setVideoDeviceCount] = useState(0);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);


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


  const initializeCamera = useCallback(async () => {
    stopCurrentStreamAndRecorder();
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
        console.log("Tentando obter stream com constraints:", JSON.stringify(constraints));
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn(`Falha ao obter câmera com facingMode: ${currentFacingMode}. Tentando default sem facingMode. Erro:`, err);
        stream = await navigator.mediaDevices.getUserMedia({ video: true }); 
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
            setIsCameraActive(true);
            setError(null); 
        };
        
        const mimeTypes = [
          'video/webm; codecs=vp9',
          'video/webm; codecs=vp8',
          'video/webm',
          'video/mp4',
        ];
        let chosenMimeType: string | undefined;
        for (const mimeType of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mimeType)) {
            chosenMimeType = mimeType;
            break;
          }
        }

        if (chosenMimeType) {
          mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: chosenMimeType });
          console.log("MediaRecorder usando:", chosenMimeType);
          mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordedChunksRef.current.push(event.data);
            }
          };
        } else {
          console.error("Nenhum formato de gravação de vídeo suportado.");
          toast({ title: "Gravação de Vídeo", description: "Formato de vídeo para gravação não suportado.", variant: "destructive" });
          mediaRecorderRef.current = null;
        }
      }
    } catch (err) {
      console.error("Erro detalhado ao acessar câmera:", err);
      let errorMessage = "Não foi possível acessar a câmera. Verifique as permissões.";
      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            errorMessage = "Permissão para câmera negada. Por favor, habilite nas configurações do navegador.";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            errorMessage = `Nenhuma câmera encontrada para o modo '${currentFacingMode}'. Tente alternar.`;
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError" || err.name === "OverconstrainedError") {
            errorMessage = "A câmera está em uso ou não suporta as configurações solicitadas (ex: modo específico).";
             if (err.name === "OverconstrainedError" && (err as any).constraint === "facingMode") {
                errorMessage = `Modo de câmera '${currentFacingMode}' não disponível ou com erro. Tentando fallback.`;
             }
        } else {
            errorMessage = `Erro ao acessar câmera: ${err.message}`;
        }
      }
      setError(errorMessage);
      setIsCameraActive(false); 
    } finally {
        setIsSwitchingCamera(false);
    }
  }, [currentFacingMode, toast, stopCurrentStreamAndRecorder]);

  useEffect(() => {
    initializeCamera();
    return () => {
      stopCurrentStreamAndRecorder();
    };
  }, [initializeCamera]); 


  const handleSwitchCamera = () => {
    if (videoDeviceCount < 2 && !isSwitchingCamera) { 
      toast({ title: "Troca de Câmera", description: "Nenhuma outra câmera disponível.", variant: "default" });
      return;
    }
    if (isSwitchingCamera) return; 

    console.log("Alternando câmera...");
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
      
      if (videoElement.readyState >= 2) { 
        videoElement.currentTime = time;
      } else {
        videoElement.oncanplay = () => { 
          videoElement.currentTime = time;
          videoElement.oncanplay = null; 
        }
      }
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
    const tempVideoEl = document.createElement('video');
    tempVideoEl.src = URL.createObjectURL(videoBlob);
    tempVideoEl.muted = true; 
    tempVideoEl.preload = 'auto'; 

    await new Promise<void>((resolve, reject) => {
      tempVideoEl.onloadedmetadata = () => {
        tempVideoEl.play().then(() => { 
          tempVideoEl.pause();
          resolve();
        }).catch(reject);
      };
      tempVideoEl.onerror = () => reject(new Error("Falha ao carregar metadados do vídeo gravado."));
      tempVideoEl.load(); 
    });
  
    try {
      await extractFrameAndDownload(tempVideoEl, 0.1, `${baseFileName}_foto.png`, canvas); 
      toast({ title: "Foto Extraída", description: "1 foto foi baixada do vídeo.", duration: 3000 });
    } catch (e) {
      console.error("Erro ao extrair frame:", e);
      toast({ title: "Erro na Extração de Foto", description: (e as Error).message, variant: "destructive" });
    } finally {
      URL.revokeObjectURL(tempVideoEl.src); 
    }
  
    const technicalData = `
Skyanalytic - Relatório Técnico de Captura
-------------------------------------------------
ID do Evento: ${eventId}
Nome da Mídia: ${baseFileName}
Timestamp da Captura Original: ${new Date(originalCaptureTimestamp).toLocaleString('pt-BR', { timeZone: 'UTC' })} UTC
Resolução da Captura: ${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}
Navegador (User Agent): ${navigator.userAgent}
Câmera Usada: ${currentFacingMode}

Configurações da Aplicação no Momento da Captura:
  Captura Automática Simulada: ${settings.enableSimulatedAutoCapture ? 'Ativada' : 'Desativada'}
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
    if (!videoRef.current || !canvasRef.current || !isCameraActive || !mediaRecorderRef.current) {
      toast({ title: "Falha na Captura", description: "Câmera não ativa, MediaRecorder não pronto ou canvas não encontrado.", variant: "destructive" });
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
    const eventId = captureTimestamp + Math.random().toString(36).substring(2, 9);
    const mediaName = `Captura_Skyanalytic_${new Date(captureTimestamp).toLocaleString('pt-BR').replace(/[\/\:]/g, '-').replace(/\s/g, '_')}`;

    recordedChunksRef.current = [];
    mediaRecorderRef.current.start();
    toast({ title: "Gravação Iniciada", description: "Gravando vídeo de 5 segundos...", duration: 3000 });

    mediaRecorderRef.current.onstop = async () => {
      toast({ title: "Gravação Concluída", description: "Processando vídeo gravado...", duration: 2000 });
      const videoBlob = new Blob(recordedChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'video/webm' });
      
      if (videoBlob.size > 0) {
         triggerDownload(videoBlob, `${mediaName}_video_5s.mp4`);
      } else {
         toast({ title: "Gravação Falhou", description: "Nenhum dado de vídeo foi gravado.", variant: "destructive"});
      }

      if (analysisResultForArtifacts.current) {
        await generateAndDownloadArtifacts(videoBlob, analysisResultForArtifacts.current, mediaName, captureTimestamp, eventId);
      } else {
        toast({ title: "Geração de Artefatos", description: "Análise IA não concluída ou falhou, foto e TXT podem não ter todos os dados.", variant: "default" });
      }
      setIsProcessingCapture(false); 
      analysisResultForArtifacts.current = null; 
    };


    setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop(); 
      }
    }, 5000);

    analysisResultForArtifacts.current = null; // Reset before new analysis

    try {
      const result = await analyzeUapMedia({ mediaDataUri: initialFrameDataUri });
      analysisResultForArtifacts.current = result; 
      const newEvent = {
        id: eventId,
        timestamp: captureTimestamp,
        thumbnailUrl: initialFrameDataUri,
        mediaName: mediaName,
        analysis: result,
        analysisType: AnalysisType.UAP,
      };
      addAnalyzedEvent(newEvent); 
      toast({
        title: "Análise IA Concluída",
        description: `Probabilidade de UAP: ${(result.probabilityOfGenuineUapEvent * 100).toFixed(1)}%`,
      });
    } catch (err) {
      console.error("Falha na análise IA:", err);
      analysisResultForArtifacts.current = null;
      toast({
        title: "Falha na Análise IA",
        description: err instanceof Error ? err.message : "Ocorreu um erro desconhecido.",
        variant: "destructive",
      });
    }
  };

  const handleSimulateMotion = () => {
    if (isLoadingSettings || !settings.enableSimulatedAutoCapture || !isCameraActive || isProcessingCapture) {
      if (isLoadingSettings) {
         toast({ title: "Aguarde", description: "Carregando configurações...", variant: "default"});
      } else if (!settings.enableSimulatedAutoCapture) {
         toast({ title: "Simulação Desativada", description: "Ative a captura automática simulada nas configurações.", variant: "default"});
      } else if (!isCameraActive) {
         toast({ title: "Câmera Inativa", description: "A câmera precisa estar ativa para simular detecção.", variant: "destructive"});
      }
      return;
    }
    toast({ title: "Simulação Acionada", description: "Detecção de movimento simulada. Iniciando captura e análise...", duration: 2000});
    handleCaptureAndAnalyze();
  };


  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-6 w-6 text-primary" />
          Feed da Câmera ao Vivo
        </CardTitle>
        <CardDescription>
          Monitoramento em tempo real. Clique abaixo para capturar ou simular detecção.
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
              onClick={handleCaptureAndAnalyze}
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
            
            <Button
              onClick={handleSimulateMotion}
              disabled={isLoadingSettings || !settings.enableSimulatedAutoCapture || !isCameraActive || isProcessingCapture || isSwitchingCamera}
              variant={settings.enableSimulatedAutoCapture ? "default" : "outline"}
              className={settings.enableSimulatedAutoCapture ? "bg-accent hover:bg-accent/90 text-accent-foreground" : ""}
              aria-label="Simular Detecção de Movimento e Capturar"
            >
              {isProcessingCapture && settings.enableSimulatedAutoCapture ? (
                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                 <Waves className="mr-2 h-4 w-4" />
              )}
              {isProcessingCapture && settings.enableSimulatedAutoCapture ? 'Processando...' : 'Simular Detecção'}
            </Button>

        </div>
        <div className="flex justify-end mt-2">
             {videoDeviceCount > 1 && (
                 <Button 
                    onClick={handleSwitchCamera} 
                    variant="outline"
                    size="icon"
                    disabled={isSwitchingCamera || isProcessingCapture || isLoadingSettings}
                    aria-label="Alternar câmera"
                    title="Alternar Câmera"
                 >
                    {isSwitchingCamera ? <Loader2 className="h-5 w-5 animate-spin" /> : <SwitchCamera className="h-5 w-5" />}
                 </Button>
            )}
        </div>
        {isProcessingCapture && (
          <div className="mt-2 text-center text-sm text-muted-foreground">
            <p>Realizando análise IA e preparando arquivos para download...</p>
            <p>Isso pode levar alguns segundos.</p>
          </div>
        )}
         {!isLoadingSettings && !settings.enableSimulatedAutoCapture && (
            <p className="mt-3 text-xs text-center text-muted-foreground">
                Para ativar a simulação de captura automática, vá para <a href="/settings" className="underline hover:text-primary">Configurações</a>.
            </p>
        )}
      </CardContent>
    </Card>
  );
}
