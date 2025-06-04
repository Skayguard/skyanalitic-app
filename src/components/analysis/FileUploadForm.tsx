
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // For images or extracted video frame
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
      videoRef.current.src = ''; // Clear previous video source
    }
  };

  const extractFrameFromVideo = (videoFile: File, timeInSeconds: number = 1): Promise<string> => {
    return new Promise((resolve, reject) => {
      const videoElement = videoRef.current;
      const canvasElement = canvasRef.current;

      if (!videoElement || !canvasElement) {
        reject(new Error("Elementos de vídeo/canvas não encontrados."));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
          videoElement.src = e.target.result;
        } else {
          reject(new Error("Falha ao ler o arquivo de vídeo. Resultado inesperado do FileReader."));
          return;
        }
      };
      reader.onerror = () => reject(new Error("Falha ao ler o arquivo de vídeo."));
      reader.readAsDataURL(videoFile);
      
      videoElement.onloadeddata = () => {
        const duration = videoElement.duration;
        let effectiveTimeInSeconds = timeInSeconds;

        // Ensure video is seekable and try to get a frame
        // If duration is invalid or very short, try to get a frame near the beginning.
        if (!isFinite(duration) || duration <= 0) {
          effectiveTimeInSeconds = 0.1; // Try for a very early frame
        } else if (timeInSeconds >= duration) {
          // If requested time is beyond or at video end, try midpoint or very early if too short
          effectiveTimeInSeconds = Math.max(0.1, duration / 2); 
        } else {
          // Ensure we don't seek to 0 if 0 was passed, as 0.1 is safer for 'seeked' event
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
          const frameDataUri = canvasElement.toDataURL('image/png'); // Extract as PNG
          resolve(frameDataUri);
        } else {
          reject(new Error("Não foi possível obter contexto do canvas."));
        }
        // Clean up video src
        if (videoElement.src.startsWith('blob:')) {
            URL.revokeObjectURL(videoElement.src);
        } else if (videoElement.src.startsWith('data:')) {
            videoElement.src = ''; // Clear data URL
        }
      };
      
      videoElement.onerror = (e) => {
        console.error("Video error:", videoElement.error, e);
        let errorMsg = "Não foi possível carregar ou processar o vídeo.";
        if (videoElement.error) {
            switch(videoElement.error.code) {
                case MediaError.MEDIA_ERR_ABORTED: errorMsg = "Download do vídeo abortado."; break;
                case MediaError.MEDIA_ERR_NETWORK: errorMsg = "Erro de rede durante o download do vídeo."; break;
                case MediaError.MEDIA_ERR_DECODE: errorMsg = "Erro ao decodificar o vídeo. Formato pode não ser suportado ou arquivo corrompido."; break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMsg = "Formato de vídeo não suportado."; break;
                default: errorMsg = `Erro desconhecido ao carregar o vídeo (código: ${videoElement.error.code}).`;
            }
        }
        reject(new Error(errorMsg));
      };
    });
  };


  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    resetFormState();
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
          const frame = await extractFrameFromVideo(selectedFile, 1); // Extract frame at 1 second
          setPreviewUrl(frame); // This will be the PNG data URI of the frame
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido ao extrair o quadro.";
          console.error("Erro ao extrair quadro:", err);
          setError(errorMessage);
          toast({ title: "Falha na Extração do Quadro", description: errorMessage, variant: "destructive" });
          setFile(null); // Clear invalid file
        } finally {
          setIsExtractingFrame(false);
        }
      } else if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        toast({ title: "Tipo de arquivo não suportado", description: "Por favor, selecione um arquivo de imagem ou vídeo.", variant: "destructive" });
        setFile(null);
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
    if (!previewUrl) { // previewUrl now holds the data URI for both images and extracted video frames
        toast({ title: "Mídia não preparada", description: "A pré-visualização da mídia não está pronta para análise.", variant: "destructive" });
        return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setError(null);

    try {
      // previewUrl is now always the data URI to be analyzed (original image or extracted video frame PNG)
      const result = await analyzeUapMedia({ mediaDataUri: previewUrl });
      setAnalysisResult(result);
      const newEventId = new Date().toISOString() + Math.random().toString(36).substring(2, 9);
      
      await addAnalyzedEvent({
        id: newEventId,
        timestamp: new Date().toISOString(),
        thumbnailUrl: previewUrl, // Use the (potentially extracted) previewUrl as thumbnail
        mediaName: file.name,
        analysisType: AnalysisType.UAP, // Explicitly set type for this form
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
        {/* Hidden elements for video/canvas processing */}
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
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              aria-describedby="file-upload-help"
              disabled={isExtractingFrame || isAnalyzing}
            />
            <p id="file-upload-help" className="mt-1 text-xs text-muted-foreground">Formatos suportados: JPG, PNG, MP4, MOV, etc. Máx 20MB.</p>
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
              {!isExtractingFrame && previewUrl && (
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
               {!isExtractingFrame && !previewUrl && file.type.startsWith('image/') && (
                 <div className="flex flex-col items-center text-muted-foreground">
                    <ImageIcon className="h-10 w-10 mb-2" />
                    <p>Processando imagem...</p> 
                 </div>
              )}
            </div>
          )}

          <Button type="submit" disabled={!file || !previewUrl || isAnalyzing || isExtractingFrame} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
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

        {error && !isAnalyzing && ( // Show general error only if not in analysis, to avoid duplicate messages
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

    