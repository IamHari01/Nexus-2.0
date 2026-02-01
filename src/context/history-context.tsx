'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { AnalysisResult } from '@/lib/types';

export interface HistoryItem {
  id: string;
  job_title: string;
  company: string;
  result: AnalysisResult;
}

interface HistoryContextType {
  history: HistoryItem[];
  addHistoryItem: (result: AnalysisResult) => string;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider = ({ children }: { children: ReactNode }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const addHistoryItem = (result: AnalysisResult) => {
    const newHistoryItem: HistoryItem = {
      id: `analysis-${Date.now()}`,
      job_title: result.job_title,
      company: result.company,
      result: result,
    };
    
    setHistory(prevHistory => {
      const newHistory = [newHistoryItem, ...prevHistory.filter(h => h.id !== newHistoryItem.id)].slice(0, 10);
      return newHistory;
    });
    return newHistoryItem.id;
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
