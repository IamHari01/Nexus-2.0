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
  deleteHistoryItem: (id: string) => void;
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

      const savedHistory = localStorage.getItem('nexus_history');
      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error('Failed to parse saved history', e);
        }
      }

      // Clear the dashboard matched job feed database on fresh app load or browser reload/refresh.
      // This ensures details vanish on full reload, but are cached during client-side tab navigations.
      fetch('/api/jobs?action=clear').catch(err => {
        console.error('Failed to clear matches on boot:', err);
      });
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
      // Filter out duplicate queries with same company & job_title to avoid history cluttering
      const filtered = prevHistory.filter(
        h => !(h.job_title === result.job_title && h.company === result.company)
      );
      const newHistory = [newHistoryItem, ...filtered].slice(0, 10);
      if (typeof window !== 'undefined') {
        localStorage.setItem('nexus_history', JSON.stringify(newHistory));
      }
      return newHistory;
    });
    return newHistoryItem.id;
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prevHistory => {
      const newHistory = prevHistory.filter(item => item.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('nexus_history', JSON.stringify(newHistory));
      }
      return newHistory;
    });
  };

  return (
    <HistoryContext.Provider value={{ history, addHistoryItem, deleteHistoryItem, savedFormData, saveFormData }}>
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
