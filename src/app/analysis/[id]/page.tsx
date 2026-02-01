'use client';

import { useEffect, useState, useRef } from 'react';
import { useHistory } from '@/context/history-context';
import AnalysisResults from '@/components/analysis-results';
import { Card, CardContent } from '@/components/ui/card';
import { Frown } from 'lucide-react';
import { useParams } from 'next/navigation';
import type { AnalysisResult } from '@/lib/types';
import AnalysisLoading from '@/components/analysis-loading';

export default function AnalysisPage() {
  const params = useParams();
  const { history } = useHistory();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (params.id && history.length > 0) {
      const foundItem = history.find(item => item.id === params.id);
      if (foundItem) {
        // Simulate streaming/loading effect
        setTimeout(() => {
          setAnalysisResult(foundItem.result);
          setIsLoading(false);
        }, 1000); 
      } else {
        setIsLoading(false);
      }
    } else if (params.id) {
       // If we landed here directly or history is empty
       // We'll show loading for a moment then not found.
       setTimeout(() => setIsLoading(false), 1000);
    }
  }, [params.id, history]);

  useEffect(() => {
    // Scroll to bottom when new content is added
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [analysisResult, isLoading]);

  return (
    <div
      ref={scrollContainerRef}
      className="h-[calc(100vh-3rem)] overflow-y-auto"
    >
      <div className="container mx-auto py-8 px-4 md:px-6">
        <div className="flex flex-col gap-8">
          {isLoading ? (
            <AnalysisLoading />
          ) : analysisResult ? (
            <AnalysisResults result={analysisResult} isLoadingRelatedJobs={false} />
          ) : (
            <Card>
              <CardContent className="flex h-[calc(100vh-10rem)] flex-col items-center justify-center text-center p-8 gap-4">
                <Frown className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-xl font-semibold">Analysis Not Found</h3>
                <p className="text-muted-foreground max-w-sm">
                  The analysis you are looking for does not exist or has expired. Please go back to the main page to start a new analysis.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
