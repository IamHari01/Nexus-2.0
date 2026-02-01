'use client';

import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { runInitialAnalysis, findRelatedJobsAction } from '@/app/actions';
import AnalysisForm from '@/components/analysis-form';
import AnalysisResults from '@/components/analysis-results';
import AnalysisLoading from '@/components/analysis-loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Lightbulb } from 'lucide-react';
import type { FormSchema } from '@/components/analysis-form';
import { useHistory } from '@/context/history-context';
import type { AnalysisResult } from '@/lib/types';


export default function Home() {
  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRelatedJobs, setIsLoadingRelatedJobs] = useState(false);
  const { addHistoryItem } = useHistory();

  const handleAnalysis = async (data: FormSchema) => {
    setIsLoading(true);
    setAnalysisResult(null);

    const initialResult = await runInitialAnalysis(data);

    if (initialResult.success && initialResult.data) {
      setAnalysisResult({ ...initialResult.data, related_jobs: [] });
      addHistoryItem({
        job_title: initialResult.data.job_title,
        company: initialResult.data.company,
      });
      setIsLoading(false);
      setIsLoadingRelatedJobs(true);

      const relatedJobsResult = await findRelatedJobsAction({
        targetJobTitle: data.targetJobTitle,
        targetLocation: data.targetLocation,
      });

      if (relatedJobsResult.success && relatedJobsResult.data) {
        setAnalysisResult(prev => ({ ...prev!, related_jobs: relatedJobsResult.data!.related_jobs }));
      } else {
        // Non-blocking toast
        toast({
          variant: 'destructive',
          title: 'Could not load related jobs',
          description: relatedJobsResult.error,
        });
      }
      setIsLoadingRelatedJobs(false);

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
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-8">
          <AnalysisForm onAnalyze={handleAnalysis} isLoading={isLoading} />
        </div>

        <div className="flex flex-col gap-8">
          {isLoading ? (
            <AnalysisLoading />
          ) : analysisResult ? (
            <AnalysisResults result={analysisResult} isLoadingRelatedJobs={isLoadingRelatedJobs} />
          ) : (
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center gap-2">
                <Bot className="h-6 w-6 text-primary" />
                <CardTitle>Your AI Career Strategist</CardTitle>
              </CardHeader>
              <CardContent className="flex h-full flex-col items-center justify-center text-center p-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Lightbulb className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Unlock Your Career Potential</h3>
                  <p className="max-w-md text-muted-foreground">
                    Paste your resume and a job description to get an in-depth analysis. Identify skill gaps and receive a personalized learning path to land your dream job.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
