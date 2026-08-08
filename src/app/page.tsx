'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { toast } from '@/hooks/use-toast';
import { runInitialAnalysis, findRelatedJobsAction } from '@/app/actions';
import { useHistory } from '@/context/history-context';
import type { AnalysisResult } from '@/lib/types';
import type { FormSchema } from '@/components/analysis-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, History, Search, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AnalysisResults from '@/components/analysis-results';

// Dynamically import AnalysisForm to avoid any server-side compilation issues with heavy libraries
const AnalysisForm = dynamic(
  () => import('@/components/analysis-form').catch((err) => {
    console.error('Failed to load AnalysisForm component:', err);
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
    return { default: () => null };
  }),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] w-full items-center justify-center rounded-xl border border-dashed bg-slate-900/10 border-slate-800">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-sm text-slate-400 font-mono animate-pulse">Initializing NEXUS Engine...</p>
        </div>
      </div>
    ),
  }
);

function HomeContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisResult | null>(null);
  
  const { history, addHistoryItem } = useHistory();
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisId = searchParams.get('id');

  // React to changes in URL query parameter ?id=xxx
  useEffect(() => {
    if (analysisId) {
      const foundItem = history.find(item => item.id === analysisId);
      if (foundItem) {
        setActiveAnalysis(foundItem.result);
      } else {
        setActiveAnalysis(null);
      }
    } else {
      setActiveAnalysis(null);
    }
  }, [analysisId, history]);

  const handleAnalysis = async (data: FormSchema) => {
    setIsLoading(true);
    setActiveAnalysis(null);
    
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
        
        // Push query parameter to the URL to render matching results immediately
        router.push(`/?id=${historyId}`);
      } else {
        // Detect rate limit / quota exhaustion for a softer warning tone
        const isQuotaError = initialResult.error?.toLowerCase().includes('quota') ||
          initialResult.error?.toLowerCase().includes('rate') ||
          initialResult.error?.toLowerCase().includes('exhausted') ||
          initialResult.error?.toLowerCase().includes('free-tier');

        toast({
          variant: isQuotaError ? 'default' : 'destructive',
          title: isQuotaError ? '⚠️ API Quota Limit Reached' : 'Analysis Failed',
          description: initialResult.error || 'Check your Portkey API key and try again.',
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

  const handleBackToForm = () => {
    router.push('/');
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-4xl">
      <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Google style header banner */}
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight">Ready for your next role?</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              {activeAnalysis 
                ? 'AI Diagnostics analysis generated. Optimize your resume for matching probability.' 
                : 'Upload your resume and the target job description to get started, or head over to the real-time matching dashboard.'}
            </p>
          </div>
          
          <div className="flex justify-center gap-3">
            {activeAnalysis && (
              <Button onClick={handleBackToForm} variant="outline" className="border-slate-800 text-slate-300 hover:bg-slate-800/40">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Run New Diagnostic
              </Button>
            )}
            <Button asChild variant="outline" className="border-indigo-800 text-indigo-400 hover:bg-indigo-950/20">
              <Link href="/dashboard">Go to Job Intelligence Dashboard →</Link>
            </Button>
          </div>
        </div>

        {/* Dynamic single-page Workspace */}
        {activeAnalysis ? (
          <div className="transition-all duration-500 animate-in slide-in-from-bottom-6">
            <AnalysisResults result={activeAnalysis} />
          </div>
        ) : (
          <div className="space-y-8 transition-all duration-500">
            <AnalysisForm onAnalyze={handleAnalysis} isLoading={isLoading} />
            
            {/* Quick Access / History dashboard in the landing area */}
            {history.length > 0 && (
              <div className="max-w-2xl mx-auto space-y-3 pt-6 border-t border-slate-900/50">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <History className="h-4 w-4" />
                  Recent Searches & Diagnostics
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {history.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => router.push(`/?id=${item.id}`)}
                      className="p-3.5 rounded-xl border border-slate-850 bg-slate-900/20 hover:bg-slate-900/40 hover:border-slate-700 cursor-pointer flex items-center justify-between transition-all duration-300 group"
                    >
                      <div className="space-y-0.5 overflow-hidden pr-4">
                        <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider truncate">{item.company}</p>
                        <h5 className="font-bold text-xs text-slate-200 truncate">{item.job_title}</h5>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] shrink-0 group-hover:scale-105 transition-transform">
                        {item.result.shortlist_probability > 0 && item.result.shortlist_probability <= 1 
                          ? Math.round(item.result.shortlist_probability * 100) 
                          : Math.round(item.result.shortlist_probability)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
