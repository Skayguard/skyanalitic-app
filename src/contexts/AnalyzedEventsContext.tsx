
'use client';

import React, {createContext, useContext, useState, useEffect, ReactNode, useCallback} from 'react';
import type {
  AnalyzedEvent,
  AnalysisType,
  AnalyzeObjectTrailOutput,
} from '@/lib/types';
import {useAuth} from './AuthContext';
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
  type Firestore,
  type FirestoreError,
} from 'firebase/firestore';
import {
  ref,
  uploadString,
  getDownloadURL,
  deleteObject,
  type FirebaseStorage,
  type FirebaseStorageError,
} from 'firebase/storage';
import {useToast as useShadcnToast} from '@/hooks/use-toast';
import {getFirebaseClient} from '@/lib/firebase/client';

interface AnalyzedEventsContextType {
  analyzedEvents: AnalyzedEvent[];
  addAnalyzedEvent: (
    event: Omit<AnalyzedEvent, 'id' | 'firestoreDocId' | 'userId'> & {id: string}
  ) => Promise<void>;
  clearAllEvents: () => Promise<void>;
  isLoading: boolean;
}

const AnalyzedEventsContext = createContext<AnalyzedEventsContextType | undefined>(
  undefined
);

const EVENTS_COLLECTION = 'skyanalytic_analyzed_events';

const uploadDataUriToStorageIfNeeded = async (
  url: string | undefined,
  userId: string,
  eventId: string,
  filename: string,
  toast: ReturnType<typeof useShadcnToast>['toast'],
  storage: FirebaseStorage
): Promise<string | undefined> => {
  if (typeof url === 'string' && url.startsWith('data:')) {
    const storagePath = `userEvents/${userId}/${eventId}/${filename}`;
    const storageRef = ref(storage, storagePath);
    try {
      await uploadString(storageRef, url, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (uploadError) {
      const firebaseStorageError = uploadError as FirebaseStorageError;
      console.error(
        `[AnalyzedEventsContext] Erro ao enviar ${filename} para Firebase Storage (eventId: ${eventId}):`,
        firebaseStorageError
      );
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
        variant: 'destructive',
        duration: 7000,
      });
      return `https://placehold.co/300x200.png?text=ErroUpload_${filename.split('.')[0]}`;
    }
  }
  return url;
};

export function AnalyzedEventsProvider({children}: {children: ReactNode}) {
  const [analyzedEvents, setAnalyzedEvents] = useState<AnalyzedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [db, setDb] = useState<Firestore | null>(null);
  const [storage, setStorage] = useState<FirebaseStorage | null>(null);
  const {user, isLoading: authIsLoading} = useAuth();
  const {toast} = useShadcnToast();

  useEffect(() => {
    const firebaseClient = getFirebaseClient();
    if (firebaseClient) {
      setDb(firebaseClient.db);
      setStorage(firebaseClient.storage);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    if (!user || !db) {
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
      const firestoreError = error as FirestoreError;
      console.error(
        '[AnalyzedEventsContext] Falha ao carregar eventos analisados do Firestore',
        firestoreError
      );
      toast({
        title: 'Erro ao Carregar Eventos',
        description: `Não foi possível buscar seus eventos salvos. Detalhe: ${firestoreError.message}`,
        variant: 'destructive',
      });
      setAnalyzedEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, db, toast]);

  useEffect(() => {
    if (!authIsLoading) {
      fetchEvents();
    }
  }, [user, authIsLoading, fetchEvents]);

  const addAnalyzedEvent = async (
    eventData: Omit<AnalyzedEvent, 'id' | 'firestoreDocId' | 'userId'> & {id: string}
  ) => {
    if (!user || !db || !storage) {
      toast({
        title: 'Usuário não autenticado ou serviço indisponível',
        description: 'Faça login e tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const newEventId = eventData.id;

    const storageThumbnailUrl = await uploadDataUriToStorageIfNeeded(
      eventData.thumbnailUrl,
      user.uid,
      newEventId,
      'thumbnail.png',
      toast,
      storage
    );

    let processedAnalysis = eventData.analysis;
    if (
      eventData.analysisType === AnalysisType.TRAIL &&
      (eventData.analysis as AnalyzeObjectTrailOutput).trailImageUri
    ) {
      const trailAnalysis = eventData.analysis as AnalyzeObjectTrailOutput;
      const storageTrailImageUri = await uploadDataUriToStorageIfNeeded(
        trailAnalysis.trailImageUri,
        user.uid,
        newEventId,
        'trailImage.png',
        toast,
        storage
      );
      processedAnalysis = {...trailAnalysis, trailImageUri: storageTrailImageUri};
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

    try {
      const docRef = await addDoc(collection(db, EVENTS_COLLECTION), eventToSave);

      const newEventForState: AnalyzedEvent = {
        ...eventData,
        id: newEventId,
        firestoreDocId: docRef.id,
        userId: user.uid,
        thumbnailUrl: storageThumbnailUrl,
        analysis: processedAnalysis,
        timestamp: eventData.timestamp,
      };

      setAnalyzedEvents(prevEvents =>
        [newEventForState, ...prevEvents].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      );

      toast({
        title: 'Evento Salvo na Nuvem',
        description: `Análise "${eventData.mediaName}" (Tipo: ${eventData.analysisType}) salva com sucesso.`,
      });
    } catch (firestoreError) {
      const fsError = firestoreError as FirestoreError;
      console.error(
        '[AnalyzedEventsContext] addAnalyzedEvent: Falha ao salvar evento analisado no Firestore:',
        fsError
      );
      toast({
        title: 'Erro ao Salvar Evento no Banco de Dados',
        description: `Não foi possível salvar sua análise na nuvem. Detalhe: ${fsError.message} (Code: ${fsError.code})`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllEvents = async () => {
    if (!user || !db || !storage) {
      toast({
        title: 'Usuário não autenticado ou serviço indisponível',
        description: 'Faça login e tente novamente.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    try {
      const q = query(collection(db, EVENTS_COLLECTION), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({title: 'Nenhum Evento', description: 'Você não possui eventos para limpar.'});
        setAnalyzedEvents([]);
        setIsLoading(false);
        return;
      }

      const batch = writeBatch(db);
      const storagePathsToDelete: string[] = [];

      querySnapshot.docs.forEach(docSnap => {
        const event = docSnap.data() as Omit<AnalyzedEvent, 'timestamp'> & {
          timestamp: Timestamp;
        };
        batch.delete(doc(db, EVENTS_COLLECTION, docSnap.id));

        const eventIdForStorage = event.id;
        if (
          event.thumbnailUrl &&
          event.thumbnailUrl.includes('firebasestorage.googleapis.com')
        ) {
          const path = `userEvents/${user.uid}/${eventIdForStorage}/thumbnail.png`;
          storagePathsToDelete.push(path);
        }
        if (event.analysisType === AnalysisType.TRAIL) {
          const trailAnalysis = event.analysis as AnalyzeObjectTrailOutput;
          if (
            trailAnalysis.trailImageUri &&
            trailAnalysis.trailImageUri.includes('firebasestorage.googleapis.com')
          ) {
            const path = `userEvents/${user.uid}/${eventIdForStorage}/trailImage.png`;
            storagePathsToDelete.push(path);
          }
        }
      });

      await batch.commit();

      for (const storagePath of [...new Set(storagePathsToDelete)]) {
        try {
          const fileRef = ref(storage, storagePath);
          await deleteObject(fileRef);
        } catch (storageError: any) {
          const fbStorageError = storageError as FirebaseStorageError;
          if (fbStorageError.code !== 'storage/object-not-found') {
            console.warn(
              `[AnalyzedEventsContext] clearAllEvents: Falha ao excluir ${storagePath} do Storage:`,
              fbStorageError
            );
            toast({
              title: 'Aviso ao Limpar Armazenamento',
              description: `Falha ao deletar ${storagePath.substring(
                storagePath.lastIndexOf('/') + 1
              )}. Pode ser necessário remover manualmente. (Code: ${fbStorageError.code})`,
              variant: 'default',
              duration: 7000,
            });
          }
        }
      }

      setAnalyzedEvents([]);
      toast({
        title: 'Eventos Limpos',
        description: 'Todos os seus eventos analisados foram removidos.',
      });
    } catch (error) {
      const genericError = error as Error & {code?: string};
      console.error(
        '[AnalyzedEventsContext] clearAllEvents: Falha ao limpar todos os eventos do Firestore ou Storage',
        genericError
      );
      toast({
        title: 'Erro ao Limpar Eventos',
        description: `Não foi possível remover seus eventos. Detalhe: ${
          genericError.message
        } ${genericError.code ? `(Code: ${genericError.code})` : ''}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnalyzedEventsContext.Provider
      value={{analyzedEvents, addAnalyzedEvent, clearAllEvents, isLoading}}
    >
      {children}
    </AnalyzedEventsContext.Provider>
  );
}

export function useAnalyzedEvents() {
  const context = useContext(AnalyzedEventsContext);
  if (context === undefined) {
    throw new Error(
      'useAnalyzedEvents deve ser usado dentro de um AnalyzedEventsProvider'
    );
  }
  return context;
}
