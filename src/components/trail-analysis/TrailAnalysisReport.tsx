
'use client';

import React from 'react';
import type { AnalyzeObjectTrailOutput } from '@/ai/flows/analyze-object-trail-flow';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageIcon, FileText, AlertTriangle, Sparkles, CheckCircle, Download } from 'lucide-react';
import Image from 'next/image';

interface TrailAnalysisReportProps {
  result: AnalyzeObjectTrailOutput;
  videoName: string;
}

export function TrailAnalysisReport({ result, videoName }: TrailAnalysisReportProps) {

  const handleDownloadImage = () => {
    if (result.trailImageUri) {
      const link = document.createElement('a');
      link.href = result.trailImageUri;
      const fileName = videoName.substring(0, videoName.lastIndexOf('.')) || videoName;
      link.download = `${fileName}_rastro_analise.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Card className="shadow-lg border border-border bg-card mt-6">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" />
          Relatório da Análise de Rastro
        </CardTitle>
        <CardDescription>
          Resultados para o vídeo: <span className="font-medium text-accent">{videoName}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {result.errorMessage && (
          <div className="p-4 bg-muted/50 border border-border text-foreground rounded-md flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 mt-0.5 text-amber-500 flex-shrink-0" />
            <div>
              <h4 className="font-semibold">Aviso da Análise</h4>
              <p className="text-sm">{result.errorMessage}</p>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Descrição do Rastro
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {result.trailDescription || "Nenhuma descrição do rastro foi gerada."}
          </p>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Imagem do Rastro Gerada pela IA
            </h3>
            {result.trailImageUri && (
              <Button onClick={handleDownloadImage} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Baixar Imagem
              </Button>
            )}
          </div>
          {result.trailImageUri ? (
            <>
              <Image
                src={result.trailImageUri}
                alt="Imagem do rastro gerada pela IA"
                width={600}
                height={400}
                className="rounded-md object-contain border border-border bg-muted/20 mx-auto"
                data-ai-hint="object motion trail"
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Esta é uma representação visual gerada pela IA e pode não ser uma sobreposição exata dos frames.
              </p>
            </>
          ) : (
            <div className="p-6 bg-muted/30 rounded-md border border-dashed border-border text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma imagem de rastro foi gerada. {result.errorMessage ? '' : 'Isso pode ocorrer se o modelo não conseguiu identificar um rastro claro ou devido a limitações na geração de imagem.'}
              </p>
            </div>
          )}
        </div>
        
        {!result.errorMessage && result.trailImageUri && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-300 rounded-md flex items-center gap-2 text-sm">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <p>Análise de rastro e geração de imagem concluídas com sucesso.</p>
            </div>
        )}
         {!result.errorMessage && !result.trailImageUri && result.trailDescription && (
             <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-md flex items-center gap-2 text-sm">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <p>Análise de rastro textual concluída. A imagem do rastro não pôde ser gerada.</p>
            </div>
        )}

      </CardContent>
    </Card>
  );
}
