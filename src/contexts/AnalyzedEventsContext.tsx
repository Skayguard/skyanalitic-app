
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
  console.log(`[AnalyzedEventsContext] uploadDataUriToStorageIfNeeded: Called for eventId: ${eventId}, filename: ${filename}. URL starts with:`, typeof url === 'string' ? url.substring(0, 30) : url);
  
  if (typeof url === 'string' && url.startsWith('data:')) {
    const storagePath = `userEvents/${userId}/${eventId}/${filename}`;
    const storageRef = ref(storage, storagePath);
    try {
      console.log(`[AnalyzedEventsContext] Uploading to Storage: ${storagePath}`);
      await uploadString(storageRef, url, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);
      console.log(`[AnalyzedEventsContext] Upload successful for ${filename}. Storage URL: ${downloadURL}`);
      return downloadURL;
    } catch (uploadError) {
      console.error(`[AnalyzedEventsContext] Error uploading ${filename} to Firebase Storage (eventId: ${eventId}):`, uploadError);
      toast({
        title: `Erro no Upload de ${filename}`,
        description: (uploadError as Error).message,
        variant: "destructive",
      });
      return `https://placehold.co/300x200.png?text=ErroUpload_${filename.split('.')[0]}`; 
    }
  }
  console.log(`[AnalyzedEventsContext] uploadDataUriToStorageIfNeeded: URL for ${filename} is not a Data URI or undefined, returning as is.`);
  return url; 
};


export function AnalyzedEventsProvider({ children }: { children: ReactNode }) {
  const [analyzedEvents, setAnalyzedEvents] = useState<AnalyzedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: authIsLoading } = useAuth();
  const { toast } = useShadcnToast();

  const fetchEvents = useCallback(async () => {
    if (!user) {
      console.log('[AnalyzedEventsContext] fetchEvents: No user, clearing local events and stopping.');
      setAnalyzedEvents([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    console.log('[AnalyzedEventsContext] fetchEvents: Fetching events for user:', user.uid);
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
      console.log('[AnalyzedEventsContext] fetchEvents: Successfully fetched', eventsFromFirestore.length, 'events. First event ID if any:', eventsFromFirestore[0]?.id);
    } catch (error) {
      console.error("[AnalyzedEventsContext] Failed to load analyzed events from Firestore", error);
      toast({
        title: "Erro ao Carregar Eventos",
        description: "Não foi possível buscar seus eventos salvos. Tente novamente mais tarde.",
        variant: "destructive",
      });
      setAnalyzedEvents([]); 
    } finally {
      setIsLoading(false);
      console.log('[AnalyzedEventsContext] fetchEvents: Finished fetching events.');
    }
  }, [user, toast]);

  useEffect(() => {
    console.log('[AnalyzedEventsContext] useEffect for fetchEvents triggered. Auth isLoading:', authIsLoading, 'User present:', !!user);
    if (!authIsLoading) { 
      fetchEvents();
    }
  }, [user, authIsLoading, fetchEvents]);

  const addAnalyzedEvent = async (eventData: Omit<AnalyzedEvent, 'id' | 'firestoreDocId' | 'userId'> & { id: string }) => {
    console.log('[AnalyzedEventsContext] addAnalyzedEvent: Initiated for mediaName:', eventData.mediaName, 'with temp ID:', eventData.id);
    if (!user) {
      console.error('[AnalyzedEventsContext] addAnalyzedEvent: User not authenticated. Aborting save.');
      toast({
        title: "Usuário não autenticado",
        description: "Faça login para salvar seus eventos analisados.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true); 
    const newEventId = eventData.id; // This ID is generated by the component calling addAnalyzedEvent
    console.log('[AnalyzedEventsContext] addAnalyzedEvent: Processing event with final ID:', newEventId);

    let storageThumbnailUrl: string | undefined;
    try {
      console.log('[AnalyzedEventsContext] addAnalyzedEvent: Attempting to upload thumbnail. Original thumbnailUrl (starts with):', typeof eventData.thumbnailUrl === 'string' ? eventData.thumbnailUrl.substring(0,30) : eventData.thumbnailUrl);
      storageThumbnailUrl = await uploadDataUriToStorageIfNeeded(
        eventData.thumbnailUrl,
        user.uid,
        newEventId,
        'thumbnail.png',
        toast
      );
      console.log('[AnalyzedEventsContext] addAnalyzedEvent: Thumbnail URL after processing:', storageThumbnailUrl);
    } catch (thumbError) {
        console.error('[AnalyzedEventsContext] addAnalyzedEvent: Critical error during thumbnail upload that was not caught inside helper:', thumbError);
        storageThumbnailUrl = `https://placehold.co/300x200.png?text=ErroCriticoThumb`;
    }

    let processedAnalysis = eventData.analysis;
    if (eventData.analysisType === AnalysisType.TRAIL && (eventData.analysis as AnalyzeObjectTrailOutput).trailImageUri) {
      const trailAnalysis = eventData.analysis as AnalyzeObjectTrailOutput;
      console.log('[AnalyzedEventsContext] addAnalyzedEvent: Trail analysis detected. Attempting to upload trail image. Original trailImageUri (starts with):', typeof trailAnalysis.trailImageUri === 'string' ? trailAnalysis.trailImageUri.substring(0,30) : trailAnalysis.trailImageUri);
      try {
        const storageTrailImageUri = await uploadDataUriToStorageIfNeeded(
          trailAnalysis.trailImageUri,
          user.uid,
          newEventId,
          'trailImage.png',
          toast
        );
        console.log('[AnalyzedEventsContext] addAnalyzedEvent: Trail image URL after processing:', storageTrailImageUri);
        processedAnalysis = { ...trailAnalysis, trailImageUri: storageTrailImageUri };
      } catch (trailImgError) {
          console.error('[AnalyzedEventsContext] addAnalyzedEvent: Critical error during trail image upload:', trailImgError);
          processedAnalysis = { ...trailAnalysis, trailImageUri: `https://placehold.co/300x200.png?text=ErroCriticoTrailImg` };
      }
    }
    
    const eventToSave: Omit<AnalyzedEvent, 'firestoreDocId'> = {
      ...eventData, // contains the original string timestamp
      id: newEventId,
      userId: user.uid,
      timestamp: Timestamp.fromDate(new Date(eventData.timestamp)), // Firestore expects Timestamp
      analysisType: eventData.analysisType,
      thumbnailUrl: storageThumbnailUrl,
      analysis: processedAnalysis,
    };

    console.log('[AnalyzedEventsContext] addAnalyzedEvent: Event object prepared for Firestore:', JSON.stringify(eventToSave, (key, value) => key === "analysis" ? "{...analysisData...}" : value, 2) );


    try {
      console.log('[AnalyzedEventsContext] addAnalyzedEvent: Attempting to save to Firestore collection:', EVENTS_COLLECTION);
      const docRef = await addDoc(collection(db, EVENTS_COLLECTION), eventToSave);
      console.log('[AnalyzedEventsContext] addAnalyzedEvent: Successfully saved to Firestore. Document ID:', docRef.id);
      
      const newEventForState: AnalyzedEvent = {
        ...eventData, // Use original eventData which has string timestamp
        id: newEventId,
        firestoreDocId: docRef.id,
        userId: user.uid,
        thumbnailUrl: storageThumbnailUrl,
        analysis: processedAnalysis,
        // timestamp remains the original string from eventData
      };
      console.log('[AnalyzedEventsContext] addAnalyzedEvent: Event prepared for local state update:', JSON.stringify(newEventForState, (key, value) => key === "analysis" ? "{...analysisData...}" : value, 2));


      setAnalyzedEvents(prevEvents => {
        const updatedEvents = [newEventForState, ...prevEvents]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        console.log('[AnalyzedEventsContext] addAnalyzedEvent: Local state updated. New event count:', updatedEvents.length, 'New event ID:', newEventForState.id);
        return updatedEvents;
      });
      
       toast({
        title: "Evento Salvo na Nuvem",
        description: `Análise "${eventData.mediaName}" (${eventData.analysisType}) salva.`,
      });
    } catch (firestoreError) {
      console.error("[AnalyzedEventsContext] addAnalyzedEvent: Failed to save analyzed event to Firestore:", firestoreError);
      toast({
        title: "Erro ao Salvar Evento no Banco de Dados",
        description: `Não foi possível salvar sua análise na nuvem. Detalhe: ${(firestoreError as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log('[AnalyzedEventsContext] addAnalyzedEvent: Finished processing for event ID:', newEventId);
    }
  };

  const clearAllEvents = async () => {
    if (!user) {
      toast({ title: "Usuário não autenticado", description: "Faça login para gerenciar seus eventos.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    console.log('[AnalyzedEventsContext] clearAllEvents: Clearing events for user:', user.uid);
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
        const event = docSnap.data() as AnalyzedEvent; // Firestore data, timestamp might be Firestore Timestamp
        batch.delete(doc(db, EVENTS_COLLECTION, docSnap.id));
        
        const eventIdForStorage = event.id; // Use the 'id' field we store, which is the unique one
        if (event.thumbnailUrl && event.thumbnailUrl.includes('firebasestorage.googleapis.com')) {
            const path = `userEvents/${user.uid}/${eventIdForStorage}/thumbnail.png`;
            console.log(`[AnalyzedEventsContext] clearAllEvents: Queuing thumbnail for deletion: ${path}`);
            storagePathsToDelete.push(path);
        }
        if (event.analysisType === AnalysisType.TRAIL) {
          const trailAnalysis = event.analysis as AnalyzeObjectTrailOutput;
          if (trailAnalysis.trailImageUri && trailAnalysis.trailImageUri.includes('firebasestorage.googleapis.com')) {
            const path = `userEvents/${user.uid}/${eventIdForStorage}/trailImage.png`;
            console.log(`[AnalyzedEventsContext] clearAllEvents: Queuing trail image for deletion: ${path}`);
            storagePathsToDelete.push(path);
          }
        }
      });
      
      console.log('[AnalyzedEventsContext] clearAllEvents: Committing Firestore batch delete for', querySnapshot.docs.length, 'documents.');
      await batch.commit();

      console.log('[AnalyzedEventsContext] clearAllEvents: Deleting files from Storage. Paths count:', storagePathsToDelete.length, 'Unique paths:', [...new Set(storagePathsToDelete)].length);
      for (const storagePath of [...new Set(storagePathsToDelete)]) { 
        try {
          const fileRef = ref(storage, storagePath);
          await deleteObject(fileRef);
          console.log(`[AnalyzedEventsContext] clearAllEvents: Successfully deleted from Storage: ${storagePath}`);
        } catch (storageError: any) {
          if (storageError.code !== 'storage/object-not-found') {
            console.warn(`[AnalyzedEventsContext] clearAllEvents: Failed to delete ${storagePath} from Storage:`, storageError);
             toast({ title: "Aviso ao Limpar Armazenamento", description: `Falha ao deletar ${storagePath.substring(storagePath.lastIndexOf('/') + 1)}. Pode ser necessário remover manualmente.`, variant: "default", duration: 7000 });
          } else {
             console.log(`[AnalyzedEventsContext] clearAllEvents: File not found (already deleted or path mismatch): ${storagePath}`);
          }
        }
      }

      setAnalyzedEvents([]);
      toast({
        title: "Eventos Limpos",
        description: "Todos os seus eventos analisados foram removidos.",
      });
    } catch (error) {
      console.error("[AnalyzedEventsContext] clearAllEvents: Failed to clear all events from Firestore or Storage", error);
      toast({
        title: "Erro ao Limpar Eventos",
        description: "Não foi possível remover seus eventos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
       console.log('[AnalyzedEventsContext] clearAllEvents: Finished processing.');
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


    