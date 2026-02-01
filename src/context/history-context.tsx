'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface HistoryItem {
  id: string;
  job_title: string;
  company: string;
}

interface HistoryContextType {
  history: HistoryItem[];
  addHistoryItem: (item: Omit<HistoryItem, 'id'>) => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider = ({ children }: { children: ReactNode }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const addHistoryItem = (item: Omit<HistoryItem, 'id'>) => {
    const newHistoryItem = { ...item, id: new Date().toISOString() };
    // Avoid adding duplicates
    if (!history.some(h => h.job_title === newHistoryItem.job_title && h.company === newHistoryItem.company)) {
        setHistory(prevHistory => [newHistoryItem, ...prevHistory].slice(0, 10)); // Keep last 10
    }
  };

  return (
    <HistoryContext.Provider value={{ history, addHistoryItem }}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = () => {
  const context = useContext(HistoryContext);
  if (context === undefined) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
};
