'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Briefcase,
  MapPin,
  Target,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ArrowUpRight,
  Clock,
  Youtube,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from './ui/skeleton';
import type { AnalysisResult } from '@/lib/types';

function ProbabilityScore({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 56;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative size-40 animate-in fade-in zoom-in duration-1000">
      <svg className="size-full" viewBox="0 0 120 120">
        <circle
          className="stroke-muted"
          strokeWidth="8"
          fill="transparent"
          r="56"
          cx="60"
          cy="60"
        />
        <circle
          className={cn('transform -rotate-90 origin-center transition-all duration-1500 ease-out', 'stroke-primary')}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          r="56"
          cx="60"
          cy="60"
        />
      </svg>
      <div className={cn("absolute inset-0 flex items-center justify-center font-bold", 'text-primary')}>
        <span className="text-4xl">{score}</span>
        <span className="text-lg">%</span>
      </div>
    </div>
  );
}

function MatchBadge({ status }: { status: 'High' | 'Medium' | 'Low' }) {
    const statusStyles = {
        High: 'bg-primary/10 text-primary border-primary/20',
        Medium: 'bg-secondary text-secondary-foreground border-border',
        Low: 'bg-destructive/10 text-destructive border-destructive/20',
    };
    return <Badge className={cn('text-sm border', statusStyles[status])}>{status} Match</Badge>
}

export default function AnalysisResults({ result, isLoadingRelatedJobs }: { result: AnalysisResult, isLoadingRelatedJobs?: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Simulate chatbot-like staggered reveal
    const timers = [
      setTimeout(() => setStep(1), 400),   // Show Header & Score
      setTimeout(() => setStep(2), 1200),  // Show Reasoning
      setTimeout(() => setStep(3), 2000),  // Show Skills
      setTimeout(() => setStep(4), 2800),  // Show Learning Path
      setTimeout(() => setStep(5), 3600),  // Show Related Jobs
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const priorityStyles: { [key: string]: string } = {
    Critical: 'border-destructive/50 bg-destructive/5',
    High: 'border-primary/20 bg-primary/5',
    Medium: 'border-secondary-foreground/20 bg-secondary/20',
    Low: 'border-muted-foreground/20 bg-muted/20',
  }

  return (
    <TooltipProvider>
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      {/* Header & Score */}
      <Card className={cn("overflow-hidden border-border shadow-md transition-all duration-700", step >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
        <CardHeader className="bg-secondary/10 border-b border-border">
          <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <Briefcase className="h-3 w-3" />
                      <span>{result.company}</span>
                  </div>
                  <CardTitle className="text-2xl font-bold text-foreground">{result.job_title}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{result.location}</span>
                  </div>
              </div>
              <MatchBadge status={result.match_status} />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Shortlisting Probability</h3>
            <ProbabilityScore score={result.shortlist_probability} />
          </div>
        </CardContent>
      </Card>

      {/* ATS Reasoning */}
      <div className={cn("relative bg-muted/30 p-6 rounded-2xl border border-border transition-all duration-700", step >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
        <MessageSquare className="absolute -top-3 -left-3 h-6 w-6 text-primary bg-background rounded-full p-1 border border-border" />
        <h4 className="font-semibold flex items-center gap-2 text-foreground mb-3">
          <Lightbulb className="h-4 w-4 text-yellow-500"/>
          ATS Reasoning
        </h4>
        <p className="text-muted-foreground text-sm leading-relaxed">{result.reasoning}</p>
      </div>

      {/* Skills Intelligence */}
      <Card className={cn("border-border shadow-sm transition-all duration-700", step >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
        <CardContent className="p-6 space-y-6">
          <h4 className="font-bold text-lg text-foreground">Skills Intelligence</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h5 className="flex items-center gap-2 text-sm font-semibold text-primary"><CheckCircle2 className="h-4 w-4"/>Matched Skills</h5>
              <div className="flex flex-wrap gap-2">
                {result.matched_skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h5 className="flex items-center gap-2 text-sm font-semibold text-destructive"><XCircle className="h-4 w-4"/>Missing Skills</h5>
              <div className="flex flex-wrap gap-2">
                {result.missing_skills.map((skill) => (
                  <Badge key={skill} variant="destructive" className="bg-destructive/5 text-destructive border-destructive/10">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Path */}
      {result.learning_path && result.learning_path.length > 0 && (
        <Card className={cn("border-border shadow-sm transition-all duration-700", step >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
          <CardContent className="p-6 space-y-6">
            <h4 className="font-bold text-lg text-foreground">Personalized Learning Path</h4>
            <div className="grid gap-4">
              {result.learning_path.map((item, index) => (
                <div key={index} className={cn('p-4 rounded-xl border-l-4 border-y border-r transition-all', priorityStyles[item.priority] || 'border-border')}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <p className="font-bold text-foreground">{item.skill}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 bg-background px-2 py-0.5 rounded-full border border-border"><Target className="h-3 w-3" />{item.priority}</span>
                        <span className="flex items-center gap-1 bg-background px-2 py-0.5 rounded-full border border-border"><Clock className="h-3 w-3" />{item.estimated_time}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-destructive/10" asChild>
                      <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(item.youtube_query)}`} target="_blank" rel="noopener noreferrer">
                        <Youtube className="h-5 w-5 text-destructive" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related Opportunities */}
      <Card className={cn("border-border shadow-sm transition-all duration-700", step >= 5 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
        <CardContent className="p-6 space-y-6">
          <h4 className="font-bold text-lg text-foreground">Related Opportunities</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.related_jobs?.map((job, index) => (
              <Card key={index} className="flex flex-col border-border hover:border-primary/50 transition-colors">
                <CardHeader className="p-4 space-y-1">
                  <CardTitle className="text-sm font-bold">{job.job_title}</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-semibold">{job.company}</CardDescription>
                </CardHeader>
                <CardFooter className="p-4 pt-0">
                  <Button asChild variant="outline" size="sm" className="w-full text-xs">
                    <a href={job.job_link} target="_blank" rel="noopener noreferrer">View Job</a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          <Button asChild className="w-full py-6 text-lg font-bold mt-4 shadow-lg shadow-primary/20">
            <a href={result.job_link} target="_blank" rel="noopener noreferrer">
              Apply for Original Role <ArrowUpRight className="ml-2 h-5 w-5" />
            </a>
          </Button>
        </CardContent>
      </Card>

      <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">Powered by Nexus Intelligence Engine • End of Analysis</p>
      </div>
    </div>
    </TooltipProvider>
  );
}
