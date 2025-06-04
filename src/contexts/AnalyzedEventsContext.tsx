
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { AnalyzedEvent, AnalysisType, AnalyzeUapMediaOutput, AnalyzeObjectTrailOutput } from '@/lib/types';
import { db, storage } from '@/lib/firebase/config'; // Import storage
import { useAuth } from './AuthContext';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp,
  deleteDoc,
  doc,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage"; // Import storage functions
import { useToast as useShadcnToast } from '@/hooks/use-toast'; // Renamed to avoid conflict

interface AnalyzedEventsContextType {
  analyzedEvents: AnalyzedEvent[];
  addAnalyzedEvent: (event: Omit<AnalyzedEvent, 'id' | 'firestoreDocId' | 'userId'> & { id: string }) => Promise<void>;
  clearAllEvents: () => Promise<void>;
  isLoading: boolean;
}

const AnalyzedEventsContext = createContext<AnalyzedEventsContextType | undefined>(undefined);

const EVENTS_COLLECTION = 'skyanalytic_analyzed_events';

// Helper function to upload Data URI to Firebase Storage if needed
const uploadDataUriToStorageIfNeeded = async (
  url: string | undefined,
  userId: string,
  eventId: string,
  filename: string,
  toast: ReturnType<typeof useShadcnToast>['toast'] 
): Promise<string | undefined> => {
  console.log('[DEBUG] uploadDataUriToStorageIfNeeded: Received URL (first 100 chars):', typeof url === 'string' ? url.substring(0, 100) : url);
  console.log('[DEBUG] uploadDataUriToStorageIfNeeded: URL type:', typeof url, 'Is Data URI:', typeof url === 'string' && url.startsWith('data:'));

  if (typeof url === 'string' && url.startsWith('data:')) {
    const storagePath = `userEvents/${userId}/${eventId}/${filename}`;
    const storageRef = ref(storage, storagePath);
    try {
      console.log(`[DEBUG] Uploading to Storage: ${storagePath}`);
      await uploadString(storageRef, url, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);
      console.log(`[DEBUG] Upload successful. Storage URL: ${downloadURL}`);
      return downloadURL;
    } catch (uploadError) {
      console.error(`[DEBUG] Error uploading ${filename} to Firebase Storage:`, uploadError);
      toast({
        title: `Erro no Upload de ${filename}`,
        description: (uploadError as Error).message,
        variant: "destructive",
      });
      return `https://placehold.co/300x200.png?text=ErroUpload`; // Return a placeholder on error
    }
  }
  console.log('[DEBUG] uploadDataUriToStorageIfNeeded: URL is not a Data URI or undefined, returning as is:', url);
  return url; // If not a data URI or undefined, return original
};


export function AnalyzedEventsProvider({ children }: { children: ReactNode }) {
  const [analyzedEvents, setAnalyzedEvents] = useState<AnalyzedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: authIsLoading } = useAuth();
  const { toast } = useShadcnToast();

  const fetchEvents = useCallback(async () => {
    if (!user) {
      setAnalyzedEvents([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const q = query(
        collection(db, EVENTS_COLLECTION), 
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc') 
      );
      const querySnapshot = await getDocs(q);
      const eventsFromFirestore = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          ...data,
          id: data.id, 
          firestoreDocId: docSnap.id, 
          timestamp: (data.timestamp as Timestamp).toDate().toISOString(), 
        } as AnalyzedEvent; 
      });
      setAnalyzedEvents(eventsFromFirestore);
    } catch (error) {
      console.error("Failed to load analyzed events from Firestore", error);
      toast({
        title: "Erro ao Carregar Eventos",
        description: "Não foi possível buscar seus eventos salvos. Tente novamente mais tarde.",
        variant: "destructive",
      });
      setAnalyzedEvents([]); 
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authIsLoading) { 
      fetchEvents();
    }
  }, [user, authIsLoading, fetchEvents]);

  const addAnalyzedEvent = async (eventData: Omit<AnalyzedEvent, 'id' | 'firestoreDocId' | 'userId'> & { id: string }) => {
    if (!user) {
      toast({
        title: "Usuário não autenticado",
        description: "Faça login para salvar seus eventos analisados.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true); 
    const newEventId = eventData.id; // Use the pre-generated ID

    // Upload thumbnail to Firebase Storage if it's a Data URI
    const storageThumbnailUrl = await uploadDataUriToStorageIfNeeded(
      eventData.thumbnailUrl,
      user.uid,
      newEventId,
      'thumbnail.png', // Generic name for UAP thumbnails or fallback for trail
      toast
    );

    // Process analysis data, uploading trailImageUri if it's a Trail analysis and a Data URI
    let processedAnalysis = eventData.analysis;
    if (eventData.analysisType === AnalysisType.TRAIL && (eventData.analysis as AnalyzeObjectTrailOutput).trailImageUri) {
      const trailAnalysis = eventData.analysis as AnalyzeObjectTrailOutput;
      const storageTrailImageUri = await uploadDataUriToStorageIfNeeded(
        trailAnalysis.trailImageUri,
        user.uid,
        newEventId,
        'trailImage.png',
        toast
      );
      processedAnalysis = { ...trailAnalysis, trailImageUri: storageTrailImageUri };
    }
    
    const eventToSave: Omit<AnalyzedEvent, 'firestoreDocId'> = {
      ...eventData,
      id: newEventId,
      userId: user.uid,
      timestamp: Timestamp.fromDate(new Date(eventData.timestamp)) as any, // Firestore expects Timestamp
      analysisType: eventData.analysisType,
      thumbnailUrl: storageThumbnailUrl,
      analysis: processedAnalysis,
    };

    console.log('[DEBUG] Attempting to save to Firestore. Thumbnail URL:', eventToSave.thumbnailUrl);
    if (eventToSave.analysisType === AnalysisType.TRAIL) {
      console.log('[DEBUG] Trail Analysis - Trail Image URL:', (eventToSave.analysis as AnalyzeObjectTrailOutput).trailImageUri);
    }


    try {
      const docRef = await addDoc(collection(db, EVENTS_COLLECTION), eventToSave);
      
      const newEventForState: AnalyzedEvent = {
        ...eventToSave,
        firestoreDocId: docRef.id,
        timestamp: eventData.timestamp, // Keep ISO string for local state consistency
      };

      setAnalyzedEvents(prevEvents => 
        [newEventForState, ...prevEvents]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) 
      );
       toast({
        title: "Evento Salvo",
        description: `Sua análise do tipo "${eventData.analysisType}" foi salva com sucesso.`,
      });
    } catch (error) {
      console.error("Failed to save analyzed event to Firestore", error);
      toast({
        title: "Erro ao Salvar Evento",
        description: `Não foi possível salvar sua análise na nuvem. Detalhe: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllEvents = async () => {
    if (!user) {
      toast({ title: "Usuário não autenticado", description: "Faça login para gerenciar seus eventos.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const q = query(collection(db, EVENTS_COLLECTION), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast({ title: "Nenhum Evento", description: "Você não possui eventos para limpar." });
        setAnalyzedEvents([]);
        setIsLoading(false);
        return;
      }

      const batch = writeBatch(db);
      const storagePathsToDelete: string[] = [];

      querySnapshot.docs.forEach(docSnap => {
        const event = docSnap.data() as AnalyzedEvent;
        batch.delete(doc(db, EVENTS_COLLECTION, docSnap.id));
        
        // Collect paths for storage deletion
        const eventIdForStorage = event.id; 
        if (event.thumbnailUrl && event.thumbnailUrl.includes('firebasestorage.googleapis.com')) {
            storagePathsToDelete.push(`userEvents/${user.uid}/${eventIdForStorage}/thumbnail.png`);
            // Also try common name for trail if it happens to be in thumbnail
             if (event.analysisType === AnalysisType.TRAIL) {
                 storagePathsToDelete.push(`userEvents/${user.uid}/${eventIdForStorage}/trailImage.png`);
             }
        }
        if (event.analysisType === AnalysisType.TRAIL) {
          const trailAnalysis = event.analysis as AnalyzeObjectTrailOutput;
          if (trailAnalysis.trailImageUri && trailAnalysis.trailImageUri.includes('firebasestorage.googleapis.com')) {
            storagePathsToDelete.push(`userEvents/${user.uid}/${eventIdForStorage}/trailImage.png`);
          }
        }
      });
      
      await batch.commit();

      // Delete from Storage
      for (const storagePath of [...new Set(storagePathsToDelete)]) { // Deduplicate paths
        try {
          const fileRef = ref(storage, storagePath);
          await deleteObject(fileRef);
          console.log(`[DEBUG] Deleted from Storage: ${storagePath}`);
        } catch (storageError: any) {
          // Log non-critical errors (e.g., file not found if already deleted or path incorrect)
          if (storageError.code !== 'storage/object-not-found') {
            console.warn(`[DEBUG] Failed to delete ${storagePath} from Storage:`, storageError);
          }
        }
      }

      setAnalyzedEvents([]);
      toast({
        title: "Eventos Limpos",
        description: "Todos os seus eventos analisados foram removidos da nuvem e do armazenamento.",
      });
    } catch (error) {
      console.error("Failed to clear all events from Firestore", error);
      toast({
        title: "Erro ao Limpar Eventos",
        description: "Não foi possível remover seus eventos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AnalyzedEventsContext.Provider value={{ analyzedEvents, addAnalyzedEvent, clearAllEvents, isLoading }}>
      {children}
    </AnalyzedEventsContext.Provider>
  );
}

export function useAnalyzedEvents() {
  const context = useContext(AnalyzedEventsContext);
  if (context === undefined) {
    throw new Error('useAnalyzedEvents must be used within an AnalyzedEventsProvider');
  }
  return context;
}
