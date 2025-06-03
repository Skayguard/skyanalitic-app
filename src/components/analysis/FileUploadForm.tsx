
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

export function FileUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeUapMediaOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { addAnalyzedEvent } = useAnalyzedEvents();

  const [extractedFrameDataUri, setExtractedFrameDataUri] = useState<string | null>(null);
  const [isExtractingFrame, setIsExtractingFrame] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const resetFormState = () => {
    setFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setError(null);
    setExtractedFrameDataUri(null);
    setIsExtractingFrame(false);
  };

  const extractFrameFromVideo = (videoFile: File) => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;

    if (!videoElement || !canvasElement) {
      toast({ title: "Erro Interno", description: "Elementos de vídeo/canvas não encontrados.", variant: "destructive" });
      setIsExtractingFrame(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      videoElement.src = e.target?.result as string;
    };
    reader.readAsDataURL(videoFile);

    videoElement.onloadeddata = () => {
      videoElement.currentTime = 1; // Seek to 1 second
    };

    videoElement.onseeked = () => {
      const context = canvasElement.getContext('2d');
      if (context) {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        const frameDataUri = canvasElement.toDataURL('image/png');
        setExtractedFrameDataUri(frameDataUri);
        setPreviewUrl(frameDataUri); // Use extracted frame for preview
        setIsExtractingFrame(false);
        toast({ title: "Quadro Extraído", description: "Um quadro do vídeo foi extraído para análise e pré-visualização." });
      } else {
        toast({ title: "Erro na Extração", description: "Não foi possível obter contexto do canvas.", variant: "destructive" });
        setIsExtractingFrame(false);
      }
       // Clean up video src to free resources, not strictly necessary with Data URL but good practice for Object URLs
      if (videoElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(videoElement.src);
      }
    };

    videoElement.onerror = () => {
      toast({ title: "Erro de Vídeo", description: "Não foi possível carregar ou processar o vídeo.", variant: "destructive" });
      setIsExtractingFrame(false);
    };
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    resetFormState();
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      if (selectedFile.size > 20 * 1024 * 1024) { // 20MB limit (increased slightly for video flexibility)
        toast({ title: "Arquivo muito grande", description: "Por favor, selecione um arquivo menor que 20MB.", variant: "destructive" });
        return;
      }
      setFile(selectedFile);

      if (selectedFile.type.startsWith('video/')) {
        setIsExtractingFrame(true);
        extractFrameFromVideo(selectedFile);
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

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setError(null);

    let mediaDataUriForAnalysis: string | null = null;

    if (file.type.startsWith('video/')) {
      if (!extractedFrameDataUri) {
        setError("Quadro do vídeo não foi extraído. Tente reenviar o arquivo.");
        toast({ title: "Erro na Preparação", description: "Quadro do vídeo não disponível para análise.", variant: "destructive" });
        setIsAnalyzing(false);
        return;
      }
      mediaDataUriForAnalysis = extractedFrameDataUri;
    } else if (file.type.startsWith('image/')) {
      // For images, previewUrl already holds the data URI
      if (!previewUrl) {
         // This case should ideally not happen if file is set and is an image, means FileReader failed.
        setError("Falha ao ler o arquivo de imagem.");
        toast({ title: "Erro de Leitura do Arquivo", description: "Não foi possível ler o arquivo de imagem selecionado.", variant: "destructive" });
        setIsAnalyzing(false);
        return;
      }
      mediaDataUriForAnalysis = previewUrl;
    }

    if (!mediaDataUriForAnalysis) {
      setError("Mídia para análise não está pronta.");
      toast({ title: "Erro de Preparação", description: "Não há dados de mídia prontos para análise.", variant: "destructive" });
      setIsAnalyzing(false);
      return;
    }


    try {
      const result = await analyzeUapMedia({ mediaDataUri: mediaDataUriForAnalysis });
      setAnalysisResult(result);
      const newEventId = new Date().toISOString() + Math.random().toString(36).substring(2, 9);
      const newEvent = {
        id: newEventId,
        timestamp: new Date().toISOString(),
        thumbnailUrl: file.type.startsWith('video/') ? extractedFrameDataUri : previewUrl,
        mediaName: file.name,
        analysis: result,
      };
      addAnalyzedEvent(newEvent);
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
          Envie manualmente um vídeo ou foto (máx. 20MB) de um potencial UAP. Um quadro será extraído de vídeos para análise.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Hidden elements for video/canvas processing */}
        <video ref={videoRef} style={{ display: 'none' }} crossOrigin="anonymous" muted playsInline />
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
              {!isExtractingFrame && !previewUrl && file.type.startsWith('video/') && (
                 <div className="flex flex-col items-center text-muted-foreground">
                    <Film className="h-10 w-10 mb-2" />
                    <p>Pronto para extrair quadro do vídeo.</p>
                 </div> 
              )}
               {!isExtractingFrame && !previewUrl && file.type.startsWith('image/') && (
                 <div className="flex flex-col items-center text-muted-foreground">
                    <ImageIcon className="h-10 w-10 mb-2" />
                    <p>Processando imagem...</p> {/* Should be quick */}
                 </div>
              )}
            </div>
          )}

          <Button type="submit" disabled={!file || isAnalyzing || isExtractingFrame} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
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

        {error && (
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

