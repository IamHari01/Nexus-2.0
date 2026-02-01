'use client';

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
  Youtube
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
    <div className="relative size-40">
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
  
  const priorityStyles: { [key: string]: string } = {
    Critical: 'border-destructive/50 bg-destructive/5',
    High: 'border-primary/20 bg-primary/5',
    Medium: 'border-secondary-foreground/20 bg-secondary/20',
    Low: 'border-muted-foreground/20 bg-muted/20',
  }

  return (
    <TooltipProvider>
    <Card className="overflow-hidden">
      <CardHeader className="bg-secondary/30">
        <div className="flex items-start justify-between gap-4">
            <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{result.company}</span>
                </div>
                <CardTitle className="text-2xl font-bold text-primary">{result.job_title}</CardTitle>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{result.location}</span>
                </div>
            </div>
            <MatchBadge status={result.match_status} />
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <h3 className="text-lg font-medium text-muted-foreground">Shortlisting Probability</h3>
          <ProbabilityScore score={result.shortlist_probability} />
        </div>

        <div className="text-center bg-muted p-4 rounded-lg">
          <h4 className="font-semibold flex items-center justify-center gap-2"><Lightbulb className="h-5 w-5 text-accent"/>ATS Reasoning</h4>
          <p className="text-muted-foreground text-sm mt-1">{result.reasoning}</p>
        </div>

        <Separator />
        
        <div>
          <h4 className="font-semibold mb-4 text-lg">Skills Analysis</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h5 className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-5 w-5 text-primary"/>Matched Skills</h5>
              <div className="flex flex-wrap gap-2">
                {result.matched_skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
                {result.matched_skills.length === 0 && <p className="text-sm text-muted-foreground">No skills matched.</p>}
              </div>
            </div>
            <div className="space-y-3">
              <h5 className="flex items-center gap-2 font-medium"><XCircle className="h-5 w-5 text-destructive"/>Missing Skills</h5>
              <div className="flex flex-wrap gap-2">
                {result.missing_skills.map((skill) => (
                  <Badge key={skill} variant="destructive">
                    {skill}
                  </Badge>
                ))}
                {result.missing_skills.length === 0 && <p className="text-sm text-muted-foreground">No skill gaps identified. Great fit!</p>}
              </div>
            </div>
          </div>
        </div>
        
        {result.learning_path && result.learning_path.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold mb-4 text-lg">Personalized Learning Path</h4>
              <div className="space-y-4">
                {result.learning_path.map((item, index) => (
                  <Card key={index} className={cn('border-l-4', priorityStyles[item.priority] || 'border-muted')}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-primary">{item.skill}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1"><Target className="h-3 w-3" />{item.priority} Priority</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{item.estimated_time}</span>
                          </div>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" asChild>
                              <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(item.youtube_query)}`} target="_blank" rel="noopener noreferrer">
                                <Youtube className="h-5 w-5 text-destructive" />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Search on YouTube</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}

        {(result.related_jobs || isLoadingRelatedJobs) && (
            <>
            <Separator />
            <div className="space-y-4">
                <h4 className="font-semibold text-lg">Related Opportunities</h4>
                {isLoadingRelatedJobs ? (
                    <RelatedJobsLoadingSkeleton />
                ) : (
                    result.related_jobs && result.related_jobs.length > 0 &&
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {result.related_jobs.map((job, index) => (
                            <Card key={index} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">{job.job_title}</CardTitle>
                                <CardDescription className="flex items-center gap-1 text-xs">
                                <Briefcase className="size-3" />
                                {job.company}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="size-3" />
                                {job.location}
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button asChild variant="outline" size="sm" className="w-full">
                                <a href={job.job_link} target="_blank" rel="noopener noreferrer">
                                    View
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
      <CardFooter>
        <Button asChild className="w-full">
            <a href={result.job_link} target="_blank" rel="noopener noreferrer">
                Apply Now <ArrowUpRight className="ml-2 h-4 w-4" />
            </a>
        </Button>
      </CardFooter>
    </Card>
    </TooltipProvider>
  );
}
