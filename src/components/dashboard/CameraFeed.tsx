
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Camera, Zap, Loader2, SwitchCamera, AlertTriangle, Waves, Videotape } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeUapMedia, type AnalyzeUapMediaOutput } from '@/ai/flows/analyze-uap-media';
import { useAnalyzedEvents } from '@/contexts/AnalyzedEventsContext';
import { useSettings } from '@/contexts/SettingsContext';
import { AnalysisType } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function CameraFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); 
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null); 
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingCapture, setIsProcessingCapture] = useState(false);
  const { toast } = useToast();
  const { addAnalyzedEvent } = useAnalyzedEvents();
  const { settings, isLoading: isLoadingSettings } = useSettings();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const analysisResultForArtifacts = useRef<AnalyzeUapMediaOutput | null>(null); // To store analysis for artifact generation

  const [currentFacingMode, setCurrentFacingMode] = useState<'environment' | 'user'>('environment');
  const [videoDeviceCount, setVideoDeviceCount] = useState(0);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  // Auto motion detection related states and refs
  const autoDetectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFrameDataRef = useRef<ImageData | null>(null);
  const [isAutoDetectingActive, setIsAutoDetectingActive] = useState<boolean>(false);
  const captureCooldownRef = useRef<boolean>(false); // Cooldown flag
  const [isCaptureCooldownActive, setIsCaptureCooldownActive] = useState(false); // For UI indication
  const [boundingBox, setBoundingBox] = useState<BoundingBox | null>(null);
  const lastBoundingBoxTimeRef = useRef<number>(0); // Timestamp of the last bounding box detection


  // Utility to trigger file download
  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const stopCurrentStreamAndRecorder = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null; // Important to prevent old onstop from firing
      mediaRecorderRef.current.stop();
    }
    recordedChunksRef.current = []; // Clear any previously recorded data
    setIsCameraActive(false); // Set camera to inactive
  }, []);

  // Stop auto-detection logic
  const stopAutoDetectionLogic = useCallback(() => {
    if (autoDetectionIntervalRef.current) {
      clearInterval(autoDetectionIntervalRef.current);
      autoDetectionIntervalRef.current = null;
    }
    setIsAutoDetectingActive(false);
    lastFrameDataRef.current = null; // Clear last frame
    setBoundingBox(null); // Clear bounding box from UI
  }, []);
  
  // Initialize or re-initialize the camera
  const initializeCamera = useCallback(async () => {
    stopCurrentStreamAndRecorder();
    stopAutoDetectionLogic(); // Ensure auto-detection is stopped before re-initializing
    setError(null);
    setIsSwitchingCamera(true); // Indicate camera switching is in progress

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera access not supported by this browser.");
      setVideoDeviceCount(0);
      setIsSwitchingCamera(false);
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setVideoDeviceCount(videoDevices.length);

      if (videoDevices.length === 0) {
        setError("No camera found.");
        setIsSwitchingCamera(false);
        return;
      }

      // Basic constraints, attempt with facingMode if multiple cameras
      const constraints: MediaStreamConstraints = { video: { width: { ideal: 1280 }, height: { ideal: 720 } } };
      if (videoDevices.length > 0) { // Only set facingMode if cameras are available
         (constraints.video as MediaTrackConstraints).facingMode = currentFacingMode;
      }
      
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        // Fallback if facingMode fails (e.g., on desktops or single-camera devices)
        console.warn(`Failed to get camera with facingMode: ${currentFacingMode}. Attempting fallback.`, err);
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } }); 
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
            // Ensure video is playing before setting active, for dimensions
            videoRef.current?.play().catch(e => console.warn("Video play interrupted or failed on load:", e));
            setIsCameraActive(true);
            setError(null); // Clear previous errors
            // Set overlay canvas dimensions once video metadata is loaded
            if (overlayCanvasRef.current && videoRef.current) { 
                overlayCanvasRef.current.width = videoRef.current.videoWidth;
                overlayCanvasRef.current.height = videoRef.current.videoHeight;
            }
        };
        
        // Setup MediaRecorder
        const mimeTypes = ['video/webm; codecs=vp9', 'video/webm; codecs=vp8', 'video/webm', 'video/mp4'];
        let chosenMimeType: string | undefined;
        for (const mimeType of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mimeType)) {
            chosenMimeType = mimeType;
            break;
          }
        }

        if (chosenMimeType) {
          mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: chosenMimeType });
          mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) recordedChunksRef.current.push(event.data);
          };
          // onstop is handled in handleCaptureAndAnalyze
        } else {
          toast({ title: "Video Recording", description: "Video format for recording not supported.", variant: "destructive" });
          mediaRecorderRef.current = null;
        }
      }
    } catch (err) {
      let errorMessage = "Could not access camera. Check permissions.";
      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") errorMessage = "Camera permission denied.";
        else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") errorMessage = `No camera found for mode '${currentFacingMode}'.`;
        else if (err.name === "NotReadableError" || err.name === "TrackStartError" || err.name === "OverconstrainedError") errorMessage = "Camera in use or doesn't support settings.";
        else errorMessage = `Error accessing camera: ${err.message}`;
      }
      setError(errorMessage);
      setIsCameraActive(false); // Ensure camera is marked inactive on error
    } finally {
        setIsSwitchingCamera(false); // Done switching/initializing
    }
  }, [currentFacingMode, toast, stopCurrentStreamAndRecorder, stopAutoDetectionLogic]); // Dependencies for re-initialization

  // Effect to initialize camera on mount and when currentFacingMode changes
  useEffect(() => {
    initializeCamera();
    // Cleanup on unmount
    return () => {
      stopCurrentStreamAndRecorder();
      stopAutoDetectionLogic(); // Also clear auto-detection interval
    };
  }, [initializeCamera]); // Rerun only when initializeCamera function reference changes (due to its deps)

  const handleSwitchCamera = () => {
    if (videoDeviceCount < 2 && !isSwitchingCamera) { // Only show toast if not already switching
      toast({ title: "Switch Camera", description: "No other camera available." });
      return;
    }
    if (isSwitchingCamera) return; // Prevent multiple switches
    setCurrentFacingMode(prevMode => prevMode === 'environment' ? 'user' : 'environment');
  };

  const extractFrameAndDownload = async (videoElement: HTMLVideoElement, time: number, fileName: string, canvasElement: HTMLCanvasElement) => {
    return new Promise<void>((resolve, reject) => {
      const onSeekedOrLoaded = () => {
        // Remove listeners to prevent multiple calls
        videoElement.removeEventListener('seeked', onSeekedOrLoaded);
        videoElement.removeEventListener('loadeddata', onSeekedOrLoaded); 

        const context = canvasElement.getContext('2d');
        if (context) {
          canvasElement.width = videoElement.videoWidth;
          canvasElement.height = videoElement.videoHeight;
          context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
          canvasElement.toBlob((blob) => {
            if (blob) { triggerDownload(blob, fileName); resolve(); }
            else { reject(new Error("Failed to create frame blob.")); }
          }, 'image/png');
        } else { reject(new Error("Failed to get canvas context for extraction.")); }
      };

      videoElement.addEventListener('seeked', onSeekedOrLoaded);
      videoElement.addEventListener('loadeddata', onSeekedOrLoaded); // Also listen to loadeddata for videos that load fast

      // If video is already ready and seekable
      if (videoElement.readyState >= videoElement.HAVE_METADATA) { // HAVE_METADATA means duration and dimensions are known
        videoElement.currentTime = time;
        // For some browsers/videos, seeked event might not fire if currentTime is already set.
        // If readyState is high enough, directly call the handler.
        if (videoElement.currentTime === time) { // Ensure currentTime was set
            if(videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) { // HAVE_CURRENT_DATA means frame at currentTime is available
                onSeekedOrLoaded();
            }
        }
      } 
      // else: onloadeddata will handle setting currentTime once metadata is loaded.
      videoElement.onerror = () => reject(new Error("Video element error during frame extraction."));
    });
  };

  const generateAndDownloadArtifacts = async (videoBlob: Blob, analysisData: AnalyzeUapMediaOutput, baseFileName: string, originalCaptureTimestamp: string, eventId: string) => {
    if (!canvasRef.current) { 
      toast({ title: "Artifact Error", description: "Analysis canvas reference not found.", variant: "destructive" });
      return;
    }
    const canvasForArtifacts = canvasRef.current; // Use the existing analysis canvas
    // Create a temporary video element to play the recorded blob for frame extraction
    const tempVideoEl = document.createElement('video');
    tempVideoEl.crossOrigin = "anonymous"; // Important for toBlob/toDataURL if source is different (not relevant here but good practice)
    tempVideoEl.src = URL.createObjectURL(videoBlob);
    tempVideoEl.muted = true; tempVideoEl.preload = 'metadata';

    // Wait for video metadata to load to ensure duration and dimensions are available
    await new Promise<void>((resolve, reject) => {
        tempVideoEl.onloadedmetadata = () => {
            // Attempt a play/pause to ensure the video is 'seekable' on all platforms
            tempVideoEl.play().then(() => {
                tempVideoEl.pause();
                resolve();
            }).catch(e => {
                console.warn("Play-pause for 'seekability' failed (ignorable on some systems):", e);
                resolve(); // Resolve anyway, seeking might still work
            });
        };
        tempVideoEl.onerror = (e) => {
            console.error("Error loading temporary video for artifacts:", e, tempVideoEl.error);
            reject(new Error(`Failed to load recorded video for artifacts. Code: ${tempVideoEl.error?.code}`));
        };
        tempVideoEl.load(); // Start loading the video
    });
    
    try {
      await extractFrameAndDownload(tempVideoEl, 0.1, `${baseFileName}_photo.png`, canvasForArtifacts); // Extract from near start
      toast({ title: "Photo Extracted", description: "1 photo has been downloaded.", duration: 3000 });
    } catch (e) {
      toast({ title: "Photo Extraction Error", description: (e as Error).message, variant: "destructive" });
    } finally { URL.revokeObjectURL(tempVideoEl.src); /* Clean up object URL */ }
    // Generate TXT file with technical data
    const technicalData = `SkyAnalytics - Technical Report\nID: ${eventId}\nMedia: ${baseFileName}\nTimestamp: ${new Date(originalCaptureTimestamp).toLocaleString('en-US', { timeZone: 'UTC' })} UTC\nResolution: ${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}\nBrowser: ${navigator.userAgent}\nCamera: ${currentFacingMode}\n\nApp Config:\n  Auto-Detection: ${settings.enableAutoMotionDetection}\n  Sensitivity: ${settings.motionSensitivity}%\n  Min Brightness: ${settings.minBrightness}%\n  Min Object Size: ${settings.minObjectSize}\n\nAI Analysis:\n  UAP Probability: ${(analysisData.probabilityOfGenuineUapEvent * 100).toFixed(1)}%\n  Anomaly Grade: ${analysisData.anomalyGrade}\n  Summary: ${analysisData.summary}\n  AI Technical Details: ${analysisData.technicalDetails}\n  DB Comparisons: ${analysisData.databaseComparisons}`;
    const txtBlob = new Blob([technicalData.trim()], { type: 'text/plain' });
    triggerDownload(txtBlob, `${baseFileName}_data.txt`);
    toast({ title: "Technical Data Generated", description: "TXT file downloaded.", duration: 3000 });
  };


  const handleCaptureAndAnalyze = useCallback(async (triggeredBy: 'manual' | 'auto' = 'manual') => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive || !mediaRecorderRef.current || isProcessingCapture) {
      if (triggeredBy === 'manual') {
        toast({ title: "Capture Failed", description: "Camera/MediaRecorder not ready or already processing.", variant: "destructive" });
      }
      return;
    }

    setIsProcessingCapture(true);
    setBoundingBox(null); // Clear bounding box during capture
    const video = videoRef.current; const analysisCanvas = canvasRef.current;
    // Capture initial frame for AI analysis
    analysisCanvas.width = video.videoWidth; analysisCanvas.height = video.videoHeight;
    const context = analysisCanvas.getContext('2d');
    if (!context) {
      toast({ title: "Capture Failed", description: "Analysis canvas context unavailable.", variant: "destructive" });
      setIsProcessingCapture(false); return;
    }
    context.drawImage(video, 0, 0, analysisCanvas.width, analysisCanvas.height);
    const initialFrameDataUri = analysisCanvas.toDataURL('image/jpeg'); // Use JPEG for smaller size if preferred for AI
    const captureTimestamp = new Date().toISOString(); // Consistent timestamp for event and files
    const eventId = captureTimestamp + Math.random().toString(36).substring(2, 9); // Unique event ID
    const mediaName = `SkyAnalytics_Capture_${new Date(captureTimestamp).toLocaleString('en-GB').replace(/[\/\:]/g, '-').replace(/\s/g, '_')}`;

    // Start recording
    recordedChunksRef.current = []; // Clear previous chunks
    mediaRecorderRef.current.start();
    toast({ title: "Recording Started", description: "Recording 5s video...", duration: 3000, icon: <Videotape className="h-5 w-5 text-primary"/> });

    // Define onstop behavior for MediaRecorder
    mediaRecorderRef.current.onstop = async () => {
      toast({ title: "Recording Finished", description: "Processing video...", duration: 2000 });
      const videoBlob = new Blob(recordedChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'video/webm' });
      // Optionally download the recorded video
      if (videoBlob.size > 0) triggerDownload(videoBlob, `${mediaName}_video_5s.mp4`); // Changed to mp4 for wider compatibility, though actual blob type is webm
      else toast({ title: "Recording Failed", description: "No video data recorded.", variant: "destructive"});
      // Generate other artifacts if analysis data is available
      if (analysisResultForArtifacts.current) {
        await generateAndDownloadArtifacts(videoBlob, analysisResultForArtifacts.current, mediaName, captureTimestamp, eventId);
      } else {
        toast({ title: "Artifact Generation", description: "AI analysis incomplete, artifacts may lack data.", variant: "default" });
      }
      setIsProcessingCapture(false); // Reset processing state
      analysisResultForArtifacts.current = null; // Clear stored analysis
      // If triggered by auto-detection, start cooldown
      if (settings.enableAutoMotionDetection) { // Check settings directly
        captureCooldownRef.current = true;
        setIsCaptureCooldownActive(true);
        setTimeout(() => { 
            captureCooldownRef.current = false; 
            setIsCaptureCooldownActive(false); // Update UI state for cooldown
        }, 30000); // 30-second cooldown
      }
    };

    // Stop recording after 5 seconds
    setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") mediaRecorderRef.current.stop();
    }, 5000);

    // Perform AI analysis on the initial frame
    analysisResultForArtifacts.current = null; // Reset before new analysis
    try {
      const result = await analyzeUapMedia({ mediaDataUri: initialFrameDataUri });
      analysisResultForArtifacts.current = result; // Store for artifact generation
      addAnalyzedEvent({ id: eventId, timestamp: captureTimestamp, thumbnailUrl: initialFrameDataUri, mediaName: mediaName, analysis: result, analysisType: AnalysisType.UAP });
      toast({ title: "AI Analysis Complete", description: `UAP Probability: ${(result.probabilityOfGenuineUapEvent * 100).toFixed(1)}%` });
    } catch (err) {
      analysisResultForArtifacts.current = null; // Ensure it's cleared on error
      toast({ title: "AI Analysis Failed", description: err instanceof Error ? err.message : "Unknown error.", variant: "destructive" });
      setIsProcessingCapture(false); // Ensure processing state is reset on AI error too
    }
  }, [isCameraActive, isProcessingCapture, mediaRecorderRef, canvasRef, videoRef, toast, addAnalyzedEvent, settings.enableAutoMotionDetection, settings.motionSensitivity, settings.minBrightness, settings.minObjectSize, currentFacingMode]); // Add settings dependencies

  // Process frame for motion detection
  const processFrameForMotion = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive || isProcessingCapture || captureCooldownRef.current || isLoadingSettings || !settings.enableAutoMotionDetection) {
      if (!settings.enableAutoMotionDetection) setBoundingBox(null); // Clear box if auto-detection is off
      return;
    }

    const video = videoRef.current;
    const detectionCanvas = canvasRef.current; // Re-use main canvas for detection
    const detectionCtx = detectionCanvas.getContext('2d', { willReadFrequently: true }); // For frequent getImageData
    if (!detectionCtx) return;

    // Scale down for performance
    const scaleFactor = 4; // Process at 1/4th resolution
    detectionCanvas.width = video.videoWidth / scaleFactor;
    detectionCanvas.height = video.videoHeight / scaleFactor;
    detectionCtx.drawImage(video, 0, 0, detectionCanvas.width, detectionCanvas.height);
    
    const currentFrame = detectionCtx.getImageData(0, 0, detectionCanvas.width, detectionCanvas.height);
    
    let minX = detectionCanvas.width, minY = detectionCanvas.height, maxX = 0, maxY = 0;
    let changedPixels = 0;

    if (lastFrameDataRef.current) {
      const data = currentFrame.data;
      const lastData = lastFrameDataRef.current.data;
      // Adjust sensitivity: higher value = less sensitive to minor changes
      // Lower sensitivityThreshold means more sensitive (smaller brightness diff triggers)
      const sensitivityThreshold = (100 - settings.motionSensitivity) / 100 * 70 + 5; // Range roughly 5-75. Higher user setting -> lower threshold -> more sensitive.
      const brightnessThreshold = settings.minBrightness / 100 * 255; // Pixels darker than this are ignored
      const pixelStep = 4; // Analyze every 4th pixel (in each direction effectively)

      for (let y = 0; y < detectionCanvas.height; y += pixelStep) {
        for (let x = 0; x < detectionCanvas.width; x += pixelStep) {
          const i = (y * detectionCanvas.width + x) * 4; // Index for RGBA
          // Calculate current pixel brightness (simple average)
          const r = data[i]; const g = data[i+1]; const b = data[i+2];
          const currentBrightness = (r + g + b) / 3;
          
          if (currentBrightness < brightnessThreshold) continue; // Skip dark pixels

          // Calculate last pixel brightness
          const lr = lastData[i]; const lg = lastData[i+1]; const lb = lastData[i+2];
          const lastBrightness = (lr + lg + lb) / 3;
          
          if (Math.abs(currentBrightness - lastBrightness) > sensitivityThreshold) {
            changedPixels++;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }
      // Adjust minObjectSize interpretation: higher value means more changed pixels needed
      // This is a very abstract interpretation of "size"
      const minChangedPixelsToTrigger = Math.max(5, settings.minObjectSize * (detectionCanvas.width / 250)); // Normalize based on canvas width somewhat
      
      if (changedPixels > minChangedPixelsToTrigger && maxX > minX) { // Ensure a valid box
        console.log(`Motion detected! Changed pixels: ${changedPixels}`);
        // Scale bounding box coordinates back to original video size
        const finalX = minX * scaleFactor;
        const finalY = minY * scaleFactor;
        const finalWidth = (maxX - minX) * scaleFactor;
        const finalHeight = (maxY - minY) * scaleFactor;
        
        setBoundingBox({ x: finalX, y: finalY, width: finalWidth, height: finalHeight });
        lastBoundingBoxTimeRef.current = Date.now(); // Update time of last detection
        handleCaptureAndAnalyze('auto');
      } else {
        // Clear bounding box if no motion detected for a while
        if (Date.now() - lastBoundingBoxTimeRef.current > 1000) { // 1 second delay
          setBoundingBox(null);
        }
      }
    }
    lastFrameDataRef.current = currentFrame; // Store current frame for next comparison
  }, [isCameraActive, isProcessingCapture, isLoadingSettings, settings, handleCaptureAndAnalyze]); // Include settings in dependencies

  // Effect to draw bounding box on overlay canvas
  useEffect(() => { 
    if (!overlayCanvasRef.current || !videoRef.current || !isCameraActive) {
        // Clear canvas if not active or refs not set
        const overlayCtx = overlayCanvasRef.current?.getContext('2d');
        overlayCtx?.clearRect(0, 0, overlayCanvasRef.current?.width || 0, overlayCanvasRef.current?.height || 0);
        return;
    }

    const overlayCtx = overlayCanvasRef.current.getContext('2d');
    if (!overlayCtx) return;

    // Ensure overlay canvas matches video dimensions
    if (overlayCanvasRef.current.width !== videoRef.current.videoWidth || overlayCanvasRef.current.height !== videoRef.current.videoHeight) {
        overlayCanvasRef.current.width = videoRef.current.videoWidth;
        overlayCanvasRef.current.height = videoRef.current.videoHeight;
    }
    
    overlayCtx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height); // Clear previous drawings

    if (boundingBox) {
      overlayCtx.strokeStyle = 'hsl(var(--primary))'; // Use theme's primary color
      overlayCtx.lineWidth = 3;
      overlayCtx.strokeRect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
    }
  }, [boundingBox, isCameraActive]); // Redraw when boundingBox or camera state changes


  // Start/stop auto-detection logic based on settings and camera state
  const startAutoDetectionLogic = useCallback(() => {
    if (isLoadingSettings || !isCameraActive || !settings.enableAutoMotionDetection || isProcessingCapture || autoDetectionIntervalRef.current) {
      return; // Don't start if conditions not met or already running
    }
    
    // Ensure refs are available (should be if camera is active)
    if (!videoRef.current || !canvasRef.current) return;

    setIsAutoDetectingActive(true);
    lastFrameDataRef.current = null; // Reset last frame on start
    autoDetectionIntervalRef.current = setInterval(processFrameForMotion, 500); // Check every 500ms
    console.log("Auto motion detection started.");

  }, [isLoadingSettings, isCameraActive, settings.enableAutoMotionDetection, isProcessingCapture, processFrameForMotion]);

  useEffect(() => {
    if (!isLoadingSettings && isCameraActive && settings.enableAutoMotionDetection && !isProcessingCapture) {
      startAutoDetectionLogic();
    } else {
      stopAutoDetectionLogic(); // Stop if conditions are no longer met
    }
    // Cleanup interval on component unmount or when dependencies change leading to stop
    return () => {
      stopAutoDetectionLogic();
    };
  }, [isLoadingSettings, isCameraActive, settings.enableAutoMotionDetection, isProcessingCapture, startAutoDetectionLogic, stopAutoDetectionLogic]);


  return (
    <Card className="w-full shadow-xl border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground">
          <Camera className="h-6 w-6 text-primary" />
          Live Camera Feed
        </CardTitle>
        <CardDescription>
          Real-time monitoring. Auto-detection can be enabled in settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="aspect-video bg-muted rounded-md overflow-hidden mb-4 relative border border-border">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {/* Overlay Canvas for bounding box */}
          <canvas ref={overlayCanvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
          
          {isSwitchingCamera && !error && ( // Show loader only when switching and no other error
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-2" />
                <p className="text-muted-foreground">Switching camera...</p>
            </div>
          )}
          {!isCameraActive && !error && !isSwitchingCamera && ( // Initializing state
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-2" />
              <p className="text-muted-foreground">Initializing camera...</p>
            </div>
          )}
          {error && ( // Display error overlay
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 p-4 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mb-2" />
              <p className="text-destructive-foreground font-medium">Camera Error</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              {/* Offer to switch camera if multiple are available and error is not during switching */}
              {videoDeviceCount > 1 && (
                <Button onClick={handleSwitchCamera} variant="outline" size="sm" className="mt-3">
                    <SwitchCamera className="mr-2 h-4 w-4" /> Try Other Camera
                </Button>
              )}
            </div>
          )}
          {/* Recording indicator */}
          {isCameraActive && !error && ( // Show only if camera is active and no error
            <div className="absolute bottom-2 right-2 opacity-80">
              <div className="bg-destructive text-destructive-foreground px-2 py-1 text-xs rounded-full flex items-center gap-1">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                REC
              </div>
            </div>
          )}
        </div>
        {/* Hidden canvas for frame analysis */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              onClick={() => handleCaptureAndAnalyze('manual')}
              disabled={!isCameraActive || isProcessingCapture || isSwitchingCamera || isLoadingSettings}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              aria-label="Manually Capture Frame, Record Video, and Analyze"
            >
              {isProcessingCapture ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              {isProcessingCapture ? 'Processing...' : 'Manual Capture'}
            </Button>
            
            {videoDeviceCount > 1 ? ( // Show switch camera button only if multiple devices
                 <Button 
                    onClick={handleSwitchCamera} 
                    variant="outline"
                    disabled={isSwitchingCamera || isProcessingCapture || isLoadingSettings || !isCameraActive} // Disable if not active
                    aria-label="Switch camera"
                    title="Switch Camera"
                 >
                    {isSwitchingCamera ? <Loader2 className="h-5 w-5 animate-spin" /> : <SwitchCamera className="h-5 w-5" />}
                    <span className="ml-2 hidden sm:inline">Switch Camera</span>
                 </Button>
            ) : <div /> /* Placeholder for grid layout */ }
        </div>
        
        {isProcessingCapture && (
          <div className="mt-2 text-center text-sm text-muted-foreground">
            <p>Performing AI analysis and preparing files for download...</p>
            <p>This may take a few moments.</p>
          </div>
        )}

        {/* Auto-detection status indicator */}
        {!isLoadingSettings && settings.enableAutoMotionDetection && (
          <div className={cn("mt-3 text-sm flex items-center justify-center p-2 rounded-md border", 
            isAutoDetectingActive && !isCaptureCooldownActive ? "bg-green-700/20 border-green-600 text-green-300" : 
            isCaptureCooldownActive ? "bg-amber-600/20 border-amber-500 text-amber-300" :
            "bg-muted/50 border-border text-muted-foreground"
          )}>
            <Waves className="mr-2 h-4 w-4" />
            {isAutoDetectingActive && !isCaptureCooldownActive ? 'Auto-detection ACTIVE' : 
             isCaptureCooldownActive ? 'Detection Cooldown...' : 
             'Auto-detection INACTIVE'}
          </div>
        )}
         {/* Message if auto-detection is off in settings */}
         {!isLoadingSettings && !settings.enableAutoMotionDetection && (
            <p className="mt-3 text-xs text-center text-muted-foreground">
                To enable automatic motion detection, go to <Link href="/settings" className="underline hover:text-primary">Settings</Link>.
            </p>
        )}
      </CardContent>
    </Card>
  );
}
