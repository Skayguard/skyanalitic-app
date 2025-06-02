
'use client';

import React from 'react';
import type { AnalyzeUapMediaOutput } from '@/ai/flows/analyze-uap-media';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Database, Percent, FileText, BrainCircuit } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

interface AnalysisReportProps {
  analysis: AnalyzeUapMediaOutput;
  mediaName: string;
  timestamp?: string;
}

export function AnalysisReport({ analysis, mediaName, timestamp }: AnalysisReportProps) {
  const probabilityPercent = analysis.probabilityOfGenuineUapEvent * 100;
  const isHighProbability = probabilityPercent > 50;

  const DetailItem: React.FC<{ icon: React.ElementType, label: string, value: string | number | React.ReactNode, valueClassName?: string }> = ({ icon: Icon, label, value, valueClassName }) => (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        {label}
      </dt>
      <dd className={`mt-1 text-sm text-foreground sm:col-span-2 sm:mt-0 ${valueClassName || ''}`}>{value}</dd>
    </div>
  );

  return (
    <Card className="shadow-lg border border-border bg-card">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <BrainCircuit className="h-7 w-7 text-primary" />
          Relatório de Análise IA
        </CardTitle>
        <CardDescription>
          Resultados detalhados para: <span className="font-medium text-accent">{mediaName}</span>
          {timestamp && ` (Analisado em: ${new Date(timestamp).toLocaleString('pt-BR')})`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-border">
          <DetailItem
            icon={Percent}
            label="Probabilidade de UAP Genuíno"
            value={
              <div className="flex items-center gap-2">
                <span className={`font-bold text-lg ${isHighProbability ? 'text-destructive' : 'text-green-400'}`}>
                  {probabilityPercent.toFixed(1)}%
                </span>
                {isHighProbability ? 
                  <AlertTriangle className="h-5 w-5 text-destructive" /> : 
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                }
              </div>
            }
          />
          <div className="py-3">
             <Progress value={probabilityPercent} className={`h-3 ${isHighProbability ? '[&>div]:bg-destructive': '[&>div]:bg-green-500'}`} />
          </div>

          <DetailItem
            icon={FileText}
            label="Resumo"
            value={<p className="leading-relaxed">{analysis.summary}</p>}
          />
          <DetailItem
            icon={BrainCircuit} // Re-using, consider a different icon for "Anomaly Grade"
            label="Grau de Anomalia"
            value={<Badge variant={isHighProbability ? "destructive" : "secondary"} className="text-sm">{analysis.anomalyGrade}</Badge>}
          />
          <DetailItem
            icon={FileText} // Re-using, consider a different icon for "Technical Details"
            label="Detalhes Técnicos"
            value={<p className="whitespace-pre-wrap text-xs font-mono bg-muted/50 p-3 rounded-md">{analysis.technicalDetails || "Não disponível"}</p>}
          />
          <DetailItem
            icon={Database}
            label="Comparações com Banco de Dados"
            value={<p className="whitespace-pre-wrap text-xs font-mono bg-muted/50 p-3 rounded-md">{analysis.databaseComparisons || "Não disponível"}</p>}
          />
        </dl>
      </CardContent>
    </Card>
  );
}
