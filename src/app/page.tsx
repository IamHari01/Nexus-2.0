'use client';

import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { type AnalyzeResumeAgainstJobDescriptionOutput } from '@/ai/flows/ats-resume-analysis';
import { runAnalysis } from '@/app/actions';
import AnalysisForm from '@/components/analysis-form';
import AnalysisResults from '@/components/analysis-results';
import AnalysisLoading from '@/components/analysis-loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Lightbulb } from 'lucide-react';
import type { FormSchema } from '@/components/analysis-form';


export default function Home() {
  const [analysisResult, setAnalysisResult] =
    useState<AnalyzeResumeAgainstJobDescriptionOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalysis = async (data: FormSchema) => {
    setIsLoading(true);
    setAnalysisResult(null);

    const result = await runAnalysis(data);

    if (result.success && result.data) {
      setAnalysisResult(result.data);
    } else {
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: result.error || 'An unexpected error occurred. Please try again.',
      });
    }

    setIsLoading(false);
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
            <AnalysisResults result={analysisResult} />
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
