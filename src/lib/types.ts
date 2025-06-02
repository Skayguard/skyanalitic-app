import type { AnalyzeUapMediaOutput } from '@/ai/flows/analyze-uap-media';

export interface AnalyzedEvent {
  id: string;
  timestamp: string; // ISO string
  thumbnailUrl?: string; // data URI or placeholder URL
  mediaName: string;
  analysis: AnalyzeUapMediaOutput;
}

export interface AppSettings {
  motionSensitivity: number; // 0-100
  minBrightness: number; // 0-100
  minObjectSize: number; // pixels or percentage
}

export const defaultSettings: AppSettings = {
  motionSensitivity: 50,
  minBrightness: 30,
  minObjectSize: 10,
};
