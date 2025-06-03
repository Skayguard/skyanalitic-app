
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AnalyzedEvent } from '@/lib/types';

interface AnalyzedEventsContextType {
  analyzedEvents: AnalyzedEvent[];
  addAnalyzedEvent: (event: AnalyzedEvent) => void;
  clearAllEvents: () => void;
  isLoading: boolean;
}

const AnalyzedEventsContext = createContext<AnalyzedEventsContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'skyguard_analytic_analyzed_events';

export function AnalyzedEventsProvider({ children }: { children: ReactNode }) {
  const [analyzedEvents, setAnalyzedEvents] = useState<AnalyzedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedEvents = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedEvents) {
        setAnalyzedEvents(JSON.parse(storedEvents));
      }
    } catch (error) {
      console.error("Failed to load analyzed events from localStorage", error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) { // Only save to localStorage after initial load
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(analyzedEvents));
      } catch (error) {
        console.error("Failed to save analyzed events to localStorage", error);
      }
    }
  }, [analyzedEvents, isLoading]);

  const addAnalyzedEvent = (event: AnalyzedEvent) => {
    setAnalyzedEvents((prevEvents) => [event, ...prevEvents]);
  };

  const clearAllEvents = () => {
    setAnalyzedEvents([]);
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
