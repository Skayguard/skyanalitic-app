
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
      // Create a filename from the video name, removing extension
      const fileName = videoName.substring(0, videoName.lastIndexOf('.')) || videoName;
      link.download = `${fileName}_trail_analysis.png`;
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
          Trail Analysis Report
        </CardTitle>
        <CardDescription>
          Results for video: <span className="font-medium text-accent">{videoName}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Display error/warning message from AI if present */}
        {result.errorMessage && (
          <div className="p-4 bg-muted/50 border border-border text-foreground rounded-md flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 mt-0.5 text-amber-500 flex-shrink-0" />
            <div>
              <h4 className="font-semibold">Analysis Note</h4>
              <p className="text-sm">{result.errorMessage}</p>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Trail Description
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {result.trailDescription || "No trail description was generated."}
          </p>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              AI Generated Trail Image
            </h3>
            {/* Show download button only if a trail image (not a placeholder) exists */}
            {result.trailImageUri && !result.trailImageUri.startsWith('https://placehold.co') && (
              <Button onClick={handleDownloadImage} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download Image
              </Button>
            )}
          </div>
          {result.trailImageUri && !result.trailImageUri.startsWith('https://placehold.co') ? (
            <>
              <Image
                src={result.trailImageUri}
                alt="AI generated trail image"
                width={600} // Max width
                height={400} // Max height
                className="rounded-md object-contain border border-border bg-muted/20 mx-auto" // object-contain to see full image
                data-ai-hint="object motion trail"
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                This is an AI-generated visual representation and may not be an exact frame overlay.
              </p>
            </>
          ) : (
            <div className="p-6 bg-muted/30 rounded-md border border-dashed border-border text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No trail image was generated. {result.errorMessage ? '' : 'This can occur if the model could not identify a clear trail or due to image generation limitations.'}
              </p>
            </div>
          )}
        </div>
        
        {/* Success message based on results */}
        {!result.errorMessage && result.trailImageUri && !result.trailImageUri.startsWith('https://placehold.co') && (
            <div className="p-3 bg-green-700/10 border border-green-600/30 text-green-300 rounded-md flex items-center gap-2 text-sm">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <p>Trail analysis and image generation completed successfully.</p>
            </div>
        )}
         {!result.errorMessage && (!result.trailImageUri || result.trailImageUri.startsWith('https://placehold.co')) && result.trailDescription && (
             <div className="p-3 bg-blue-600/10 border border-blue-500/30 text-blue-300 rounded-md flex items-center gap-2 text-sm">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <p>Textual trail analysis completed. Trail image could not be generated or is a placeholder.</p>
            </div>
        )}

      </CardContent>
    </Card>
  );
}
