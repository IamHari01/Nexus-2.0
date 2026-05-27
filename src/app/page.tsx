'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { toast } from '@/hooks/use-toast';
import { runInitialAnalysis, findRelatedJobsAction } from '@/app/actions';
import { useHistory } from '@/context/history-context';
import type { AnalysisResult } from '@/lib/types';
import type { FormSchema } from '@/components/analysis-form';

// Dynamically import AnalysisForm to avoid any server-side compilation issues with heavy libraries
const AnalysisForm = dynamic(() => import('@/components/analysis-form'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] w-full items-center justify-center rounded-lg border border-dashed bg-card/50">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">Initializing engine...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const { addHistoryItem } = useHistory();
  const router = useRouter();

  const handleAnalysis = async (data: FormSchema) => {
    setIsLoading(true);
    
    try {
      const initialResult = await runInitialAnalysis(data);

      if (initialResult.success && initialResult.data) {
        // Fetch related jobs in parallel or immediately after to enrich the result
        const relatedJobsResult = await findRelatedJobsAction({
          targetJobTitle: data.targetJobTitle,
          targetLocation: data.targetLocation,
        });

        const fullResult: AnalysisResult = {
          ...initialResult.data,
          related_jobs: relatedJobsResult.data?.related_jobs || [],
        };

        const historyId = addHistoryItem(fullResult);
        // Redirect to the dedicated analysis page for the chatbot-style reveal
        router.push(`/analysis/${historyId}`);
      } else {
        toast({
          variant: 'destructive',
          title: 'Analysis Failed',
          description: initialResult.error || 'Check your Gemini API key and try again.',
        });
        setIsLoading(false);
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'System Error',
        description: 'Something went wrong. Please refresh and try again.',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4 md:px-6">
      <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight">Ready for your next role?</h2>
          <p className="text-muted-foreground">Upload your resume and the job description to get started.</p>
        </div>
        <AnalysisForm onAnalyze={handleAnalysis} isLoading={isLoading} />
      </div>
    </div>
  );
}
