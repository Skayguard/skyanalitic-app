
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
  writeBatch,
  type FirestoreError
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject, type FirebaseStorageError } from "firebase/storage"; // Import storage functions
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
      const firebaseStorageError = uploadError as FirebaseStorageError;
      console.error(`[AnalyzedEventsContext] Error uploading ${filename} to Firebase Storage (eventId: ${eventId}):`, firebaseStorageError);
      let description = firebaseStorageError.message;
      if (firebaseStorageError.code === 'storage/retry-limit-exceeded') {
        description = `O upload de ${filename} falhou após múltiplas tentativas. Verifique sua conexão de rede e tente novamente. (${firebaseStorageError.message})`;
      } else if (firebaseStorageError.code === 'storage/unauthorized') {
        description = `Você não tem permissão para enviar ${filename}. Verifique as regras do Storage e CORS. (${firebaseStorageError.message})`;
      } else if (firebaseStorageError.code === 'storage/canceled') {
        description = `O upload de ${filename} foi cancelado. (${firebaseStorageError.message})`;
      }
      
      toast({
        title: `Erro no Upload de ${filename}`,
        description: description,
        variant: "destructive",
        duration: 7000,
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
      const firestoreError = error as FirestoreError;
      console.error("[AnalyzedEventsContext] Failed to load analyzed events from Firestore", firestoreError);
      toast({
        title: "Erro ao Carregar Eventos",
        description: `Não foi possível buscar seus eventos salvos. Detalhe: ${firestoreError.message}`,
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
    const newEventId = eventData.id; 
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
      ...eventData,
      id: newEventId,
      userId: user.uid,
      timestamp: Timestamp.fromDate(new Date(eventData.timestamp)), 
      analysisType: eventData.analysisType,
      thumbnailUrl: storageThumbnailUrl,
      analysis: processedAnalysis,
    };

    console.log('[AnalyzedEventsContext] addAnalyzedEvent: Event object prepared for Firestore:', JSON.stringify({ ...eventToSave, analysis: eventToSave.analysis ? "{...analysisData...}" : null }, null, 2));


    try {
      console.log('[AnalyzedEventsContext] addAnalyzedEvent: Attempting to save to Firestore collection:', EVENTS_COLLECTION);
      const docRef = await addDoc(collection(db, EVENTS_COLLECTION), eventToSave);
      console.log('[AnalyzedEventsContext] addAnalyzedEvent: Successfully saved to Firestore. Document ID:', docRef.id);
      
      const newEventForState: AnalyzedEvent = {
        ...eventData, 
        id: newEventId,
        firestoreDocId: docRef.id,
        userId: user.uid,
        thumbnailUrl: storageThumbnailUrl,
        analysis: processedAnalysis,
        timestamp: eventData.timestamp, // Ensure string timestamp for local state consistency
      };
      console.log('[AnalyzedEventsContext] addAnalyzedEvent: Event prepared for local state update:', JSON.stringify({ ...newEventForState, analysis: newEventForState.analysis ? "{...analysisData...}" : null }, null, 2));


      setAnalyzedEvents(prevEvents => {
        const updatedEvents = [newEventForState, ...prevEvents]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        console.log('[AnalyzedEventsContext] addAnalyzedEvent: Local state updated. New event count:', updatedEvents.length, 'New event ID:', newEventForState.id);
        return updatedEvents;
      });
      
       toast({
        title: "Evento Salvo na Nuvem",
        description: `Análise "${eventData.mediaName}" (${eventData.analysisType}) salva com sucesso.`,
      });
    } catch (firestoreError) {
      const fsError = firestoreError as FirestoreError;
      console.error("[AnalyzedEventsContext] addAnalyzedEvent: Failed to save analyzed event to Firestore:", fsError);
      toast({
        title: "Erro ao Salvar Evento no Banco de Dados",
        description: `Não foi possível salvar sua análise na nuvem. Detalhe: ${fsError.message} (Code: ${fsError.code})`,
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
        const event = docSnap.data() as Omit<AnalyzedEvent, 'timestamp'> & { timestamp: Timestamp }; // Firestore data
        batch.delete(doc(db, EVENTS_COLLECTION, docSnap.id));
        
        const eventIdForStorage = event.id; 
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
           const fbStorageError = storageError as FirebaseStorageError;
          if (fbStorageError.code !== 'storage/object-not-found') {
            console.warn(`[AnalyzedEventsContext] clearAllEvents: Failed to delete ${storagePath} from Storage:`, fbStorageError);
             toast({ title: "Aviso ao Limpar Armazenamento", description: `Falha ao deletar ${storagePath.substring(storagePath.lastIndexOf('/') + 1)}. Pode ser necessário remover manualmente. (Code: ${fbStorageError.code})`, variant: "default", duration: 7000 });
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
      const genericError = error as Error & { code?: string };
      console.error("[AnalyzedEventsContext] clearAllEvents: Failed to clear all events from Firestore or Storage", genericError);
      toast({
        title: "Erro ao Limpar Eventos",
        description: `Não foi possível remover seus eventos. Detalhe: ${genericError.message} ${genericError.code ? `(Code: ${genericError.code})` : ''}`,
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
