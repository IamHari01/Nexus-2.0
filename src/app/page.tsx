'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { runInitialAnalysis, findRelatedJobsAction } from '@/app/actions';
import AnalysisForm from '@/components/analysis-form';
import type { FormSchema } from '@/components/analysis-form';
import { useHistory } from '@/context/history-context';
import type { AnalysisResult } from '@/lib/types';

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
