
'use client';

import React, { useState, ChangeEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud, Loader2, AlertTriangle, FileCheck2, Film, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeUapMedia, AnalyzeUapMediaOutput } from '@/ai/flows/analyze-uap-media';
import { useAnalyzedEvents } from '@/contexts/AnalyzedEventsContext';
import { AnalysisReport } from './AnalysisReport';
import { AnalysisType } from '@/lib/types'; // Import AnalysisType

export function FileUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // For image or extracted video frame (still a data URI for the frame)
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeUapMediaOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { addAnalyzedEvent } = useAnalyzedEvents();

  const [isExtractingFrame, setIsExtractingFrame] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const resetFormState = () => {
    setFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setError(null);
    setIsExtractingFrame(false);
    if (videoRef.current) {
      // Ensure any existing object URL is revoked if videoRef.current.src was one
      if (videoRef.current.src && videoRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(videoRef.current.src);
      }
      videoRef.current.src = ''; 
      if (videoRef.current.srcObject) { 
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  };

  const extractFrameFromVideo = (videoFile: File, timeInSeconds: number = 1): Promise<string> => {
    return new Promise((resolve, reject) => {
      const videoElement = videoRef.current;
      const canvasElement = canvasRef.current;

      if (!videoElement || !canvasElement) {
        reject(new Error("Elementos de vídeo/canvas não encontrados para extração."));
        return;
      }

      const objectURL = URL.createObjectURL(videoFile);

      const cleanup = () => {
        URL.revokeObjectURL(objectURL);
        if (videoElement) {
            videoElement.onloadeddata = null;
            videoElement.onseeked = null;
            videoElement.onerror = null;
            videoElement.src = ''; // Clear src to release resources
        }
      };

      videoElement.onloadeddata = () => {
        const duration = videoElement.duration;
        let effectiveTimeInSeconds = timeInSeconds;

        if (!isFinite(duration) || duration <= 0) {
          effectiveTimeInSeconds = 0.1;
        } else if (timeInSeconds >= duration) {
          effectiveTimeInSeconds = Math.max(0.1, duration / 2);
        } else {
          effectiveTimeInSeconds = Math.max(0.1, timeInSeconds);
        }
        videoElement.currentTime = effectiveTimeInSeconds;
      };

      videoElement.onseeked = () => {
        const context = canvasElement.getContext('2d');
        if (context) {
          canvasElement.width = videoElement.videoWidth;
          canvasElement.height = videoElement.videoHeight;
          context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
          const frameDataUri = canvasElement.toDataURL('image/png');
          resolve(frameDataUri);
        } else {
          reject(new Error("Não foi possível obter contexto do canvas para extrair o quadro."));
        }
        cleanup();
      };

      videoElement.onerror = (e) => {
        console.error("Video element error:", videoElement.error, e);
        let errorMsg = "Não foi possível carregar ou processar o vídeo para extração de quadro.";
        if (videoElement.error) {
            switch(videoElement.error.code) {
                case MediaError.MEDIA_ERR_ABORTED: errorMsg = "Operação de carregamento do vídeo (para extração) abortada."; break;
                case MediaError.MEDIA_ERR_NETWORK: errorMsg = "Erro de rede durante o carregamento do vídeo (para extração)."; break;
                case MediaError.MEDIA_ERR_DECODE: errorMsg = `Erro ao decodificar o vídeo (para extração). O formato ou codec "${videoFile.type}" pode não ser suportado pelo navegador ou o arquivo está corrompido.`; break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMsg = `Formato de vídeo ("${videoFile.type}") não suportado pelo navegador para extração de quadro.`; break;
                default: errorMsg = `Erro desconhecido ao carregar o vídeo para extração (código: ${videoElement.error.code}).`;
            }
            if (videoElement.error.message && videoElement.error.message.trim() !== "") {
                 errorMsg += ` Detalhe: ${videoElement.error.message}`;
            } else if (videoElement.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
                errorMsg += ` O navegador não pôde processar o arquivo de vídeo fornecido. Verifique se é um formato de vídeo comum e não está corrompido.`;
            }
        }
        reject(new Error(errorMsg));
        cleanup();
      };
      
      videoElement.src = objectURL; // Set src after attaching listeners
    });
  };


  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    resetFormState(); // Reset state, including revoking previous object URLs if any
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: "Por favor, selecione um arquivo menor que 20MB.", variant: "destructive" });
        return;
      }
      setFile(selectedFile);

      if (selectedFile.type.startsWith('video/')) {
        setIsExtractingFrame(true);
        setError(null);
        try {
          toast({ title: "Processando Vídeo", description: "Extraindo um quadro para pré-visualização e análise..." });
          const frame = await extractFrameFromVideo(selectedFile, 1);
          setPreviewUrl(frame); // frame is a data URI of the extracted image
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido ao extrair o quadro.";
          console.error("Erro ao extrair quadro:", err);
          setError(errorMessage);
          toast({ title: "Falha na Extração do Quadro", description: errorMessage, variant: "destructive", duration: 7000 });
          setFile(null);
          setPreviewUrl(null);
        } finally {
          setIsExtractingFrame(false);
        }
      } else if (selectedFile.type.startsWith('image/')) {
        setError(null);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string); // previewUrl will be a data URI for the image
        };
        reader.onerror = () => {
            const imageError = "Falha ao ler o arquivo de imagem.";
            setError(imageError);
            toast({ title: "Erro na Imagem", description: imageError, variant: "destructive" });
            setFile(null);
            setPreviewUrl(null);
        }
        reader.readAsDataURL(selectedFile);
      } else {
        const typeError = "Tipo de arquivo não suportado. Por favor, selecione um arquivo de imagem ou vídeo.";
        setError(typeError);
        toast({ title: "Tipo de Arquivo Inválido", description: typeError, variant: "destructive" });
        setFile(null);
        setPreviewUrl(null);
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast({ title: "Nenhum arquivo selecionado", description: "Por favor, selecione um arquivo para analisar.", variant: "destructive" });
      return;
    }
    if (isExtractingFrame) {
      toast({ title: "Aguarde", description: "Extração de quadro do vídeo em progresso.", variant: "default" });
      return;
    }
    if (error) {
        toast({ title: "Não é possível analisar", description: `Corrija o erro anterior antes de prosseguir: ${error}`, variant: "destructive", duration: 7000});
        return;
    }
    if (!previewUrl) { // previewUrl is the data URI of the frame (for videos) or the image itself
        toast({ title: "Mídia não preparada", description: "A pré-visualização da mídia não está pronta para análise. Verifique se houve erros ou tente selecionar o arquivo novamente.", variant: "destructive" });
        return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // previewUrl (the extracted frame's data URI) is sent for analysis
      const result = await analyzeUapMedia({ mediaDataUri: previewUrl });
      setAnalysisResult(result);
      const newEventId = new Date().toISOString() + Math.random().toString(36).substring(2, 9);
      
      await addAnalyzedEvent({
        id: newEventId,
        timestamp: new Date().toISOString(),
        thumbnailUrl: previewUrl, // Use the extracted frame as thumbnail
        mediaName: file.name,
        analysisType: AnalysisType.UAP,
        analysis: result,
      });
      toast({
        title: "Análise Concluída",
        description: `Probabilidade de UAP: ${(result.probabilityOfGenuineUapEvent * 100).toFixed(1)}%`,
      });
    } catch (err) {
      console.error("Falha na análise IA:", err);
      const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido durante a análise IA.";
      setError(errorMessage);
      toast({
        title: "Falha na Análise",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadCloud className="h-6 w-6 text-primary" />
          Enviar Evidência para Análise
        </CardTitle>
        <CardDescription>
          Envie um vídeo ou foto (máx. 20MB). Um quadro PNG será extraído de vídeos para análise e pré-visualização.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Video element is used temporarily for frame extraction, not for direct display of uploaded video */}
        <video ref={videoRef} style={{ display: 'none' }} crossOrigin="anonymous" muted playsInline preload="metadata" />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="file-upload" className="text-sm font-medium text-foreground">
              Escolher Arquivo
            </Label>
            <Input
              id="file-upload"
              type="file"
              accept="image/*,video/mp4,video/quicktime,video/webm"
              onChange={handleFileChange}
              className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              aria-describedby="file-upload-help"
              disabled={isExtractingFrame || isAnalyzing}
            />
            <p id="file-upload-help" className="mt-1 text-xs text-muted-foreground">Formatos de vídeo comuns: MP4, MOV, WebM. Imagens: JPG, PNG. Máx 20MB.</p>
          </div>

          {file && (
            <div className="mt-4 p-4 border border-border rounded-md bg-muted/30 min-h-[150px] flex flex-col justify-center items-center">
              <h4 className="text-sm font-medium text-foreground mb-2 self-start">Pré-visualização:</h4>
              {isExtractingFrame && file.type.startsWith('video/') && (
                <div className="flex flex-col items-center text-muted-foreground">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
                  <p>Extraindo quadro do vídeo...</p>
                  <Film className="h-8 w-8 mt-1" />
                </div>
              )}
              {!isExtractingFrame && previewUrl && ( // previewUrl is the data URI of the frame or image
                <img
                  src={previewUrl}
                  alt="Pré-visualização do arquivo"
                  className="max-h-60 w-auto rounded-md border border-border"
                  data-ai-hint={file.type.startsWith('video/') ? "video still frame" : "uploaded image"}
                />
              )}
              {!isExtractingFrame && !previewUrl && file.type.startsWith('video/') && !error && (
                 <div className="flex flex-col items-center text-muted-foreground">
                    <Film className="h-10 w-10 mb-2" />
                    <p>Pronto para extrair quadro do vídeo.</p>
                 </div>
              )}
               {!isExtractingFrame && !previewUrl && file.type.startsWith('image/') && !error &&(
                 <div className="flex flex-col items-center text-muted-foreground">
                    <ImageIcon className="h-10 w-10 mb-2" />
                    <p>Processando imagem...</p>
                 </div>
              )}
              {!isExtractingFrame && error && !analysisResult && (
                 <div className="flex flex-col items-center text-destructive p-2 text-center">
                    <AlertTriangle className="h-10 w-10 mb-2" />
                    <p className="text-sm font-semibold">Falha na Pré-visualização</p>
                    <p className="text-xs">{error}</p>
                 </div>
              )}
            </div>
          )}

          <Button type="submit" disabled={!file || isAnalyzing || isExtractingFrame || (!!error && !previewUrl)} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            {isAnalyzing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isExtractingFrame ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="mr-2 h-4 w-4" />
            )}
            {isAnalyzing ? 'Analisando...' : isExtractingFrame ? 'Processando Vídeo...' : 'Enviar & Analisar'}
          </Button>
        </form>

        {error && !isAnalyzing && (analysisResult || !previewUrl) && (
          <div className="mt-6 p-4 bg-destructive/10 border border-destructive text-destructive rounded-md flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold">Erro</h4>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {analysisResult && !error && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
              <FileCheck2 className="h-6 w-6 text-green-400"/>
              Relatório de Análise
            </h3>
            <AnalysisReport analysis={analysisResult} mediaName={file?.name || "Mídia Enviada"} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

    