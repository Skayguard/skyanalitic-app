
import type { AnalyzeUapMediaOutput } from '@/ai/flows/analyze-uap-media';
import type { AnalyzeObjectTrailOutput } from '@/ai/flows/analyze-object-trail-flow';

export enum AnalysisType {
  UAP = 'uap',
  TRAIL = 'trail',
}

export interface AnalyzedEvent {
  id: string; 
  firestoreDocId?: string; 
  userId?: string; 
  timestamp: string; 
  thumbnailUrl?: string; 
  mediaName: string;
  analysisType: AnalysisType;
  analysis: AnalyzeUapMediaOutput | AnalyzeObjectTrailOutput; // Union type for different analysis results
}

export interface AppSettings {
  motionSensitivity: number; 
  minBrightness: number; 
  minObjectSize: number; 
  enableAutoMotionDetection: boolean; // Renomeado de enableSimulatedAutoCapture
}

export const defaultSettings: AppSettings = {
  motionSensitivity: 50,
  minBrightness: 30,
  minObjectSize: 10,
  enableAutoMotionDetection: false, // Valor padrão
};

