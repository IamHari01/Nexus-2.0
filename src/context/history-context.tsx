'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AnalysisResult } from '@/lib/types';

export interface SavedFormData {
  resumeText: string;
  jobDescription: string;
  targetJobTitle: string;
  targetLocation: string;
  careerLevel: string;
  fileName: string | null;
}

export interface HistoryItem {
  id: string;
  job_title: string;
  company: string;
  result: AnalysisResult;
}

interface HistoryContextType {
  history: HistoryItem[];
  addHistoryItem: (result: AnalysisResult) => string;
  savedFormData: SavedFormData | null;
  saveFormData: (data: SavedFormData) => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider = ({ children }: { children: ReactNode }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [savedFormData, setSavedFormData] = useState<SavedFormData | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexus_form_data');
      if (saved) {
        try {
          setSavedFormData(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse saved form data', e);
        }
      }
    }
  }, []);

  const saveFormData = (data: SavedFormData) => {
    setSavedFormData(data);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_form_data', JSON.stringify(data));
    }
  };

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
    <HistoryContext.Provider value={{ history, addHistoryItem, savedFormData, saveFormData }}>
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
