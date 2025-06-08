
import type { AnalyzeUapMediaOutput as InternalAnalyzeUapMediaOutput } from '@/ai/flows/analyze-uap-media';
import type { AnalyzeObjectTrailOutput as InternalAnalyzeObjectTrailOutput } from '@/ai/flows/analyze-object-trail-flow';

export type { InternalAnalyzeUapMediaOutput as AnalyzeUapMediaOutput };
export type { InternalAnalyzeObjectTrailOutput as AnalyzeObjectTrailOutput };

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
  analysis: InternalAnalyzeUapMediaOutput | InternalAnalyzeObjectTrailOutput; // Union type for different analysis results
}

export interface AppSettings {
  motionSensitivity: number; 
  minBrightness: number; 
  minObjectSize: number; 
}

export const defaultSettings: AppSettings = {
  motionSensitivity: 50,
  minBrightness: 30,
  minObjectSize: 10,
};

