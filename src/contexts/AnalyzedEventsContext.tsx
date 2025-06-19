
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { AnalyzedEvent, AnalysisType, AnalyzeUapMediaOutput, AnalyzeObjectTrailOutput } from '@/lib/types';
import { db, storage } from '@/lib/firebase/config';
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
import { ref, uploadString, getDownloadURL, deleteObject, type FirebaseStorageError } from "firebase/storage"; 
import { useToast as useShadcnToast } from '@/hooks/use-toast'; 

interface AnalyzedEventsContextType {
  analyzedEvents: AnalyzedEvent[];
  addAnalyzedEvent: (event: Omit<AnalyzedEvent, 'id' | 'firestoreDocId' | 'userId'> & { id: string }) => Promise<void>;
  clearAllEvents: () => Promise<void>;
  isLoading: boolean;
}

const AnalyzedEventsContext = createContext<AnalyzedEventsContextType | undefined>(undefined);

const EVENTS_COLLECTION = 'skyanalytic_analyzed_events';

const uploadDataUriToStorageIfNeeded = async (
  url: string | undefined,
  userId: string,
  eventId: string,
  filename: string,
  toast: ReturnType<typeof useShadcnToast>['toast'] 
): Promise<string | undefined> => {
  console.log(`[AnalyzedEventsContext] uploadDataUriToStorageIfNeeded: Chamado para eventId: ${eventId}, filename: ${filename}. URL começa com:`, typeof url === 'string' ? url.substring(0, 30) : url);
  
  if (typeof url === 'string' && url.startsWith('data:')) {
    const storagePath = `userEvents/${userId}/${eventId}/${filename}`;
    const storageRef = ref(storage, storagePath);
    try {
      console.log(`[AnalyzedEventsContext] Enviando para Storage: ${storagePath}`);
      await uploadString(storageRef, url, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);
      console.log(`[AnalyzedEventsContext] Upload bem-sucedido para ${filename}. URL do Storage: ${downloadURL}`);
      return downloadURL;
    } catch (uploadError) {
      const firebaseStorageError = uploadError as FirebaseStorageError;
      console.error(`[AnalyzedEventsContext] Erro ao enviar ${filename} para Firebase Storage (eventId: ${eventId}):`, firebaseStorageError);
      let description = `Falha ao enviar ${filename}. Código: ${firebaseStorageError.code}. Mensagem: ${firebaseStorageError.message}`;
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
  console.log(`[AnalyzedEventsContext] uploadDataUriToStorageIfNeeded: URL para ${filename} não é um Data URI ou indefinido, retornando como está.`);
  return url; 
};


export function AnalyzedEventsProvider({ children }: { children: ReactNode }) {
  const [analyzedEvents, setAnalyzedEvents] = useState<AnalyzedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: authIsLoading } = useAuth();
  const { toast } = useShadcnToast();

  const fetchEvents = useCallback(async () => {
    if (!user) {
      console.log('[AnalyzedEventsContext] fetchEvents: Nenhum usuário, limpando eventos locais e parando.');
      setAnalyzedEvents([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    console.log('[AnalyzedEventsContext] fetchEvents: Buscando eventos para usuário:', user.uid);
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
      console.log('[AnalyzedEventsContext] fetchEvents: Buscou com sucesso', eventsFromFirestore.length, 'eventos. ID do primeiro evento (se houver):', eventsFromFirestore[0]?.id);
    } catch (error) {
      const firestoreError = error as FirestoreError;
      console.error("[AnalyzedEventsContext] Falha ao carregar eventos analisados do Firestore", firestoreError);
      toast({
        title: "Erro ao Carregar Eventos",
        description: `Não foi possível buscar seus eventos salvos. Detalhe: ${firestoreError.message}`,
        variant: "destructive",
      });
      setAnalyzedEvents([]); 
    } finally {
      setIsLoading(false);
      console.log('[AnalyzedEventsContext] fetchEvents: Concluída busca de eventos.');
    }
  }, [user, toast]);

  useEffect(() => {
    console.log('[AnalyzedEventsContext] useEffect para fetchEvents disparado. Auth isLoading:', authIsLoading, 'Usuário presente:', !!user);
    if (!authIsLoading) { 
      fetchEvents();
    }
  }, [user, authIsLoading, fetchEvents]);

  const addAnalyzedEvent = async (eventData: Omit<AnalyzedEvent, 'id' | 'firestoreDocId' | 'userId'> & { id: string }) => {
    console.log('[AnalyzedEventsContext] addAnalyzedEvent: Iniciado para mediaName:', eventData.mediaName, 'com ID temp:', eventData.id);
    if (!user) {
      console.error('[AnalyzedEventsContext] addAnalyzedEvent: Usuário não autenticado. Abortando salvamento.');
      toast({
        title: "Usuário não autenticado",
        description: "Faça login para salvar seus eventos analisados.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true); 
    const newEventId = eventData.id; 
    console.log('[AnalyzedEventsContext] addAnalyzedEvent: Processando evento com ID final:', newEventId);

    let storageThumbnailUrl: string | undefined;
    try {
      console.log('[AnalyzedEventsContext] addAnalyzedEvent: Tentando enviar miniatura. thumbnailUrl original (começa com):', typeof eventData.thumbnailUrl === 'string' ? eventData.thumbnailUrl.substring(0,30) : eventData.thumbnailUrl);
      storageThumbnailUrl = await uploadDataUriToStorageIfNeeded(
        eventData.thumbnailUrl,
        user.uid,
        newEventId,
        'thumbnail.png',
        toast
      );
      console.log('[AnalyzedEventsContext] addAnalyzedEvent: URL da miniatura após processamento:', storageThumbnailUrl);
    } catch (thumbError) {
        console.error('[AnalyzedEventsContext] addAnalyzedEvent: Erro crítico durante upload da miniatura não capturado no helper:', thumbError);
        storageThumbnailUrl = `https://placehold.co/300x200.png?text=ErroCriticoMiniatura`;
    }

    let processedAnalysis = eventData.analysis;
    if (eventData.analysisType === AnalysisType.TRAIL && (eventData.analysis as AnalyzeObjectTrailOutput).trailImageUri) {
      const trailAnalysis = eventData.analysis as AnalyzeObjectTrailOutput;
      console.log('[AnalyzedEventsContext] addAnalyzedEvent: Análise de rastro detectada. Tentando enviar imagem do rastro. trailImageUri original (começa com):', typeof trailAnalysis.trailImageUri === 'string' ? trailAnalysis.trailImageUri.substring(0,30) : trailAnalysis.trailImageUri);
      try {
        const storageTrailImageUri = await uploadDataUriToStorageIfNeeded(
          trailAnalysis.trailImageUri,
          user.uid,
          newEventId,
          'trailImage.png',
          toast
        );
        console.log('[AnalyzedEventsContext] addAnalyzedEvent: URL da imagem de rastro após processamento:', storageTrailImageUri);
        processedAnalysis = { ...trailAnalysis, trailImageUri: storageTrailImageUri };
      } catch (trailImgError) {
          console.error('[AnalyzedEventsContext] addAnalyzedEvent: Erro crítico durante upload da imagem de rastro:', trailImgError);
          processedAnalysis = { ...trailAnalysis, trailImageUri: `https://placehold.co/300x200.png?text=ErroCriticoImgRastro` };
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

    console.log('[AnalyzedEventsContext] addAnalyzedEvent: Objeto do evento preparado para Firestore:', JSON.stringify({ ...eventToSave, analysis: eventToSave.analysis ? `{...dadosDaAnalise...tipo:${eventData.analysisType}}` : null }, null, 2));

    try {
      console.log('[AnalyzedEventsContext] addAnalyzedEvent: Tentando salvar na coleção Firestore:', EVENTS_COLLECTION);
      const docRef = await addDoc(collection(db, EVENTS_COLLECTION), eventToSave);
      console.log('[AnalyzedEventsContext] addAnalyzedEvent: Salvo com sucesso no Firestore. ID do Documento:', docRef.id);
      
      const newEventForState: AnalyzedEvent = {
        ...eventData, 
        id: newEventId,
        firestoreDocId: docRef.id,
        userId: user.uid,
        thumbnailUrl: storageThumbnailUrl,
        analysis: processedAnalysis,
        timestamp: eventData.timestamp, 
      };
      console.log('[AnalyzedEventsContext] addAnalyzedEvent: Evento preparado para atualização do estado local:', JSON.stringify({ ...newEventForState, analysis: newEventForState.analysis ? `{...dadosDaAnalise...tipo:${eventData.analysisType}}` : null }, null, 2));

      setAnalyzedEvents(prevEvents => {
        const updatedEvents = [newEventForState, ...prevEvents]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        console.log('[AnalyzedEventsContext] addAnalyzedEvent: Estado local atualizado. Nova contagem de eventos:', updatedEvents.length, 'ID do novo evento:', newEventForState.id);
        return updatedEvents;
      });
      
       toast({
        title: "Evento Salvo na Nuvem",
        description: `Análise "${eventData.mediaName}" (Tipo: ${eventData.analysisType}) salva com sucesso.`,
      });
    } catch (firestoreError) {
      const fsError = firestoreError as FirestoreError;
      console.error("[AnalyzedEventsContext] addAnalyzedEvent: Falha ao salvar evento analisado no Firestore:", fsError);
      toast({
        title: "Erro ao Salvar Evento no Banco de Dados",
        description: `Não foi possível salvar sua análise na nuvem. Detalhe: ${fsError.message} (Code: ${fsError.code})`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log('[AnalyzedEventsContext] addAnalyzedEvent: Processamento concluído para o ID do evento:', newEventId);
    }
  };

  const clearAllEvents = async () => {
    if (!user) {
      toast({ title: "Usuário não autenticado", description: "Faça login para gerenciar seus eventos.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    console.log('[AnalyzedEventsContext] clearAllEvents: Limpando eventos para o usuário:', user.uid);
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
        const event = docSnap.data() as Omit<AnalyzedEvent, 'timestamp'> & { timestamp: Timestamp }; 
        batch.delete(doc(db, EVENTS_COLLECTION, docSnap.id));
        
        const eventIdForStorage = event.id; 
        if (event.thumbnailUrl && event.thumbnailUrl.includes('firebasestorage.googleapis.com')) {
            const path = `userEvents/${user.uid}/${eventIdForStorage}/thumbnail.png`;
            console.log(`[AnalyzedEventsContext] clearAllEvents: Enfileirando miniatura para exclusão: ${path}`);
            storagePathsToDelete.push(path);
        }
        if (event.analysisType === AnalysisType.TRAIL) {
          const trailAnalysis = event.analysis as AnalyzeObjectTrailOutput;
          if (trailAnalysis.trailImageUri && trailAnalysis.trailImageUri.includes('firebasestorage.googleapis.com')) {
            const path = `userEvents/${user.uid}/${eventIdForStorage}/trailImage.png`;
            console.log(`[AnalyzedEventsContext] clearAllEvents: Enfileirando imagem de rastro para exclusão: ${path}`);
            storagePathsToDelete.push(path);
          }
        }
      });
      
      console.log('[AnalyzedEventsContext] clearAllEvents: Confirmando exclusão em lote do Firestore para', querySnapshot.docs.length, 'documentos.');
      await batch.commit();

      console.log('[AnalyzedEventsContext] clearAllEvents: Excluindo arquivos do Storage. Contagem de caminhos:', storagePathsToDelete.length, 'Caminhos únicos:', [...new Set(storagePathsToDelete)].length);
      for (const storagePath of [...new Set(storagePathsToDelete)]) { 
        try {
          const fileRef = ref(storage, storagePath);
          await deleteObject(fileRef);
          console.log(`[AnalyzedEventsContext] clearAllEvents: Excluído com sucesso do Storage: ${storagePath}`);
        } catch (storageError: any) {
           const fbStorageError = storageError as FirebaseStorageError;
          if (fbStorageError.code !== 'storage/object-not-found') {
            console.warn(`[AnalyzedEventsContext] clearAllEvents: Falha ao excluir ${storagePath} do Storage:`, fbStorageError);
             toast({ title: "Aviso ao Limpar Armazenamento", description: `Falha ao deletar ${storagePath.substring(storagePath.lastIndexOf('/') + 1)}. Pode ser necessário remover manualmente. (Code: ${fbStorageError.code})`, variant: "default", duration: 7000 });
          } else {
             console.log(`[AnalyzedEventsContext] clearAllEvents: Arquivo não encontrado (já excluído ou caminho incompatível): ${storagePath}`);
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
      console.error("[AnalyzedEventsContext] clearAllEvents: Falha ao limpar todos os eventos do Firestore ou Storage", genericError);
      toast({
        title: "Erro ao Limpar Eventos",
        description: `Não foi possível remover seus eventos. Detalhe: ${genericError.message} ${genericError.code ? `(Code: ${genericError.code})` : ''}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
       console.log('[AnalyzedEventsContext] clearAllEvents: Processamento concluído.');
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
    throw new Error('useAnalyzedEvents deve ser usado dentro de um AnalyzedEventsProvider');
  }
  return context;
}
