
'use client';

import React, { useState, ChangeEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud, Loader2, AlertTriangle, FileCheck2, Film, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeUapMedia, type AnalyzeUapMediaOutput } from '@/ai/flows/analyze-uap-media';
import { useAnalyzedEvents } from '@/contexts/AnalyzedEventsContext';
import { AnalysisReport } from './AnalysisReport';
import { AnalysisType } from '@/lib/types'; 

export function FileUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeUapMediaOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { addAnalyzedEvent } = useAnalyzedEvents();

  const [isExtractingFrame, setIsExtractingFrame] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const resetFormState = () => {
    setFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setError(null);
    setIsExtractingFrame(false);
    if (videoRef.current) {
      if (videoRef.current.src && videoRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(videoRef.current.src);
      }
      videoRef.current.src = ''; 
      if (videoRef.current.srcObject) { 
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  };

  const extractFrameFromVideo = (videoFile: File, timeInSeconds: number = 1): Promise<string> => {
    return new Promise((resolve, reject) => {
      const videoElement = videoRef.current;
      const canvasElement = canvasRef.current;

      if (!videoElement || !canvasElement) {
        reject(new Error("Video/canvas elements not found for extraction."));
        return;
      }

      const objectURL = URL.createObjectURL(videoFile);

      const cleanup = () => {
        URL.revokeObjectURL(objectURL);
        if (videoElement) {
            videoElement.onloadeddata = null;
            videoElement.onseeked = null;
            videoElement.onerror = null;
            videoElement.src = ''; 
        }
      };

      videoElement.onloadeddata = () => {
        const duration = videoElement.duration;
        let effectiveTimeInSeconds = timeInSeconds;

        if (!isFinite(duration) || duration <= 0) {
          effectiveTimeInSeconds = 0.1; // Try a very small positive time if duration is invalid
        } else if (timeInSeconds >= duration) {
          effectiveTimeInSeconds = Math.max(0.1, duration / 2); // Seek to middle if requested time is beyond duration
        } else {
          effectiveTimeInSeconds = Math.max(0.1, timeInSeconds); // Ensure time is positive
        }
        videoElement.currentTime = effectiveTimeInSeconds;
      };

      videoElement.onseeked = () => {
        const context = canvasElement.getContext('2d');
        if (context) {
          canvasElement.width = videoElement.videoWidth;
          canvasElement.height = videoElement.videoHeight;
          context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
          const frameDataUri = canvasElement.toDataURL('image/png'); // Use PNG for better quality thumbnails
          resolve(frameDataUri);
        } else {
          reject(new Error("Could not get canvas context to extract frame."));
        }
        cleanup();
      };

      videoElement.onerror = (e) => {
        console.error("Video element error:", videoElement.error, e);
        let errorMsg = "Could not load or process the video for frame extraction.";
        if (videoElement.error) {
            switch(videoElement.error.code) {
                case MediaError.MEDIA_ERR_ABORTED: errorMsg = "Video loading (for extraction) aborted."; break;
                case MediaError.MEDIA_ERR_NETWORK: errorMsg = "Network error during video loading (for extraction)."; break;
                case MediaError.MEDIA_ERR_DECODE: errorMsg = `Error decoding video (for extraction). Format or codec "${videoFile.type}" might not be supported or file is corrupt.`; break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMsg = `Video format ("${videoFile.type}") not supported by browser for frame extraction.`; break;
                default: errorMsg = `Unknown error loading video for extraction (code: ${videoElement.error.code}).`;
            }
            if (videoElement.error.message && videoElement.error.message.trim() !== "") {
                 errorMsg += ` Detail: ${videoElement.error.message}`;
            } else if (videoElement.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
                errorMsg += ` The browser could not process the provided video file. Ensure it's a common video format and not corrupted.`;
            }
        }
        reject(new Error(errorMsg));
        cleanup();
      };
      
      videoElement.src = objectURL; // Use object URL for better performance with larger files
    });
  };


  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    resetFormState(); 
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      if (selectedFile.size > 20 * 1024 * 1024) { // 20MB limit
        toast({ title: "File too large", description: "Please select a file smaller than 20MB.", variant: "destructive" });
        return;
      }
      setFile(selectedFile);

      if (selectedFile.type.startsWith('video/')) {
        setIsExtractingFrame(true);
        setError(null);
        try {
          toast({ title: "Processing Video", description: "Extracting a frame for preview and analysis..." });
          const frame = await extractFrameFromVideo(selectedFile, 1); // Extract frame from 1s mark
          setPreviewUrl(frame); // This is a data URI of the PNG frame
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while extracting frame.";
          console.error("Error extracting frame:", err);
          setError(errorMessage);
          toast({ title: "Frame Extraction Failed", description: errorMessage, variant: "destructive", duration: 7000 });
          setFile(null); // Clear the file if frame extraction fails
          setPreviewUrl(null);
        } finally {
          setIsExtractingFrame(false);
        }
      } else if (selectedFile.type.startsWith('image/')) {
        setError(null);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string); // This is a data URI of the image
        };
        reader.onerror = () => {
            const imageError = "Failed to read image file.";
            setError(imageError);
            toast({ title: "Image Error", description: imageError, variant: "destructive" });
            setFile(null);
            setPreviewUrl(null);
        }
        reader.readAsDataURL(selectedFile);
      } else {
        const typeError = "Unsupported file type. Please select an image or video file.";
        setError(typeError);
        toast({ title: "Invalid File Type", description: typeError, variant: "destructive" });
        setFile(null);
        setPreviewUrl(null);
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast({ title: "No file selected", description: "Please select a file to analyze.", variant: "destructive" });
      return;
    }
    if (isExtractingFrame) {
      toast({ title: "Please wait", description: "Video frame extraction in progress.", variant: "default" });
      return;
    }
    if (error) { // If there was an error during file processing/frame extraction
        toast({ title: "Cannot Analyze", description: `Please fix the previous error before proceeding: ${error}`, variant: "destructive", duration: 7000});
        return;
    }
    if (!previewUrl) { // This implies frame/image processing failed or didn't complete
        toast({ title: "Media not ready", description: "Media preview is not ready for analysis. Check for errors or try re-selecting the file.", variant: "destructive" });
        return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    // setError(null); // Keep previous file-related error if any, until a new file is chosen

    try {
      // The previewUrl (data URI of an image/frame) is sent for analysis
      const result = await analyzeUapMedia({ mediaDataUri: previewUrl });
      setAnalysisResult(result);
      const newEventId = new Date().toISOString() + Math.random().toString(36).substring(2, 9);
      
      // Add to context/Firestore
      await addAnalyzedEvent({
        id: newEventId, // Pass the generated ID
        timestamp: new Date().toISOString(),
        thumbnailUrl: previewUrl, // Use the generated frame/image data URI as thumbnail
        mediaName: file.name,
        analysisType: AnalysisType.UAP,
        analysis: result,
      });
      toast({
        title: "Analysis Complete",
        description: `UAP Probability: ${(result.probabilityOfGenuineUapEvent * 100).toFixed(1)}%`,
      });
    } catch (err) {
      console.error("AI Analysis failed:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during AI analysis.";
      setError(errorMessage); // Set error for display
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="w-full shadow-xl border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground">
          <UploadCloud className="h-6 w-6 text-primary" />
          Upload Evidence for UAP Analysis
        </CardTitle>
        <CardDescription>
          Submit a video or photo (max 20MB). A PNG frame will be extracted from videos for analysis and preview.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Hidden video and canvas elements for frame extraction */}
        <video ref={videoRef} style={{ display: 'none' }} crossOrigin="anonymous" muted playsInline preload="metadata" />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="file-upload" className="text-sm font-medium text-foreground">
              Choose File
            </Label>
            <Input
              id="file-upload"
              type="file"
              accept="image/*,video/mp4,video/quicktime,video/webm" // More specific common video types
              onChange={handleFileChange}
              className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              aria-describedby="file-upload-help"
              disabled={isExtractingFrame || isAnalyzing}
            />
            <p id="file-upload-help" className="mt-1 text-xs text-muted-foreground">Common video formats: MP4, MOV, WebM. Images: JPG, PNG. Max 20MB.</p>
          </div>

          {file && (
            <div className="mt-4 p-4 border border-border rounded-md bg-muted/30 min-h-[150px] flex flex-col justify-center items-center">
              <h4 className="text-sm font-medium text-foreground mb-2 self-start">Preview:</h4>
              {isExtractingFrame && file.type.startsWith('video/') && (
                <div className="flex flex-col items-center text-muted-foreground">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
                  <p>Extracting frame from video...</p>
                  <Film className="h-8 w-8 mt-1" />
                </div>
              )}
              {!isExtractingFrame && previewUrl && ( // Show preview if available and not extracting
                <img
                  src={previewUrl}
                  alt="File preview"
                  className="max-h-60 w-auto rounded-md border border-border"
                  data-ai-hint={file.type.startsWith('video/') ? "video still frame" : "uploaded image"}
                />
              )}
              {!isExtractingFrame && !previewUrl && file.type.startsWith('video/') && !error && (
                 <div className="flex flex-col items-center text-muted-foreground">
                    <Film className="h-10 w-10 mb-2" />
                    <p>Ready to extract video frame.</p>
                 </div>
              )}
               {!isExtractingFrame && !previewUrl && file.type.startsWith('image/') && !error &&(
                 <div className="flex flex-col items-center text-muted-foreground">
                    <ImageIcon className="h-10 w-10 mb-2" />
                    <p>Processing image...</p>
                 </div>
              )}
              {/* Display error directly in preview area if it occurred and there's no analysis result yet */}
              {!isExtractingFrame && error && !analysisResult && (
                 <div className="flex flex-col items-center text-destructive p-2 text-center">
                    <AlertTriangle className="h-10 w-10 mb-2" />
                    <p className="text-sm font-semibold">Preview Failed</p>
                    <p className="text-xs">{error}</p>
                 </div>
              )}
            </div>
          )}

          <Button type="submit" disabled={!file || isAnalyzing || isExtractingFrame || (!!error && !previewUrl)} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            {isAnalyzing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isExtractingFrame ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="mr-2 h-4 w-4" />
            )}
            {isAnalyzing ? 'Analyzing...' : isExtractingFrame ? 'Processing Video...' : 'Upload & Analyze'}
          </Button>
        </form>

        {/* Display error below form if analysis is not running, AND (there is an analysis result OR no preview could be generated) */}
        {error && !isAnalyzing && (analysisResult || !previewUrl) && (
          <div className="mt-6 p-4 bg-destructive/10 border border-destructive text-destructive rounded-md flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold">Error</h4>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {analysisResult && !error && ( // Only show report if there was no preceding file error
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
              <FileCheck2 className="h-6 w-6 text-green-400"/>
              Analysis Report
            </h3>
            <AnalysisReport analysis={analysisResult} mediaName={file?.name || "Uploaded Media"} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
