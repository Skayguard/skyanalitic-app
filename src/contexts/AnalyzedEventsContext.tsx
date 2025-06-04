
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { AnalyzedEvent, AnalysisType } from '@/lib/types'; // Import AnalysisType
import { db } from '@/lib/firebase/config';
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
import { useToast } from '@/hooks/use-toast';

interface AnalyzedEventsContextType {
  analyzedEvents: AnalyzedEvent[];
  addAnalyzedEvent: (event: Omit<AnalyzedEvent, 'id' | 'firestoreDocId' | 'userId'> & { id: string }) => Promise<void>;
  clearAllEvents: () => Promise<void>;
  isLoading: boolean;
}

const AnalyzedEventsContext = createContext<AnalyzedEventsContextType | undefined>(undefined);

const EVENTS_COLLECTION = 'skyanalytic_analyzed_events';

export function AnalyzedEventsProvider({ children }: { children: ReactNode }) {
  const [analyzedEvents, setAnalyzedEvents] = useState<AnalyzedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();

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
        } as AnalyzedEvent; // Type assertion here
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
    const eventWithUserAndTimestamp: Omit<AnalyzedEvent, 'firestoreDocId'> & { userId: string; timestamp: Timestamp } = {
      ...eventData,
      userId: user.uid,
      timestamp: Timestamp.fromDate(new Date(eventData.timestamp)), 
    };

    try {
      const docRef = await addDoc(collection(db, EVENTS_COLLECTION), eventWithUserAndTimestamp);
      
      // Create the full event object for local state, ensuring all fields are present
      const newEventForState: AnalyzedEvent = {
        ...(eventData as Omit<AnalyzedEvent, 'id' | 'firestoreDocId' | 'userId'> & { id: string }), // Cast to ensure all base fields
        userId: user.uid, // Add userId
        firestoreDocId: docRef.id, // Add firestoreDocId
        timestamp: eventData.timestamp, // Keep ISO string for local state consistency before re-fetch
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
        description: "Não foi possível salvar sua análise na nuvem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllEvents = async () => {
    if (!user) {
      toast({
        title: "Usuário não autenticado",
        description: "Faça login para gerenciar seus eventos.",
        variant: "destructive",
      });
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
      querySnapshot.docs.forEach(docSnap => {
        batch.delete(doc(db, EVENTS_COLLECTION, docSnap.id));
      });
      await batch.commit();
      setAnalyzedEvents([]);
      toast({
        title: "Eventos Limpos",
        description: "Todos os seus eventos analisados foram removidos da nuvem.",
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
