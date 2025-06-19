
'use client';

import React, { useState, ChangeEvent, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud, Loader2, AlertTriangle, GitCommitHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeObjectTrail, type AnalyzeObjectTrailOutput } from '@/ai/flows/analyze-object-trail-flow';
import { TrailAnalysisReport } from './TrailAnalysisReport';
import { useAnalyzedEvents } from '@/contexts/AnalyzedEventsContext';
import { AnalysisType } from '@/lib/types';

export function TrailAnalysisForm() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null); // This will be an object URL for local preview
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeObjectTrailOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const { addAnalyzedEvent } = useAnalyzedEvents();

  const resetFormState = () => {
    setVideoFile(null);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl); // Clean up existing object URL
    setVideoPreviewUrl(null);
    setAnalysisResult(null);
    setError(null);
    if (videoPlayerRef.current) {
      videoPlayerRef.current.src = ''; // Clear video player source
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    resetFormState();
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit for trail analysis videos
        toast({ title: "Video file too large", description: "Please select a video smaller than 50MB.", variant: "destructive" });
        return;
      }
      if (!selectedFile.type.startsWith('video/')) {
        toast({ title: "Unsupported file type", description: "Please select a video file (MP4, MOV, WebM, etc.).", variant: "destructive" });
        return;
      }
      
      setVideoFile(selectedFile);
      const objectURL = URL.createObjectURL(selectedFile);
      setVideoPreviewUrl(objectURL); // Use object URL for preview
      
      toast({ title: "Video Loaded", description: "Ready for trail analysis."});
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!videoFile || !videoPreviewUrl) {
      toast({ title: "No video selected", description: "Please select a video file to analyze.", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setError(null);

    // Convert video file to Data URI for Genkit flow
    const reader = new FileReader();
    reader.readAsDataURL(videoFile);
    reader.onloadend = async () => {
        const videoDataUri = reader.result as string;
        try {
          const result = await analyzeObjectTrail({ videoDataUri: videoDataUri });
          setAnalysisResult(result);
          
          const newEventId = new Date().toISOString() + Math.random().toString(36).substring(2, 9);
          // For thumbnail, use the generated trail image if available, otherwise a placeholder
          // The trailImageUri itself from the result might be a data URI or a storage URL later
          // For now, if AI generates it, it's a data URI.
          await addAnalyzedEvent({
            id: newEventId,
            timestamp: new Date().toISOString(),
            thumbnailUrl: result.trailImageUri || `https://placehold.co/300x200.png/2c2f33/E0E7FF?text=Trail`, // Placeholder if no image
            mediaName: videoFile.name,
            analysisType: AnalysisType.TRAIL,
            analysis: result,
          });
          
          if (result.errorMessage && !result.trailImageUri) { // Error and no image
             toast({
                title: "Trail Analysis Warning",
                description: result.errorMessage,
                variant: "default", // Use default for warnings that aren't critical failures
                duration: 7000,
              });
          } else if (result.errorMessage && result.trailImageUri) { // Image generated but also a message
             toast({
                title: "Trail Analysis Completed with Notes",
                description: result.errorMessage, // Show the model's note
                variant: "default",
                duration: 7000,
              });
          }
          else {
            toast({
                title: "Trail Analysis Complete",
                description: "Trail analysis report is ready and saved.",
              });
          }

        } catch (err) {
          console.error("AI trail analysis failed:", err);
          const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during trail analysis.";
          setError(errorMessage);
          toast({
            title: "Trail Analysis Failed",
            description: errorMessage,
            variant: "destructive",
          });
        } finally {
          setIsAnalyzing(false);
        }
    };
    reader.onerror = () => {
        setError("Failed to read video file for AI submission.");
        toast({ title: "Read Error", description: "Could not process video for analysis.", variant: "destructive" });
        setIsAnalyzing(false);
    };
  };

  // Cleanup object URL when component unmounts or videoPreviewUrl changes
  useEffect(() => {
    return () => {
      if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground">
          <GitCommitHorizontal className="h-6 w-6 text-primary" />
          Upload Video for Trail Analysis
        </CardTitle>
        <CardDescription>
          Submit a video file (max 50MB). The AI will analyze movement and attempt to generate an image of the object's trail. 
          This process can take some time. Results will be saved to your dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="video-upload" className="text-sm font-medium text-foreground">
              Choose Video File
            </Label>
            <Input
              id="video-upload"
              type="file"
              accept="video/*" // General video accept
              onChange={handleFileChange}
              className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              aria-describedby="video-upload-help"
              disabled={isAnalyzing}
            />
            <p id="video-upload-help" className="mt-1 text-xs text-muted-foreground">Supported formats: MP4, MOV, WebM, etc. Max 50MB.</p>
          </div>

          {videoPreviewUrl && videoFile && (
            <div className="mt-4 p-4 border border-border rounded-md bg-muted/30 min-h-[200px] flex flex-col justify-center items-center">
              <h4 className="text-sm font-medium text-foreground mb-2 self-start">Video Preview:</h4>
              <video 
                ref={videoPlayerRef}
                src={videoPreviewUrl} 
                controls 
                className="max-h-80 w-auto rounded-md border border-border"
                data-ai-hint="video preview"
              >
                Your browser does not support the video tag.
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
            {isAnalyzing ? 'Analyzing Trail...' : 'Upload & Analyze Trail'}
          </Button>
        </form>

        {error && !isAnalyzing && (
          <div className="mt-6 p-4 bg-destructive/10 border border-destructive text-destructive rounded-md flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold">Analysis Error</h4>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {analysisResult && ( // Display report if analysis is done
          <div className="mt-8">
            <TrailAnalysisReport result={analysisResult} videoName={videoFile?.name || "Uploaded Video"} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
