'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { toast } from '@/hooks/use-toast';
import { runInitialAnalysis, findRelatedJobsAction } from '@/app/actions';
import { useHistory } from '@/context/history-context';
import type { AnalysisResult } from '@/lib/types';
import type { FormSchema } from '@/components/analysis-form';

// Dynamically import AnalysisForm to avoid SSR issues with pdfjs-dist.
// Setting ssr: false ensures this component and its heavy PDF dependencies
// are only loaded in the browser.
const AnalysisForm = dynamic(() => import('@/components/analysis-form'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] w-full items-center justify-center rounded-lg border border-dashed bg-card/50">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">Loading analysis tools...</p>
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
    const initialResult = await runInitialAnalysis(data);

    if (initialResult.success && initialResult.data) {
      const relatedJobsResult = await findRelatedJobsAction({
        targetJobTitle: data.targetJobTitle,
        targetLocation: data.targetLocation,
      });

      const fullResult: AnalysisResult = {
        ...initialResult.data,
        related_jobs: relatedJobsResult.data?.related_jobs || [],
      };

      const historyId = addHistoryItem(fullResult);
      router.push(`/analysis/${historyId}`);
    } else {
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: initialResult.error || 'An unexpected error occurred. Please try again.',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4 md:px-6">
      <div className="flex flex-col gap-8">
        <AnalysisForm onAnalyze={handleAnalysis} isLoading={isLoading} />
      </div>
    </div>
  );
}
