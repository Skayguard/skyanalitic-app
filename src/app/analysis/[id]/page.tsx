
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnalysisReport } from '@/components/analysis/AnalysisReport';
import { TrailAnalysisReport } from '@/components/trail-analysis/TrailAnalysisReport';
import { useAnalyzedEvents } from '@/contexts/AnalyzedEventsContext';
import type { AnalyzedEvent } from '@/lib/types';
import { AnalysisType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle, Loader2, GitCommitHorizontal, Search } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import type { AnalyzeUapMediaOutput } from '@/ai/flows/analyze-uap-media';
import type { AnalyzeObjectTrailOutput } from '@/ai/flows/analyze-object-trail-flow';


export default function AnalysisDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const { analyzedEvents, isLoading: isLoadingContext } = useAnalyzedEvents();
  
  const [pageEventId, setPageEventId] = useState<string | undefined>(undefined);
  const [event, setEvent] = useState<AnalyzedEvent | null | undefined>(undefined); // undefined: loading, null: not found

  useEffect(() => {
    const idFromParams = params.id;
    let rawId: string | undefined = undefined;

    if (Array.isArray(idFromParams)) {
      rawId = idFromParams[0];
    } else if (typeof idFromParams === 'string') {
      rawId = idFromParams;
    }

    if (rawId) {
      try {
        const decodedId = decodeURIComponent(rawId);
        setPageEventId(decodedId);
      } catch (e) {
        console.error("Erro ao decodificar ID do evento da URL:", e, "ID Bruto:", rawId);
        setPageEventId(rawId); 
      }
    } else {
      setPageEventId(undefined);
    }
  }, [params.id]);

  useEffect(() => {
    if (isLoadingContext) {
      setEvent(undefined); 
      return;
    }

    if (!pageEventId) {
      setEvent(null); 
      return;
    }

    if (analyzedEvents && analyzedEvents.length > 0) {
      const foundEvent = analyzedEvents.find(e => e.id === pageEventId);
      console.log('[AnalysisDetailsPage] Evento encontrado no contexto:', foundEvent); 
      setEvent(foundEvent || null);
    } else {
      if(!isLoadingContext) setEvent(null);
    }
  }, [pageEventId, analyzedEvents, isLoadingContext]);

  if (event === undefined || isLoadingContext) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-muted-foreground">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-xl">Carregando relatório de análise...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-6">
        <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
        <h1 className="text-3xl font-bold mb-4 text-foreground">Análise Não Encontrada</h1>
        <p className="text-lg text-muted-foreground mb-8">
          O relatório de análise que você está procurando não existe ou não pôde ser carregado. (ID: {pageEventId || 'N/A'})
        </p>
        <Button asChild variant="outline">
          <Link href="/upload"> {/* Alterado para /upload como painel principal */}
            <ArrowLeft className="mr-2 h-4 w-4" /> Ir para o Painel
          </Link>
        </Button>
      </div>
    );
  }

  const getReportTitle = () => {
    if (event.analysisType === AnalysisType.TRAIL) {
      return (
        <div className="flex items-center gap-2">
          <GitCommitHorizontal className="h-5 w-5 text-primary" />
          Detalhes da Análise de Rastro
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
         <Search className="h-5 w-5 text-primary" />
         Detalhes da Análise UAP
      </div>
    );
  };

  return (
    <div className="container mx-auto py-2">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card className="shadow-lg sticky top-20">
             <CardHeader>
                <CardTitle className="text-lg">
                    {getReportTitle()}
                </CardTitle>
             </CardHeader>
            <CardContent className="p-4 pt-0">
              <h2 className="text-md font-semibold mb-2 text-foreground">{event.mediaName}</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Capturado em: {event.timestamp ? new Date(event.timestamp).toLocaleString('pt-BR') : 'Data indisponível'}
              </p>
              {event.thumbnailUrl && (
                <Image
                  src={event.thumbnailUrl}
                  alt={`Miniatura para ${event.mediaName}`}
                  width={400}
                  height={300}
                  className="rounded-md object-cover w-full aspect-video border border-border"
                  data-ai-hint={event.analysisType === AnalysisType.TRAIL ? "object motion trail" : "night sky object"}
                />
              )}
              {!event.thumbnailUrl && (
                 <div className="w-full aspect-video bg-muted rounded-md flex items-center justify-center border border-border" data-ai-hint="generic placeholder">
                   <AlertTriangle className="w-12 h-12 text-muted-foreground" />
                 </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          {event.analysisType === AnalysisType.UAP && (
            <AnalysisReport 
              analysis={event.analysis as AnalyzeUapMediaOutput} 
              mediaName={event.mediaName} 
              timestamp={event.timestamp} 
            />
          )}
          {event.analysisType === AnalysisType.TRAIL && (
            <TrailAnalysisReport 
              result={event.analysis as AnalyzeObjectTrailOutput} 
              videoName={event.mediaName} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
