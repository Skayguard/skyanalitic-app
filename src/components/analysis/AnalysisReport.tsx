
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
  timestamp?: string; // Make timestamp optional for now
}

export function AnalysisReport({ analysis, mediaName, timestamp }: AnalysisReportProps) {
  console.log('[AnalysisReport] Props received:', { analysis, mediaName, timestamp });

  if (!analysis) {
    console.error('[AnalysisReport] "analysis" prop is undefined or null.');
    return (
      <Card className="shadow-lg border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-destructive-foreground flex items-center gap-2">
            <AlertTriangle className="h-7 w-7 text-destructive" />
            Report Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive-foreground">Could not load analysis data.</p>
        </CardContent>
      </Card>
    );
  }

  const probabilityValue = analysis.probabilityOfGenuineUapEvent;
  // Ensure probability is a number between 0 and 1 before multiplying by 100
  const probabilityPercent =
    probabilityValue !== undefined && probabilityValue !== null
      ? probabilityValue * 100
      : 0;

  const isHighProbability = probabilityPercent > 50;

  console.log('[AnalysisReport] ProbabilityPercent:', probabilityPercent, 'IsHighProbability:', isHighProbability);

  const DetailItem: React.FC<{ icon: React.ElementType, label: string, value: string | number | React.ReactNode, valueClassName?: string }> = ({ icon: Icon, label, value, valueClassName }) => {
    return (
      <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
        <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {label}
        </dt>
        <dd className={`mt-1 text-sm text-foreground sm:col-span-2 sm:mt-0 ${valueClassName || ''}`}>{value}</dd>
      </div>
    );
  };

  return (
    <Card className="shadow-lg border border-border bg-card">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <BrainCircuit className="h-7 w-7 text-primary" />
          AI Analysis Report
        </CardTitle>
        <CardDescription>
          Detailed results for: <span className="font-medium text-accent">{mediaName}</span>
          {/* Safely render timestamp */}
          {timestamp && typeof timestamp === 'string' && (
            ` (Analyzed on: ${new Date(timestamp).toLocaleString()})`
          )}
          {!timestamp && typeof timestamp === 'string' && ( // if timestamp is an empty string
             ` (Analysis timestamp unavailable)`
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-border">
          <DetailItem
            icon={Percent}
            label="Probability of Genuine UAP Event"
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
            label="Summary"
            value={<p className="leading-relaxed">{analysis.summary || "Not available"}</p>}
          />
          <DetailItem
            icon={BrainCircuit}
            label="Anomaly Grade"
            value={analysis.anomalyGrade ? <Badge variant={isHighProbability ? "destructive" : "secondary"} className="text-sm">{analysis.anomalyGrade}</Badge> : "Not available"}
          />
          <DetailItem
            icon={FileText}
            label="Technical Details"
            value={<p className="whitespace-pre-wrap text-xs font-mono bg-muted/50 p-3 rounded-md">{analysis.technicalDetails || "Not available"}</p>}
          />
          <DetailItem
            icon={Database}
            label="Database Comparisons"
            value={<p className="whitespace-pre-wrap text-xs font-mono bg-muted/50 p-3 rounded-md">{analysis.databaseComparisons || "Not available"}</p>}
          />
        </dl>
      </CardContent>
    </Card>
  );
}
