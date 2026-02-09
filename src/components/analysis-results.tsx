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
  const circumference = 2 * Math.PI * 56; // r=56
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative size-40 animate-in fade-in zoom-in duration-700">
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
          className={cn('transform -rotate-90 origin-center transition-all duration-1000 ease-out', 'stroke-primary')}
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

function RelatedJobsLoadingSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(2)].map((_, index) => (
                <Card key={index} className="flex flex-col">
                    <CardHeader>
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <Skeleton className="h-4 w-1/3" />
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-9 w-full" />
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}

export default function AnalysisResults({ result, isLoadingRelatedJobs }: { result: AnalysisResult, isLoadingRelatedJobs?: boolean }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const priorityStyles: { [key: string]: string } = {
    Critical: 'border-destructive/50 bg-destructive/5',
    High: 'border-primary/20 bg-primary/5',
    Medium: 'border-secondary-foreground/20 bg-secondary/20',
    Low: 'border-muted-foreground/20 bg-muted/20',
  }

  return (
    <TooltipProvider>
    <div className={cn("max-w-3xl mx-auto space-y-8 transition-all duration-500", isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
      <Card className="overflow-hidden border-border shadow-md">
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
        <CardContent className="p-6 space-y-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Shortlisting Probability</h3>
            <ProbabilityScore score={result.shortlist_probability} />
          </div>

          <div className="relative bg-muted/30 p-5 rounded-2xl border border-border">
            <MessageSquare className="absolute -top-3 -left-3 h-6 w-6 text-primary bg-background rounded-full p-1 border border-border" />
            <h4 className="font-semibold flex items-center gap-2 text-foreground mb-2">
              <Lightbulb className="h-4 w-4 text-yellow-500"/>
              ATS Reasoning
            </h4>
            <p className="text-muted-foreground text-sm leading-relaxed">{result.reasoning}</p>
          </div>

          <Separator className="bg-border/50" />
          
          <div className="space-y-6">
            <h4 className="font-bold text-lg text-foreground">Skills Intelligence</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h5 className="flex items-center gap-2 text-sm font-semibold text-primary"><CheckCircle2 className="h-4 w-4"/>Matched Skills</h5>
                <div className="flex flex-wrap gap-2">
                  {result.matched_skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="bg-primary/5 text-primary border-primary/10 hover:bg-primary/10 transition-colors">
                      {skill}
                    </Badge>
                  ))}
                  {result.matched_skills.length === 0 && <p className="text-sm text-muted-foreground italic">No specific skills matched in our semantic analysis.</p>}
                </div>
              </div>
              <div className="space-y-4">
                <h5 className="flex items-center gap-2 text-sm font-semibold text-destructive"><XCircle className="h-4 w-4"/>Missing Skills</h5>
                <div className="flex flex-wrap gap-2">
                  {result.missing_skills.map((skill) => (
                    <Badge key={skill} variant="destructive" className="bg-destructive/5 text-destructive border-destructive/10 hover:bg-destructive/10 transition-colors">
                      {skill}
                    </Badge>
                  ))}
                  {result.missing_skills.length === 0 && <p className="text-sm text-muted-foreground italic">No critical skill gaps identified. Exceptional fit!</p>}
                </div>
              </div>
            </div>
          </div>
          
          {result.learning_path && result.learning_path.length > 0 && (
            <>
              <Separator className="bg-border/50" />
              <div className="space-y-6">
                <h4 className="font-bold text-lg text-foreground">Personalized Learning Path</h4>
                <div className="grid gap-4">
                  {result.learning_path.map((item, index) => (
                    <div key={index} className={cn('p-4 rounded-xl border-l-4 border-y border-r transition-all hover:shadow-sm', priorityStyles[item.priority] || 'border-border')}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <p className="font-bold text-foreground">{item.skill}</p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 bg-background px-2 py-0.5 rounded-full border border-border"><Target className="h-3 w-3" />{item.priority} Priority</span>
                            <span className="flex items-center gap-1 bg-background px-2 py-0.5 rounded-full border border-border"><Clock className="h-3 w-3" />{item.estimated_time}</span>
                          </div>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-destructive/10" asChild>
                              <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(item.youtube_query)}`} target="_blank" rel="noopener noreferrer">
                                <Youtube className="h-5 w-5 text-destructive" />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Search Course on YouTube</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {(result.related_jobs || isLoadingRelatedJobs) && (
              <>
              <Separator className="bg-border/50" />
              <div className="space-y-6">
                  <h4 className="font-bold text-lg text-foreground">Related Opportunities</h4>
                  {isLoadingRelatedJobs ? (
                      <RelatedJobsLoadingSkeleton />
                  ) : (
                      result.related_jobs && result.related_jobs.length > 0 &&
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {result.related_jobs.map((job, index) => (
                              <Card key={index} className="flex flex-col border-border hover:border-primary/50 transition-colors bg-card">
                              <CardHeader className="p-4 space-y-1">
                                  <CardTitle className="text-sm font-bold leading-tight">{job.job_title}</CardTitle>
                                  <CardDescription className="flex items-center gap-1 text-[10px] uppercase font-semibold">
                                  <Briefcase className="size-3" />
                                  {job.company}
                                  </CardDescription>
                              </CardHeader>
                              <CardContent className="p-4 pt-0 flex-grow">
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="size-3" />
                                  {job.location}
                                  </div>
                              </CardContent>
                              <CardFooter className="p-4 pt-0">
                                  <Button asChild variant="outline" size="sm" className="w-full text-xs border-border hover:bg-primary hover:text-white transition-colors">
                                  <a href={job.job_link} target="_blank" rel="noopener noreferrer">
                                      View Details
                                      <ArrowUpRight className="ml-1 size-3" />
                                  </a>
                                  </Button>
                              </CardFooter>
                              </Card>
                          ))}
                      </div>
                  )}
              </div>
              </>
          )}

        </CardContent>
        <CardFooter className="bg-secondary/10 p-6 border-t border-border">
          <Button asChild className="w-full py-6 text-lg font-bold shadow-lg shadow-primary/20">
              <a href={result.job_link} target="_blank" rel="noopener noreferrer">
                  Apply for this Role <ArrowUpRight className="ml-2 h-5 w-5" />
              </a>
          </Button>
        </CardFooter>
      </Card>
      <div className="text-center pb-12">
          <p className="text-xs text-muted-foreground">Powered by Nexus Intelligence Engine • End of Analysis</p>
      </div>
    </div>
    </TooltipProvider>
  );
}
