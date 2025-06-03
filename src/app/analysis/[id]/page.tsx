
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnalysisReport } from '@/components/analysis/AnalysisReport';
import { useAnalyzedEvents } from '@/contexts/AnalyzedEventsContext';
import type { AnalyzedEvent } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';

export default function AnalysisDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const { analyzedEvents, isLoading: isLoadingContext } = useAnalyzedEvents();
  
  const [pageEventId, setPageEventId] = useState<string | undefined>(undefined);
  const [event, setEvent] = useState<AnalyzedEvent | null | undefined>(undefined); // undefined: loading, null: not found

  // Effect 1: Set pageEventId from router params
  useEffect(() => {
    const idFromParams = params.id;
    if (Array.isArray(idFromParams)) {
      setPageEventId(idFromParams[0]);
    } else if (typeof idFromParams === 'string') {
      setPageEventId(idFromParams);
    } else {
      setPageEventId(undefined);
    }
  }, [params.id]);

  // Effect 2: Find event once context is loaded and pageEventId is set
  useEffect(() => {
    // Only proceed if context is done loading and we have an ID for the page
    if (isLoadingContext) {
      setEvent(undefined); // Still loading context
      return;
    }

    if (!pageEventId) {
      setEvent(null); // No ID from route, so not found
      return;
    }

    // Context loaded, and we have a pageEventId
    if (analyzedEvents && analyzedEvents.length > 0) {
      const foundEvent = analyzedEvents.find(e => e.id === pageEventId);
      setEvent(foundEvent || null);
    } else {
      // Context loaded, but no events in the list (or list is empty)
      setEvent(null);
    }
  }, [pageEventId, analyzedEvents, isLoadingContext]);

  if (event === undefined) { // Combined loading state (context or finding event)
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
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Ir para o Painel
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card className="shadow-lg sticky top-20">
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold mb-2 text-foreground">{event.mediaName}</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Capturado em: {new Date(event.timestamp).toLocaleString('pt-BR')}
              </p>
              {event.thumbnailUrl && (
                <Image
                  src={event.thumbnailUrl}
                  alt={`Miniatura para ${event.mediaName}`}
                  width={400}
                  height={300}
                  className="rounded-md object-cover w-full aspect-video border border-border"
                  data-ai-hint="night sky object"
                />
              )}
              {!event.thumbnailUrl && (
                 <div className="w-full aspect-video bg-muted rounded-md flex items-center justify-center border border-border" data-ai-hint="night sky object">
                   <AlertTriangle className="w-12 h-12 text-muted-foreground" />
                 </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          <AnalysisReport analysis={event.analysis} mediaName={event.mediaName} timestamp={event.timestamp} />
        </div>
      </div>
    </div>
  );
}
