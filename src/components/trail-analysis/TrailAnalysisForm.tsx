
'use client';

import React, { useState, ChangeEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud, Loader2, AlertTriangle, Film, Image as ImageIcon, GitCommitHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeObjectTrail, AnalyzeObjectTrailOutput } from '@/ai/flows/analyze-object-trail-flow';
import { TrailAnalysisReport } from './TrailAnalysisReport';

export function TrailAnalysisForm() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeObjectTrailOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const videoPlayerRef = useRef<HTMLVideoElement>(null);

  const resetFormState = () => {
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setAnalysisResult(null);
    setError(null);
    if (videoPlayerRef.current) {
      videoPlayerRef.current.src = '';
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    resetFormState();
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) { // Increased limit for videos, e.g. 50MB
        toast({ title: "Arquivo de vídeo muito grande", description: "Por favor, selecione um vídeo menor que 50MB.", variant: "destructive" });
        return;
      }
      if (!selectedFile.type.startsWith('video/')) {
        toast({ title: "Tipo de arquivo não suportado", description: "Por favor, selecione um arquivo de vídeo (MP4, MOV, WebM, etc.).", variant: "destructive" });
        return;
      }
      
      setVideoFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
      toast({ title: "Vídeo Carregado", description: "Pronto para análise de rastro."});
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!videoFile || !videoPreviewUrl) {
      toast({ title: "Nenhum vídeo selecionado", description: "Por favor, selecione um arquivo de vídeo para analisar.", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setError(null);

    try {
      // videoPreviewUrl is the Data URI of the selected video file
      const result = await analyzeObjectTrail({ videoDataUri: videoPreviewUrl });
      setAnalysisResult(result);
      
      if (result.errorMessage) {
         toast({
            title: "Aviso da Análise",
            description: result.errorMessage,
            variant: "default",
            duration: 7000,
          });
      } else {
        toast({
            title: "Análise de Rastro Concluída",
            description: "O relatório da análise de rastro está pronto.",
          });
      }

    } catch (err) {
      console.error("Falha na análise de rastro IA:", err);
      const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido durante a análise de rastro.";
      setError(errorMessage);
      toast({
        title: "Falha na Análise de Rastro",
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
          <GitCommitHorizontal className="h-6 w-6 text-primary" />
          Enviar Vídeo para Análise de Rastro
        </CardTitle>
        <CardDescription>
          Envie um arquivo de vídeo (máx. 50MB). A IA analisará o movimento e tentará gerar uma imagem do rastro do objeto.
          Este processo pode levar algum tempo dependendo do tamanho e duração do vídeo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="video-upload" className="text-sm font-medium text-foreground">
              Escolher Arquivo de Vídeo
            </Label>
            <Input
              id="video-upload"
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              aria-describedby="video-upload-help"
              disabled={isAnalyzing}
            />
            <p id="video-upload-help" className="mt-1 text-xs text-muted-foreground">Formatos suportados: MP4, MOV, WebM, etc. Máx 50MB.</p>
          </div>

          {videoPreviewUrl && videoFile && (
            <div className="mt-4 p-4 border border-border rounded-md bg-muted/30 min-h-[200px] flex flex-col justify-center items-center">
              <h4 className="text-sm font-medium text-foreground mb-2 self-start">Pré-visualização do Vídeo:</h4>
              <video 
                ref={videoPlayerRef}
                src={videoPreviewUrl} 
                controls 
                className="max-h-80 w-auto rounded-md border border-border"
                data-ai-hint="video preview"
              >
                Seu navegador não suporta a tag de vídeo.
              </video>
              <p className="text-xs text-muted-foreground mt-2">{videoFile.name}</p>
            </div>
          )}

          <Button type="submit" disabled={!videoFile || !videoPreviewUrl || isAnalyzing} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            {isAnalyzing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="mr-2 h-4 w-4" />
            )}
            {isAnalyzing ? 'Analisando Rastro...' : 'Enviar & Analisar Rastro'}
          </Button>
        </form>

        {error && !isAnalyzing && (
          <div className="mt-6 p-4 bg-destructive/10 border border-destructive text-destructive rounded-md flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold">Erro na Análise</h4>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {analysisResult && (
          <div className="mt-8">
            <TrailAnalysisReport result={analysisResult} videoName={videoFile?.name || "Vídeo Enviado"} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
