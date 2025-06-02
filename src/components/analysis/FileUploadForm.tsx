
'use client';

import React, { useState, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud, Loader2, AlertTriangle, FileCheck2, FileQuestion } from 'lucide-react';
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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        toast({ title: "Arquivo muito grande", description: "Por favor, selecione um arquivo menor que 10MB.", variant: "destructive" });
        setFile(null);
        setPreviewUrl(null);
        return;
      }
      setFile(selectedFile);
      setAnalysisResult(null); // Clear previous results
      setError(null);

      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast({ title: "Nenhum arquivo selecionado", description: "Por favor, selecione um arquivo para analisar.", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setError(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const mediaDataUri = reader.result as string;
      try {
        const result = await analyzeUapMedia({ mediaDataUri });
        setAnalysisResult(result);
        const newEvent = {
          id: new Date().toISOString() + Math.random().toString(36).substring(2,9),
          timestamp: new Date().toISOString(),
          thumbnailUrl: mediaDataUri.startsWith('data:image') ? mediaDataUri : `https://placehold.co/100x100.png?text=MEDIA`, // Use preview if image
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
    reader.onerror = () => {
      setError("Falha ao ler o arquivo.");
      toast({ title: "Erro de Leitura do Arquivo", description: "Não foi possível ler o arquivo selecionado.", variant: "destructive" });
      setIsAnalyzing(false);
    };
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadCloud className="h-6 w-6 text-primary" />
          Enviar Evidência para Análise
        </CardTitle>
        <CardDescription>
          Envie manualmente um vídeo ou foto (máx. 10MB) de um potencial UAP para análise por IA.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            <p id="file-upload-help" className="mt-1 text-xs text-muted-foreground">Formatos suportados: JPG, PNG, MP4, MOV, etc. Máx 10MB.</p>
          </div>

          {previewUrl && file && (
            <div className="mt-4 p-4 border border-border rounded-md bg-muted/30">
              <h4 className="text-sm font-medium text-foreground mb-2">Pré-visualização do Arquivo:</h4>
              {file.type.startsWith('image/') ? (
                <img src={previewUrl} alt="Pré-visualização do arquivo" className="max-h-60 w-auto rounded-md border border-border" />
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileQuestion className="h-10 w-10" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs">Pré-visualização de vídeo não disponível aqui.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <Button type="submit" disabled={!file || isAnalyzing} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            {isAnalyzing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="mr-2 h-4 w-4" />
            )}
            {isAnalyzing ? 'Analisando...' : 'Enviar & Analisar'}
          </Button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-destructive/10 border border-destructive text-destructive rounded-md flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold">Erro na Análise</h4>
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
