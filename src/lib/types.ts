
import type { AnalyzeUapMediaOutput } from '@/ai/flows/analyze-uap-media';

export interface AnalyzedEvent {
  id: string; // Client-generated unique ID, also used for URL routing
  firestoreDocId?: string; // Firestore document ID, populated after saving
  userId?: string; // UID of the Firebase authenticated user, added before saving to Firestore
  timestamp: string; // ISO string for client-side use, converted to Firestore Timestamp for storage
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
