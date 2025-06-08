
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Camera, VideoOff, Zap, Loader2, Download, SwitchCamera, AlertTriangle } from 'lucide-react';
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
  const { settings } = useSettings();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

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
      // Remove o handler onstop antes de parar para evitar acionar lógica de download indesejada
      mediaRecorderRef.current.onstop = null; 
      mediaRecorderRef.current.stop();
    }
    recordedChunksRef.current = [];
    setIsCameraActive(false);
  }, []);


  const initializeCamera = useCallback(async () => {
    stopCurrentStreamAndRecorder();
    setError(null);
    setIsSwitchingCamera(true); // Indica que estamos no processo de (re)inicializar

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
      if (videoDevices.length > 0) { // Tentar usar facingMode se houver câmeras
         (constraints.video as MediaTrackConstraints).facingMode = currentFacingMode;
      }
      
      let stream: MediaStream;
      try {
        console.log("Tentando obter stream com constraints:", JSON.stringify(constraints));
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn(`Falha ao obter câmera com facingMode: ${currentFacingMode}. Tentando default sem facingMode. Erro:`, err);
        stream = await navigator.mediaDevices.getUserMedia({ video: true }); // Fallback
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
            setIsCameraActive(true);
            setError(null); // Limpa erro se a conexão for bem-sucedida
        };
        // Setup MediaRecorder
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
          // O onstop será definido dinamicamente em handleCaptureAndAnalyze
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
        // Tenta dar mensagens mais específicas
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
      setIsCameraActive(false); // Garante que a câmera seja marcada como inativa em caso de erro
    } finally {
        setIsSwitchingCamera(false);
    }
  }, [currentFacingMode, toast, stopCurrentStreamAndRecorder]);

  useEffect(() => {
    initializeCamera();
    // A limpeza principal é feita por stopCurrentStreamAndRecorder, chamada no início de initializeCamera
    // ou quando o componente é desmontado.
    return () => {
      stopCurrentStreamAndRecorder();
    };
  }, [initializeCamera]); // initializeCamera já inclui currentFacingMode e stopCurrentStreamAndRecorder como dependências indiretas ou diretas.


  const handleSwitchCamera = () => {
    if (videoDeviceCount < 2 && !isSwitchingCamera) { // Adicionado !isSwitchingCamera para evitar cliques múltiplos
      toast({ title: "Troca de Câmera", description: "Nenhuma outra câmera disponível.", variant: "default" });
      return;
    }
    if (isSwitchingCamera) return; // Previne trocas rápidas enquanto uma está em progresso

    console.log("Alternando câmera...");
    setCurrentFacingMode(prevMode => prevMode === 'environment' ? 'user' : 'environment');
    // O useEffect [initializeCamera] vai reagir à mudança de currentFacingMode e chamar initializeCamera.
  };


  const extractFrameAndDownload = async (videoElement: HTMLVideoElement, time: number, fileName: string, canvas: HTMLCanvasElement) => {
    // ... (código existente sem alteração)
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
        videoElement.oncanplay = () => { // Usar oncanplay para garantir que o vídeo esteja pronto
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
    // ... (código existente sem alteração)
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
        tempVideoEl.play().then(() => { // Tenta dar play/pause para garantir que o frame seja carregável
          tempVideoEl.pause();
          resolve();
        }).catch(reject);
      };
      tempVideoEl.onerror = () => reject(new Error("Falha ao carregar metadados do vídeo gravado."));
      tempVideoEl.load(); 
    });
  
    try {
      // Tenta extrair frame em 0.1s, que é mais provável de estar disponível
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

    setIsProcessingCapture(true); // Inicia o processamento
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

    // Define o handler onstop AQUI, específico para esta gravação
    mediaRecorderRef.current.onstop = async () => {
      toast({ title: "Gravação Concluída", description: "Processando vídeo gravado...", duration: 2000 });
      const videoBlob = new Blob(recordedChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'video/webm' });
      
      if (videoBlob.size > 0) {
         triggerDownload(videoBlob, `${mediaName}_video_5s.mp4`);
      } else {
         toast({ title: "Gravação Falhou", description: "Nenhum dado de vídeo foi gravado.", variant: "destructive"});
      }

      // A análise IA do frame já foi disparada, aqui esperamos o resultado dela
      // para poder incluir no generateAndDownloadArtifacts
      // Esta parte pode precisar de um Promise para esperar o resultado da análise IA
      // Se a análise falhar, analysisResult será null.
      if (analysisResultForArtifacts.current) {
        await generateAndDownloadArtifacts(videoBlob, analysisResultForArtifacts.current, mediaName, captureTimestamp, eventId);
      } else {
        toast({ title: "Geração de Artefatos", description: "Análise IA não concluída ou falhou, foto e TXT podem não ter todos os dados.", variant: "default" });
      }
      setIsProcessingCapture(false); // Finaliza o processamento aqui
      analysisResultForArtifacts.current = null; // Limpa para a próxima
    };


    setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop(); // Isso vai acionar o onstop definido acima
      }
    }, 5000);

    // Armazena o resultado da análise para uso no onstop
    const analysisResultForArtifacts = React.useRef<AnalyzeUapMediaOutput | null>(null);

    try {
      const result = await analyzeUapMedia({ mediaDataUri: initialFrameDataUri });
      analysisResultForArtifacts.current = result; // Salva para usar no onstop
      const newEvent = {
        id: eventId,
        timestamp: captureTimestamp,
        thumbnailUrl: initialFrameDataUri,
        mediaName: mediaName,
        analysis: result,
        analysisType: AnalysisType.UAP,
      };
      addAnalyzedEvent(newEvent); // Isso agora deve fazer upload para o Storage se necessário
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
      // Mesmo se a análise IA falhar, o MediaRecorder.stop() será chamado pelo setTimeout,
      // o que pode acionar o onstop. O onstop deve lidar com analysisResultForArtifacts.current sendo null.
      // Não é ideal colocar setIsProcessingCapture(false) aqui porque a gravação ainda está ocorrendo.
    }
    // Não definir setIsProcessingCapture(false) aqui, pois onstop cuidará disso.
  };


  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-6 w-6 text-primary" />
          Feed da Câmera ao Vivo
        </CardTitle>
        <CardDescription>
          Monitoramento em tempo real. Clique abaixo para capturar, gravar por 5s e analisar.
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
        <div className="flex gap-2">
            <Button
              onClick={handleCaptureAndAnalyze}
              disabled={!isCameraActive || isProcessingCapture || isSwitchingCamera}
              className="flex-grow bg-primary hover:bg-primary/90 text-primary-foreground"
              aria-label="Capturar Quadro, Gravar Vídeo e Analisar"
            >
              {isProcessingCapture ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              {isProcessingCapture ? 'Processando...' : 'Capturar & Analisar'}
            </Button>
            {videoDeviceCount > 1 && (
                 <Button 
                    onClick={handleSwitchCamera} 
                    variant="outline"
                    size="icon"
                    disabled={isSwitchingCamera || isProcessingCapture}
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
      </CardContent>
    </Card>
  );
}
