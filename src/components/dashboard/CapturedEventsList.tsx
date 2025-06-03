
'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle2, ListChecks, Trash2, Eye } from 'lucide-react';
import { useAnalyzedEvents } from '@/contexts/AnalyzedEventsContext';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

export function CapturedEventsList() {
  const { analyzedEvents, isLoading, clearAllEvents } = useAnalyzedEvents();

  if (isLoading) {
    return (
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
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
            <ul className="space-y-3 pr-1"> {/* Reduced space-y slightly */}
              {analyzedEvents.map((event) => (
                <li key={event.id} className="p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"> {/* Reduced p-4 to p-3 */}
                  <div className="flex items-center space-x-2"> {/* Reduced space-x-4 to space-x-2 */}
                    <Image
                      src={event.thumbnailUrl || `https://placehold.co/56x56.png?text=UAP`} // Slightly smaller image
                      alt={`Miniatura para ${event.mediaName}`}
                      width={56} // Reduced from 64
                      height={56} // Reduced from 64
                      className="rounded-md object-cover aspect-square border border-border flex-shrink-0" // Added flex-shrink-0
                      data-ai-hint="night sky"
                    />
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h3 className="text-sm font-semibold truncate text-foreground">{event.mediaName}</h3> {/* Changed to text-sm */}
                      <p className="text-xs text-muted-foreground truncate">
                        {new Date(event.timestamp).toLocaleString('pt-BR')}
                      </p>
                      <p className={`text-xs font-medium mt-0.5 truncate ${event.analysis.probabilityOfGenuineUapEvent > 0.5 ? 'text-destructive' : 'text-green-400'}`}> {/* Changed to text-xs, mt-0.5 */}
                        Prob: {(event.analysis.probabilityOfGenuineUapEvent * 100).toFixed(0)}% {/* Shortened "Probabilidade de UAP" & toFixed(0) */}
                        {event.analysis.probabilityOfGenuineUapEvent > 0.5 ?
                          <AlertTriangle className="inline ml-1 h-3 w-3" /> : // Smaller icon
                          <CheckCircle2 className="inline ml-1 h-3 w-3" /> // Smaller icon
                        }
                      </p>
                    </div>
                    <Link href={`/analysis/${event.id}`} legacyBehavior passHref>
                      <Button asChild variant="outline" size="sm" className="flex-shrink-0">
                        <a>
                          <Eye className="mr-1 h-4 w-4" /> {/* Reduced mr-2 to mr-1 */}
                          Ver
                        </a>
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
