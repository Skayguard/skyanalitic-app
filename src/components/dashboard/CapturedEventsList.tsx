
'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle2, ListChecks, Trash2, Eye, GitCommitHorizontal, Search } from 'lucide-react';
import { useAnalyzedEvents } from '@/contexts/AnalyzedEventsContext';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AnalysisType, type AnalyzedEvent } from '@/lib/types';
import type { AnalyzeUapMediaOutput } from '@/ai/flows/analyze-uap-media';
import type { AnalyzeObjectTrailOutput } from '@/ai/flows/analyze-object-trail-flow';

export function CapturedEventsList() {
  const { analyzedEvents, isLoading, clearAllEvents } = useAnalyzedEvents();

  const renderEventItem = (event: AnalyzedEvent) => {
    let title = event.mediaName;
    let description = '';
    let IconComponent = Search;
    let probabilityText = '';
    let probabilityHigh = false;

    if (event.analysisType === AnalysisType.UAP) {
      const uapAnalysis = event.analysis as AnalyzeUapMediaOutput;
      description = uapAnalysis.summary?.substring(0, 70) + (uapAnalysis.summary?.length > 70 ? '...' : '');
      const prob = uapAnalysis.probabilityOfGenuineUapEvent * 100;
      probabilityText = `Prob. UAP: ${prob.toFixed(0)}%`;
      probabilityHigh = prob > 50;
    } else if (event.analysisType === AnalysisType.TRAIL) {
      const trailAnalysis = event.analysis as AnalyzeObjectTrailOutput;
      title = `Rastro: ${event.mediaName}`;
      description = trailAnalysis.trailDescription?.substring(0, 70) + (trailAnalysis.trailDescription?.length > 70 ? '...' : '');
      IconComponent = GitCommitHorizontal;
      if (trailAnalysis.trailImageUri && !trailAnalysis.trailImageUri.startsWith('https://placehold.co')) {
        probabilityText = 'Imagem de rastro gerada';
      } else if (trailAnalysis.errorMessage && !trailAnalysis.trailImageUri) {
        probabilityText = 'Rastro descrito (sem imagem)';
        probabilityHigh = true; 
      } else {
        probabilityText = 'Rastro descrito';
      }
    }

    return (
      <li key={event.id}>
        <Link href={`/analysis/${encodeURIComponent(event.id)}`} legacyBehavior passHref>
          <a className="block p-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background">
            <div className="flex items-center space-x-2">
              <Image
                src={event.thumbnailUrl || `https://placehold.co/48x48.png/2c2f33/E0E7FF?text=SkyA`}
                alt={`Miniatura para ${event.mediaName}`}
                width={48}
                height={48}
                className="rounded-md object-cover aspect-square border border-border flex-shrink-0"
                data-ai-hint={event.analysisType === AnalysisType.TRAIL ? "motion trail" : "night sky"}
              />
              <div className="flex-1 min-w-0 overflow-hidden">
                <h3 className="text-xs sm:text-sm font-semibold truncate text-foreground flex items-center">
                  <IconComponent className="h-4 w-4 mr-1.5 text-primary flex-shrink-0" />
                  {title}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {event.timestamp ? new Date(event.timestamp).toLocaleDateString('pt-BR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Data inválida'}
                </p>
                <p className="text-xs text-muted-foreground truncate">{description || 'Nenhuma descrição disponível'}</p>
                {probabilityText && (
                  <p className={cn(
                      "text-xs font-medium mt-0.5 truncate",
                      probabilityHigh ? 'text-destructive' : 'text-green-400'
                    )}
                  >
                    {probabilityText}
                    {probabilityHigh ?
                      <AlertTriangle className="inline ml-1 h-3 w-3" /> :
                      <CheckCircle2 className="inline ml-1 h-3 w-3" />
                    }
                  </p>
                )}
              </div>
              <Eye className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-1" />
            </div>
          </a>
        </Link>
      </li>
    );
  };


  if (isLoading) {
    return (
      <Card className="shadow-xl border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <ListChecks className="h-6 w-6 text-primary" />
            Registro de Eventos Capturados
          </CardTitle>
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3 p-3 rounded-lg border border-border">
                <Skeleton className="h-12 w-12 rounded-md" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <ListChecks className="h-6 w-6 text-primary" />
            Registro de Eventos Capturados
          </CardTitle>
          <CardDescription>
            Revise análises passadas. Clique em um evento para ver detalhes.
          </CardDescription>
        </div>
        {analyzedEvents.length > 0 && (
           <Button variant="destructive" size="sm" onClick={clearAllEvents} aria-label="Limpar todos os eventos">
            <Trash2 className="mr-2 h-4 w-4" /> Limpar Tudo
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {analyzedEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Nenhum evento capturado ainda.</p>
            <p>Realize uma análise ou envie evidências para ver os resultados aqui.</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <ul className="space-y-2 pr-1">
              {analyzedEvents.map(renderEventItem)}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
